// Rute comenzi: inbound (de la furnizori) & outbound (către clienți)
// La finalizare, comanda generează automat mișcări de stoc (receiving / picking).
import { json, error, readJson } from '../lib/http.js';
import { internalEan } from './products.js';

// Un „lock" pe comandă expiră după atâtea secunde fără heartbeat (dispozitiv închis/căzut).
const LOCK_TTL = 300;
const LOCK_ACTIVE = "CASE WHEN o.locked_by IS NOT NULL AND o.locked_at > datetime('now','-" + LOCK_TTL + " seconds') THEN 1 ELSE 0 END AS lock_active";

export async function list(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  let sql = `
    SELECT o.*, p.name AS partner_name, c.name AS client_name, ${LOCK_ACTIVE},
           (SELECT COUNT(*) FROM order_lines WHERE order_id = o.id) AS line_count,
           (SELECT COALESCE(SUM(quantity),0) FROM order_lines WHERE order_id = o.id) AS total_qty
    FROM orders o LEFT JOIN partners p ON p.id = o.partner_id LEFT JOIN clients c ON c.id = o.client_id WHERE 1=1`;
  const binds = [];
  if (type === 'inbound' || type === 'outbound') { sql += ' AND o.type = ?'; binds.push(type); }
  if (status) { sql += ' AND o.status = ?'; binds.push(status); }
  sql += ' ORDER BY o.created_at DESC, o.id DESC';
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ orders: results });
}

export async function get(request, env, ctx, user, params) {
  const id = Number(params.id);
  const order = await env.DB.prepare(`
    SELECT o.*, p.name AS partner_name, c.name AS client_name, ${LOCK_ACTIVE} FROM orders o
    LEFT JOIN partners p ON p.id = o.partner_id LEFT JOIN clients c ON c.id = o.client_id WHERE o.id = ?`).bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  const { results: lines } = await env.DB.prepare(`
    SELECT ol.*, pr.sku, pr.name AS product_name, pr.unit
    FROM order_lines ol JOIN products pr ON pr.id = ol.product_id
    WHERE ol.order_id = ? ORDER BY ol.id`).bind(id).all();
  // produse noi anunțate (nu sunt încă produse reale) — se definesc la recepție
  let new_items = [];
  try {
    const r = await env.DB.prepare('SELECT id, name, barcode, quantity FROM order_new_items WHERE order_id = ? ORDER BY id').bind(id).all();
    new_items = r.results || [];
  } catch (e) {}
  return json({ order, lines, new_items });
}

