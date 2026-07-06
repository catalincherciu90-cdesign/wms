// Rute stoc: vizualizare, mișcări, recepție (inbound), expediere (outbound), ajustare, transfer
import { json, error, csv, readJson } from '../lib/http.js';

// Stoc curent, agregat + detaliat pe locație
export async function stock(request, env) {
  const url = new URL(request.url);
  const productId = url.searchParams.get('product_id');
  let sql = `
    SELECT i.id, i.quantity, i.updated_at,
           p.id AS product_id, p.sku, p.name AS product_name, p.reorder_point, p.unit,
           l.id AS location_id, l.code AS location_code
    FROM inventory i
    JOIN products p  ON p.id = i.product_id
    JOIN locations l ON l.id = i.location_id
    WHERE i.quantity <> 0`;
  const binds = [];
  if (productId) { sql += ' AND p.id = ?'; binds.push(Number(productId)); }
  sql += ' ORDER BY p.name, l.code';
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ stock: results });
}

// Stoc total per produs (pentru dashboard / listă)
export async function summary(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT p.id AS product_id, p.sku, p.name, p.unit, p.reorder_point,
           COALESCE(SUM(i.quantity), 0) AS total,
           CASE WHEN COALESCE(SUM(i.quantity),0) <= p.reorder_point THEN 1 ELSE 0 END AS low
    FROM products p
    LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.active = 1
    GROUP BY p.id
    ORDER BY p.name`).all();
  return json({ summary: results });
}

export async function movements(request, env) {
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 100, 500);
  const { results } = await env.DB.prepare(`
    SELECT m.*, p.sku, p.name AS product_name, l.code AS location_code, u.name AS user_name
    FROM stock_movements m
    JOIN products p  ON p.id = m.product_id
    JOIN locations l ON l.id = m.location_id
    LEFT JOIN users u ON u.id = m.user_id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT ?`).bind(limit).all();
  return json({ movements: results });
}

// Helper intern: aplică o mișcare (delta poate fi + sau −), cu verificare de stoc
async function applyMovement(env, { product_id, location_id, delta, type, reference, note, user_id }) {
  const cur = await env.DB.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND location_id = ?')
    .bind(product_id, location_id).first();
  const current = cur?.quantity || 0;
  if (delta < 0 && current + delta < 0) {
    throw new Error(`Stoc insuficient în locație (disponibil: ${current})`);
  }
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO inventory (product_id, location_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(product_id, location_id)
      DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now')`)
      .bind(product_id, location_id, delta),
    env.DB.prepare(`
      INSERT INTO stock_movements (product_id, location_id, type, quantity, reference, note, user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .bind(product_id, location_id, type, delta, reference || null, note || null, user_id || null),
  ]);
}

export async function receive(request, env, ctx, user) {
  const b = await readJson(request);
  const qty = Number(b?.quantity);
  if (!b?.product_id || !b?.location_id || !(qty > 0)) return error('product_id, location_id și cantitate > 0 obligatorii', 400);
  try {
    await applyMovement(env, {
      product_id: Number(b.product_id), location_id: Number(b.location_id),
      delta: qty, type: 'inbound', reference: b.reference, note: b.note, user_id: user.sub,
    });
    return json({ ok: true });
  } catch (e) { return error(String(e.message || e), 400); }
}

export async function ship(request, env, ctx, user) {
  const b = await readJson(request);
  const qty = Number(b?.quantity);
  if (!b?.product_id || !b?.location_id || !(qty > 0)) return error('product_id, location_id și cantitate > 0 obligatorii', 400);
  try {
    await applyMovement(env, {
      product_id: Number(b.product_id), location_id: Number(b.location_id),
      delta: -qty, type: 'outbound', reference: b.reference, note: b.note, user_id: user.sub,
    });
    return json({ ok: true });
  } catch (e) { return error(String(e.message || e), 400); }
}

export async function adjust(request, env, ctx, user) {
  const b = await readJson(request);
  const delta = Number(b?.delta);
  if (!b?.product_id || !b?.location_id || !Number.isFinite(delta) || delta === 0) {
    return error('product_id, location_id și delta (≠0) obligatorii', 400);
  }
  try {
    await applyMovement(env, {
      product_id: Number(b.product_id), location_id: Number(b.location_id),
      delta, type: 'adjust', reference: b.reference, note: b.note || 'ajustare manuală', user_id: user.sub,
    });
    return json({ ok: true });
  } catch (e) { return error(String(e.message || e), 400); }
}

export async function transfer(request, env, ctx, user) {
  const b = await readJson(request);
  const qty = Number(b?.quantity);
  if (!b?.product_id || !b?.from_location_id || !b?.to_location_id || !(qty > 0)) {
    return error('product_id, from_location_id, to_location_id și cantitate > 0 obligatorii', 400);
  }
  if (b.from_location_id === b.to_location_id) return error('Locațiile trebuie să difere', 400);
  try {
    await applyMovement(env, {
      product_id: Number(b.product_id), location_id: Number(b.from_location_id),
      delta: -qty, type: 'transfer', reference: b.reference, note: `transfer către loc #${b.to_location_id}`, user_id: user.sub,
    });
    await applyMovement(env, {
      product_id: Number(b.product_id), location_id: Number(b.to_location_id),
      delta: qty, type: 'transfer', reference: b.reference, note: `transfer din loc #${b.from_location_id}`, user_id: user.sub,
    });
    return json({ ok: true });
  } catch (e) { return error(String(e.message || e), 400); }
}

export async function exportStockCsv(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT p.sku, p.name, l.code AS location, i.quantity, i.updated_at
    FROM inventory i JOIN products p ON p.id = i.product_id JOIN locations l ON l.id = i.location_id
    WHERE i.quantity <> 0 ORDER BY p.name, l.code`).all();
  const rows = [['sku', 'produs', 'locatie', 'cantitate', 'actualizat']];
  for (const r of results) rows.push([r.sku, r.name, r.location, r.quantity, r.updated_at]);
  return csv(rows, 'stoc.csv');
}
