// Rute comenzi: inbound (de la furnizori) & outbound (către clienți)
// La finalizare, comanda generează automat mișcări de stoc (receiving / picking).
import { json, error, readJson } from '../lib/http.js';

export async function list(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const status = url.searchParams.get('status');
  let sql = `
    SELECT o.*, p.name AS partner_name, c.name AS client_name,
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
    SELECT o.*, p.name AS partner_name, c.name AS client_name FROM orders o
    LEFT JOIN partners p ON p.id = o.partner_id LEFT JOIN clients c ON c.id = o.client_id WHERE o.id = ?`).bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  const { results: lines } = await env.DB.prepare(`
    SELECT ol.*, pr.sku, pr.name AS product_name, pr.unit
    FROM order_lines ol JOIN products pr ON pr.id = ol.product_id
    WHERE ol.order_id = ? ORDER BY ol.id`).bind(id).all();
  return json({ order, lines });
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
  return json({ ok: true, status: b.status });
}

// Finalizează comanda: aplică mișcările de stoc într-o locație aleasă.
// inbound => intrare (+), outbound => ieșire (−, cu verificare de stoc).
export async function complete(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const locationId = Number(b?.location_id);
  if (!locationId) return error('location_id obligatoriu', 400);

  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  if (order.status === 'completed') return error('Comanda e deja finalizată', 400);
  if (order.status === 'cancelled') return error('Comanda e anulată', 400);

  const { results: lines } = await env.DB.prepare('SELECT * FROM order_lines WHERE order_id = ?').bind(id).all();
  if (!lines.length) return error('Comanda nu are linii', 400);

  const sign = order.type === 'inbound' ? 1 : -1;

  // Pentru outbound: verifică stocul disponibil în locație pentru fiecare linie
  if (sign < 0) {
    for (const l of lines) {
      const inv = await env.DB.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND location_id = ?')
        .bind(l.product_id, locationId).first();
      const avail = inv?.quantity || 0;
      if (avail < l.quantity) {
        const pr = await env.DB.prepare('SELECT sku FROM products WHERE id = ?').bind(l.product_id).first();
        return error('Stoc insuficient pentru ' + (pr?.sku || ('#' + l.product_id)) + ' (disponibil: ' + avail + ', necesar: ' + l.quantity + ')', 400);
      }
    }
  }

  const stmts = [];
  for (const l of lines) {
    const delta = sign * l.quantity;
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
  stmts.push(env.DB.prepare("UPDATE orders SET status = 'completed', completed_at = datetime('now') WHERE id = ?").bind(id));
  await env.DB.batch(stmts);

  return json({ ok: true, status: 'completed' });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  const order = await env.DB.prepare('SELECT status FROM orders WHERE id = ?').bind(id).first();
  if (!order) return error('Comandă inexistentă', 404);
  if (order.status === 'completed') return error('Comenzile finalizate nu pot fi șterse', 400);
  await env.DB.prepare('DELETE FROM orders WHERE id = ?').bind(id).run(); // liniile cad prin ON DELETE CASCADE
  return json({ ok: true });
}
