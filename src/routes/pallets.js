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
    SELECT pa.*, c.name AS client_name, l.code AS location_code
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