// Recepție: transformă un produs „anunțat" într-un produs real (cu EAN) și îl
// adaugă ca linie pe comandă. Codul: cel dat, altfel EAN intern generat acum.
export async function materializeNewItem(request, env, ctx, user, params) {
  const id = Number(params.id);
  const itemId = Number(params.itemId);
  const b = await readJson(request).catch(() => ({}));
  const order = await env.DB.prepare('SELECT id, client_id FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  const it = await env.DB.prepare('SELECT * FROM order_new_items WHERE id = ? AND order_id = ?').bind(itemId, id).first();
  if (!it) return error('Produs anunțat inexistent', 404);
  const bcIn = (b?.barcode || it.barcode || '').toString().trim();

  // creează produsul (SKU temporar, apoi cod final din id)
  const tmp = 'TMP-' + Math.random().toString(36).slice(2, 10).toUpperCase();
  const res = await env.DB.prepare(
    'INSERT INTO products (sku, barcode, name, unit, client_id, active) VALUES (?, ?, ?, ?, ?, 1)'
  ).bind(tmp, bcIn || null, it.name, 'buc', order.client_id || null).run();
  const pid = res.meta.last_row_id;
  const barcode = bcIn || internalEan(pid);
  try { await env.DB.prepare('UPDATE products SET barcode=?, sku=? WHERE id=?').bind(barcode, barcode, pid).run(); }
  catch (e) {
    await env.DB.prepare('DELETE FROM products WHERE id=?').bind(pid).run();
    if (String(e).includes('UNIQUE')) return error('EAN sau SKU deja existent', 409);
    throw e;
  }
  // adaugă linia și șterge „anunțul"
  await env.DB.prepare('INSERT INTO order_lines (order_id, product_id, quantity) VALUES (?, ?, ?)').bind(id, pid, it.quantity).run();
  await env.DB.prepare('DELETE FROM order_new_items WHERE id = ?').bind(itemId).run();
  const product = await env.DB.prepare('SELECT id, sku, barcode, name FROM products WHERE id = ?').bind(pid).first();
  return json({ ok: true, product });
}

export async function create(request, env, ctx, user) {
  const b = await readJson(request);
  if (!['inbound', 'outbound'].includes(b?.type)) return error('type (inbound/outbound) obligatoriu', 400);
  if (!Array.isArray(b.lines) || b.lines.length === 0) return error('Cel puțin o linie de comandă', 400);
  for (const l of b.lines) {
    if (!l.product_id || !(Number(l.quantity) > 0)) return error('Fiecare linie are product_id și cantitate > 0', 400);
  }

  const prefix = b.type === 'inbound' ? 'IN' : 'OUT';
  const res = await env.DB.prepare(
    'INSERT INTO orders (code, type, partner_id, status, note, user_id) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind('TMP', b.type, b.partner_id || null, 'draft', b.note || null, user.sub).run();
  const id = res.meta.last_row_id;
  const code = prefix + '-' + String(id).padStart(5, '0');
  await env.DB.prepare('UPDATE orders SET code = ? WHERE id = ?').bind(code, id).run();

  await env.DB.batch(b.lines.map((l) =>
    env.DB.prepare('INSERT INTO order_lines (order_id, product_id, quantity) VALUES (?, ?, ?)')
      .bind(id, Number(l.product_id), Number(l.quantity))
  ));
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return json({ order }, 201);
}

export async function setStatus(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  if (!['draft', 'confirmed', 'cancelled'].includes(b?.status)) return error('Status invalid (draft/confirmed/cancelled)', 400);
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  if (order.status === 'completed') return error('Comanda e deja finalizată', 400);
  await env.DB.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(b.status, id).run();
  if (b.status === 'cancelled') await releaseLock(env, id); // anularea eliberează procesarea
  return json({ ok: true, status: b.status });
}

// ---- Blocare comandă „în procesare" (lock cu heartbeat) ----
async function releaseLock(env, id) {
  await env.DB.prepare('UPDATE orders SET locked_by = NULL, locked_name = NULL, locked_at = NULL WHERE id = ?').bind(id).run();
}

// Preia (sau reînnoiește) procesarea comenzii. Dacă altcineva o procesează activ → 409.
export async function lock(request, env, ctx, user, params) {
  const id = Number(params.id);
  const order = await env.DB.prepare('SELECT status, locked_by, locked_name, locked_at FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  if (order.status === 'completed') return error('Comanda e deja finalizată', 400);
  if (order.status === 'cancelled') return error('Comanda e anulată', 400);
  const held = await env.DB.prepare(
    "SELECT 1 FROM orders WHERE id = ? AND locked_by IS NOT NULL AND locked_by <> ? AND locked_at > datetime('now','-" + LOCK_TTL + " seconds')"
  ).bind(id, user.sub).first();
  if (held) {
    return json({ ok: false, locked: true, locked_by: order.locked_by, locked_name: order.locked_name,
      error: 'Comanda este procesată de ' + (order.locked_name || 'alt utilizator') }, 409);
  }
  await env.DB.prepare("UPDATE orders SET locked_by = ?, locked_name = ?, locked_at = datetime('now') WHERE id = ?")
    .bind(user.sub, user.name || ('#' + user.sub), id).run();
  return json({ ok: true, locked_by: user.sub, locked_name: user.name || ('#' + user.sub) });
}

// Eliberează procesarea (deținătorul sau un admin).
export async function unlock(request, env, ctx, user, params) {
  const id = Number(params.id);
  const order = await env.DB.prepare('SELECT locked_by FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  if (order.locked_by && order.locked_by !== user.sub && user.role !== 'admin') {
    return error('Comanda e blocată de alt utilizator', 403);
  }
  await releaseLock(env, id);
  return json({ ok: true });
}

// Finalizează comanda: aplică mișcările de stoc într-o locație aleasă.
// inbound => intrare (+, stocul crește imediat).
// outbound => „stoc tampon": marfa se PREGĂTEȘTE (se rezervă) în locație, dar
//   stocul fizic NU scade până nu pleacă efectiv din depozit. Comanda devine
//   „prepared"; scăderea propriu-zisă se face din depart() („Marfa a plecat").
export async function complete(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const locationId = Number(b?.location_id);
  if (!locationId) return error('location_id obligatoriu', 400);

  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  if (order.status === 'completed') return error('Comanda e deja finalizată', 400);
  if (order.status === 'cancelled') return error('Comanda e anulată', 400);
  // respectă lock-ul: doar cel care procesează (sau lock liber/învechit) o poate finaliza
  if (order.locked_by && order.locked_by !== user.sub && user.role !== 'admin') {
    const held = await env.DB.prepare(
      "SELECT locked_name FROM orders WHERE id = ? AND locked_at > datetime('now','-" + LOCK_TTL + " seconds')"
    ).bind(id).first();
    if (held) return error('Comanda este procesată de ' + (held.locked_name || 'alt utilizator'), 409);
  }

  const { results: lines } = await env.DB.prepare('SELECT * FROM order_lines WHERE order_id = ?').bind(id).all();
  if (!lines.length) return error('Comanda nu are linii', 400);

  // --- OUTBOUND: pregătire (stoc tampon) — verifică disponibilul, dar NU scade ---
  if (order.type !== 'inbound') {
    for (const l of lines) {
      const inv = await env.DB.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND location_id = ?')
        .bind(l.product_id, locationId).first();
      const avail = inv?.quantity || 0;
      if (avail < l.quantity) {
        const pr = await env.DB.prepare('SELECT sku FROM products WHERE id = ?').bind(l.product_id).first();
        return error('Stoc insuficient pentru ' + (pr?.sku || ('#' + l.product_id)) + ' (disponibil: ' + avail + ', necesar: ' + l.quantity + ')', 400);
      }
    }
    const stmts = lines.map((l) => env.DB.prepare('UPDATE order_lines SET qty_done = quantity WHERE id = ?').bind(l.id));
    stmts.push(env.DB.prepare("UPDATE orders SET status = 'prepared', prepared_location_id = ?, locked_by = NULL, locked_name = NULL, locked_at = NULL WHERE id = ?").bind(locationId, id));
    await env.DB.batch(stmts);
    return json({ ok: true, status: 'prepared' });
  }

  // --- INBOUND: intrare imediată în stoc ---
  const stmts = [];
  for (const l of lines) {
    const delta = l.quantity;
    stmts.push(env.DB.prepare(`
      INSERT INTO inventory (product_id, location_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(product_id, location_id)
      DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now')`)
      .bind(l.product_id, locationId, delta));
    stmts.push(env.DB.prepare(`
      INSERT INTO stock_movements (product_id, location_id, type, quantity, reference, note, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(l.product_id, locationId, order.type, delta, order.code, 'comandă ' + order.code, user.sub));
    stmts.push(env.DB.prepare('UPDATE order_lines SET qty_done = quantity WHERE id = ?').bind(l.id));
  }
  stmts.push(env.DB.prepare("UPDATE orders SET status = 'completed', completed_at = datetime('now'), locked_by = NULL, locked_name = NULL, locked_at = NULL WHERE id = ?").bind(id));
  await env.DB.batch(stmts);

  return json({ ok: true, status: 'completed' });
}

// „Marfa a plecat": scade efectiv stocul unei comenzi de ieșire pregătite.
// Folosește locația unde a fost pregătită; re-verifică disponibilul înainte de scădere.
export async function depart(request, env, ctx, user, params) {
  const id = Number(params.id);
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  if (order.type === 'inbound') return error('Doar comenzile de ieșire pot pleca din depozit', 400);
  if (order.status === 'cancelled') return error('Comanda e anulată', 400);
  if (order.status === 'completed') return error('Comanda a plecat deja', 400);
  if (order.status !== 'prepared') return error('Comanda trebuie pregătită mai întâi (picking)', 400);
  const locationId = Number(order.prepared_location_id);
  if (!locationId) return error('Comanda nu are locație de pregătire', 400);

  const { results: lines } = await env.DB.prepare('SELECT * FROM order_lines WHERE order_id = ?').bind(id).all();
  if (!lines.length) return error('Comanda nu are linii', 400);

  // re-verifică stocul (poate s-a schimbat între pregătire și plecare)
  for (const l of lines) {
    const inv = await env.DB.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND location_id = ?')
      .bind(l.product_id, locationId).first();
    const avail = inv?.quantity || 0;
    if (avail < l.quantity) {
      const pr = await env.DB.prepare('SELECT sku FROM products WHERE id = ?').bind(l.product_id).first();
      return error('Stoc insuficient pentru ' + (pr?.sku || ('#' + l.product_id)) + ' (disponibil: ' + avail + ', necesar: ' + l.quantity + ')', 400);
    }
  }

  const stmts = [];
  for (const l of lines) {
    const delta = -l.quantity;
    stmts.push(env.DB.prepare(`
      INSERT INTO inventory (product_id, location_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(product_id, location_id)
      DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now')`)
      .bind(l.product_id, locationId, delta));
    stmts.push(env.DB.prepare(`
      INSERT INTO stock_movements (product_id, location_id, type, quantity, reference, note, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(l.product_id, locationId, order.type, delta, order.code, 'plecare marfă ' + order.code, user.sub));
  }
  stmts.push(env.DB.prepare("UPDATE orders SET status = 'completed', completed_at = datetime('now') WHERE id = ?").bind(id));
  await env.DB.batch(stmts);

  return json({ ok: true, status: 'completed' });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  const order = await env.DB.prepare('SELECT status FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  // Comenzile finalizate pot fi șterse doar de admin (stocul deja mișcat NU se reversează automat).
  if (order.status === 'completed' && user.role !== 'admin') {
    return error('Doar un administrator poate șterge o comandă finalizată', 403);
  }
  try { await env.DB.prepare('DELETE FROM order_new_items WHERE order_id = ?').bind(id).run(); } catch (e) {}
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run(); // liniile cad prin ON DELETE CASCADE
  return json({ ok: true });
}
