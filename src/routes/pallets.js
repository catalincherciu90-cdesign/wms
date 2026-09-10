// Paleți: fiecare palet ocupă un spațiu într-o locație, aparține unui client
// și conține produse (pallet_items). Plasarea verifică capacitatea locației.
import { json, error, readJson } from '../lib/http.js';

export async function list(request, env) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get('client_id');
  const locationId = url.searchParams.get('location_id');
  let sql = `
    SELECT pa.*, c.name AS client_name, l.code AS location_code,
      (SELECT COUNT(*) FROM pallet_items pi WHERE pi.pallet_id = pa.id) AS item_count,
      (SELECT COALESCE(SUM(quantity),0) FROM pallet_items pi WHERE pi.pallet_id = pa.id) AS total_qty
    FROM pallets pa
    LEFT JOIN clients c ON c.id = pa.client_id
    LEFT JOIN locations l ON l.id = pa.location_id
    WHERE pa.status <> 'shipped'`;
  const binds = [];
  if (clientId) { sql += ' AND pa.client_id = ?'; binds.push(Number(clientId)); }
  if (locationId) { sql += ' AND pa.location_id = ?'; binds.push(Number(locationId)); }
  sql += ' ORDER BY pa.code';
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ pallets: results });
}

export async function get(request, env, ctx, user, params) {
  const id = Number(params.id);
  const pallet = await env.DB.prepare(`
    SELECT pa.*, c.name AS client_name, l.code AS location_code,
      (SELECT COUNT(*) FROM aviz_files af WHERE af.pallet_id = pa.id) AS has_aviz
    FROM pallets pa LEFT JOIN clients c ON c.id = pa.client_id LEFT JOIN locations l ON l.id = pa.location_id
    WHERE pa.id = ?`).bind(id).first();
  if (!pallet) return error('Palet inexistent', 404);
  const { results: items } = await env.DB.prepare(`
    SELECT pi.*, pr.sku, pr.name AS product_name, pr.unit
    FROM pallet_items pi JOIN products pr ON pr.id = pi.product_id
    WHERE pi.pallet_id = ? ORDER BY pi.id`).bind(id).all();
  return json({ pallet, items });
}

// verifică dacă mai e loc într-o locație (capacitate = nr. spații)
async function hasFreeSpace(env, locationId, excludePalletId) {
  if (!locationId) return true;
  const loc = await env.DB.prepare('SELECT capacity FROM locations WHERE id = ?').bind(locationId).first();
  if (!loc || !loc.capacity || loc.capacity <= 0) return true; // capacitate nedefinită = fără limită
  const cnt = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM pallets WHERE location_id = ? AND status = 'stored' AND id <> ?"
  ).bind(locationId, excludePalletId || -1).first();
  return cnt.n < loc.capacity;
}

