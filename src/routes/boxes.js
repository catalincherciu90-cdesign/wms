// Cutii cu cod de bare propriu (generat de noi) pentru cutiile fără cod de bare.
// Fiecare cutie primește un cod unic CUT-#####; eticheta poartă atât codul cutiei
// cât și codul produsului.
import { json, error, readJson } from '../lib/http.js';

// Generează N cutii pentru un palet + produs. Body: { product_id, count, quantity }.
// quantity = câte bucăți sunt într-o cutie (per_box). Returnează cutiile create,
// cu tot ce trebuie pentru etichetă (cod cutie + cod produs + nume + lot + palet).
export async function create(request, env, ctx, user, params) {
  const palletId = Number(params.id);
  const b = await readJson(request);
  const productId = Number(b?.product_id);
  const count = Math.max(1, Math.min(200, Number(b?.count) || 0)); // max 200 / cerere
  const perBox = Math.max(0, Number(b?.quantity) || 0);
  if (!productId) return error('product_id obligatoriu', 400);
  if (!(Number(b?.count) > 0)) return error('count (nr. etichete) obligatoriu', 400);

  const pallet = await env.DB.prepare('SELECT id, code, lot, client_id FROM pallets WHERE id = ?').bind(palletId).first();
  if (!pallet) return error('Palet inexistent', 404);
  const product = await env.DB.prepare('SELECT id, sku, name, barcode, unit FROM products WHERE id = ?').bind(productId).first();
  if (!product) return error('Produs inexistent', 404);

  const before = await env.DB.prepare('SELECT COALESCE(MAX(id),0) AS m FROM boxes').first();
  const stmts = [];
  for (let i = 0; i < count; i++) {
    stmts.push(env.DB.prepare(
      'INSERT INTO boxes (code, pallet_id, product_id, quantity, lot, created_by) VALUES (NULL, ?, ?, ?, ?, ?)'
    ).bind(palletId, productId, perBox, pallet.lot || null, user.sub));
  }
  await env.DB.batch(stmts);
  // atribuie coduri CUT-##### pe baza id-ului (doar rândurilor tocmai inserate)
  await env.DB.prepare(
    "UPDATE boxes SET code = 'CUT-' || printf('%05d', id) WHERE id > ? AND code IS NULL AND pallet_id = ?"
  ).bind(before.m, palletId).run();

  const { results } = await env.DB.prepare(
    'SELECT id, code, quantity FROM boxes WHERE id > ? AND pallet_id = ? ORDER BY id'
  ).bind(before.m, palletId).all();

  const boxes = results.map((r) => ({
    id: r.id, code: r.code, quantity: r.quantity,
    product_barcode: product.barcode || product.sku, product_sku: product.sku,
    product_name: product.name, unit: product.unit,
    pallet_code: pallet.code, lot: pallet.lot || null,
  }));
  return json({ ok: true, boxes });
}

// Listează cutiile deja generate pentru un palet.
export async function listForPallet(request, env, ctx, user, params) {
  const palletId = Number(params.id);
  const { results } = await env.DB.prepare(`
    SELECT bx.id, bx.code, bx.quantity, bx.lot, bx.created_at,
           pr.sku AS product_sku, pr.name AS product_name, pr.unit,
           COALESCE(pr.barcode, pr.sku) AS product_barcode,
           pa.code AS pallet_code
    FROM boxes bx
    JOIN products pr ON pr.id = bx.product_id
    JOIN pallets pa ON pa.id = bx.pallet_id
    WHERE bx.pallet_id = ? ORDER BY bx.id`).bind(palletId).all();
  return json({ boxes: results });
}

// Rezolvă o cutie după cod (pentru scanare) — ce produs, ce cantitate, pe ce palet.
export async function resolve(request, env, ctx, user, params) {
  const code = String(params.code || '').trim();
  const box = await env.DB.prepare(`
    SELECT bx.id, bx.code, bx.quantity, bx.lot,
           pr.id AS product_id, pr.sku AS product_sku, pr.name AS product_name, pr.unit,
           COALESCE(pr.barcode, pr.sku) AS product_barcode,
           pa.code AS pallet_code, pa.id AS pallet_id, c.name AS client_name
    FROM boxes bx
    JOIN products pr ON pr.id = bx.product_id
    JOIN pallets pa ON pa.id = bx.pallet_id
    LEFT JOIN clients c ON c.id = pa.client_id
    WHERE bx.code = ?`).bind(code).first();
  if (!box) return error('Cutie inexistentă', 404);
  return json({ box });
}