export async function create(request, env, ctx, user) {
  const b = await readJson(request);
  if (!b?.code) return error('Codul paletului e obligatoriu', 400);
  const locationId = b.location_id ? Number(b.location_id) : null;
  if (locationId && !(await hasFreeSpace(env, locationId, null))) {
    return error('Locația e plină (nu mai sunt spații libere)', 409);
  }
  try {
    const res = await env.DB.prepare(
      "INSERT INTO pallets (code, client_id, location_id, status, notes) VALUES (?, ?, ?, ?, ?)"
    ).bind(b.code.trim(), b.client_id ? Number(b.client_id) : null, locationId, locationId ? 'stored' : 'draft', b.notes || null).run();
    const id = res.meta.last_row_id;
    if (Array.isArray(b.items) && b.items.length) {
      await env.DB.batch(b.items.filter((i) => i.product_id && Number(i.quantity) > 0).map((i) =>
        env.DB.prepare('INSERT INTO pallet_items (pallet_id, product_id, quantity) VALUES (?, ?, ?)')
          .bind(id, Number(i.product_id), Number(i.quantity))
      ));
    }
    const pallet = await env.DB.prepare('SELECT * FROM pallets WHERE id = ?').bind(id).first();
    return json({ pallet }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error('Cod palet deja existent', 409);
    throw e;
  }
}

// Recepție pe palet SAU colet: creează unitatea (cod auto), salvează nr. colete/lot/aviz
// + produsele ȘI încarcă stocul în locație (inbound). Opțional atașează avizul scanat.
export async function receive(request, env, ctx, user) {
  const b = await readJson(request);
  const kind = b.kind === 'colet' ? 'colet' : 'palet';
  const locationId = b.location_id ? Number(b.location_id) : null;
  if (!locationId) return error('Alege locația de recepție', 400);
  const items = Array.isArray(b.items) ? b.items.filter((i) => i.product_id && Number(i.quantity) > 0) : [];
  if (!items.length) return error('Adaugă cel puțin un produs', 400);
  // capacitatea locației e în „spații de palet" — o verificăm doar pentru paleți
  if (kind === 'palet' && !(await hasFreeSpace(env, locationId, null))) return error('Locația e plină (nu mai sunt spații libere)', 409);

  const colete = Number(b.colete) > 0 ? Math.round(Number(b.colete)) : null;
  const lot = (b.lot || '').toString().trim() || null;
  const aviz = (b.aviz || '').toString().trim() || null;
  const receivedAt = (b.received_at || '').toString().trim() || null;
  const clientId = b.client_id ? Number(b.client_id) : null;
  const prefix = kind === 'colet' ? 'COL-' : 'PAL-';

  let code = (b.code || '').toString().trim();
  const tmp = code || ('TMP-' + Math.random().toString(36).slice(2, 10).toUpperCase());
  let id;
  try {
    const res = await env.DB.prepare(
      "INSERT INTO pallets (code, client_id, location_id, status, kind, colete, lot, aviz, received_at, notes) VALUES (?, ?, ?, 'stored', ?, ?, ?, ?, ?, ?)"
    ).bind(tmp, clientId, locationId, kind, colete, lot, aviz, receivedAt, b.notes || null).run();
    id = res.meta.last_row_id;
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error('Cod deja existent', 409);
    throw e;
  }
  if (!code) {
    code = prefix + String(id).padStart(5, '0');
    await env.DB.prepare('UPDATE pallets SET code = ? WHERE id = ?').bind(code, id).run();
  }
  const note = 'recepție ' + kind + ' ' + code
    + (colete ? (' · ' + colete + ' colete') : '') + (lot ? (' · lot ' + lot) : '') + (aviz ? (' · aviz ' + aviz) : '');
  const stmts = [];
  for (const it of items) {
    const pid = Number(it.product_id), q = Number(it.quantity);
    stmts.push(env.DB.prepare('INSERT INTO pallet_items (pallet_id, product_id, quantity) VALUES (?, ?, ?)').bind(id, pid, q));
    stmts.push(env.DB.prepare("INSERT INTO inventory (product_id, location_id, quantity) VALUES (?, ?, ?) ON CONFLICT(product_id, location_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now')").bind(pid, locationId, q));
    stmts.push(env.DB.prepare("INSERT INTO stock_movements (product_id, location_id, type, quantity, reference, note, user_id) VALUES (?, ?, 'inbound', ?, ?, ?, ?)").bind(pid, locationId, q, code, note, user.sub));
  }
  await env.DB.batch(stmts);

  // avizul scanat (opțional): { name, mime, data } — data e un data URL / base64
  if (b.aviz_file && b.aviz_file.data) {
    const f = b.aviz_file;
    if (String(f.data).length > 1400000) return error('Fișierul avizului e prea mare (max ~1MB). Recepția s-a făcut, dar avizul nu s-a atașat.', 413);
    try {
      await env.DB.prepare('INSERT INTO aviz_files (pallet_id, name, mime, data) VALUES (?, ?, ?, ?)')
        .bind(id, (f.name || 'aviz').toString().slice(0, 200), (f.mime || '').toString().slice(0, 100), String(f.data)).run();
    } catch (e) { /* nu blocăm recepția dacă atașamentul eșuează */ }
  }

  const pallet = await env.DB.prepare(
    'SELECT pa.*, c.name AS client_name, l.code AS location_code, (SELECT COUNT(*) FROM aviz_files af WHERE af.pallet_id=pa.id) AS has_aviz FROM pallets pa LEFT JOIN clients c ON c.id=pa.client_id LEFT JOIN locations l ON l.id=pa.location_id WHERE pa.id=?'
  ).bind(id).first();
  const { results: itemsOut } = await env.DB.prepare(
    'SELECT pi.quantity, pr.sku, pr.name AS product_name, pr.unit FROM pallet_items pi JOIN products pr ON pr.id=pi.product_id WHERE pi.pallet_id=?'
  ).bind(id).all();
  return json({ ok: true, pallet, items: itemsOut });
}

// Descarcă avizul scanat atașat unei unități (palet/colet).
export async function avizFile(request, env, ctx, user, params) {
  const id = Number(params.id);
  const f = await env.DB.prepare('SELECT name, mime, data FROM aviz_files WHERE pallet_id = ? ORDER BY id DESC LIMIT 1').bind(id).first();
  if (!f) return error('Niciun aviz atașat', 404);
  const dataUrl = String(f.data);
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const mime = f.mime || (dataUrl.startsWith('data:') ? dataUrl.slice(5, dataUrl.indexOf(';')) : 'application/octet-stream');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Response(bytes, { headers: { 'Content-Type': mime, 'Content-Disposition': 'inline; filename="' + (f.name || 'aviz') + '"' } });
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM pallets WHERE id = ?').bind(id).first();
  if (!existing) return error('Palet inexistent', 404);
  const newLoc = b.location_id !== undefined ? (b.location_id ? Number(b.location_id) : null) : existing.location_id;
  // dacă se mută în altă locație, verifică spațiul
  if (newLoc && newLoc !== existing.location_id && !(await hasFreeSpace(env, newLoc, id))) {
    return error('Locația destinație e plină', 409);
  }
  const status = newLoc ? 'stored' : (b.status || existing.status);
  await env.DB.prepare('UPDATE pallets SET code=?, client_id=?, location_id=?, status=?, notes=? WHERE id=?')
    .bind(
      b.code ? b.code.trim() : existing.code,
      b.client_id !== undefined ? (b.client_id ? Number(b.client_id) : null) : existing.client_id,
      newLoc, status, b.notes !== undefined ? b.notes : existing.notes, id
    ).run();
  const pallet = await env.DB.prepare('SELECT * FROM pallets WHERE id = ?').bind(id).first();
  return json({ pallet });
}

export async function addItem(request, env, ctx, user, params) {
  const b = await readJson(request);
  const palletId = Number(params.id);
  if (!b?.product_id || !(Number(b.quantity) > 0)) return error('product_id și cantitate > 0 obligatorii', 400);
  await env.DB.prepare('INSERT INTO pallet_items (pallet_id, product_id, quantity) VALUES (?, ?, ?)')
    .bind(palletId, Number(b.product_id), Number(b.quantity)).run();
  return json({ ok: true });
}

export async function removeItem(request, env, ctx, user, params) {
  await env.DB.prepare('DELETE FROM pallet_items WHERE id = ? AND pallet_id = ?')
    .bind(Number(params.itemId), Number(params.id)).run();
  return json({ ok: true });
}

export async function remove(request, env, ctx, user, params) {
  await env.DB.prepare('DELETE FROM pallets WHERE id = ?').bind(Number(params.id)).run(); // items cad prin CASCADE
  return json({ ok: true });
}
