// Portal client — fiecare endpoint returnează DOAR datele clientului autentificat.
import { json, csv, error, readJson } from '../lib/http.js';

export async function me(request, env, ctx, user) {
  const client = await env.DB.prepare('SELECT id, name, email, phone, cui, reg_com, address FROM clients WHERE id = ?').bind(user.client_id).first();
  return json({ client, user: { name: user.name, email: user.email } });
}

export async function summary(request, env, ctx, user) {
  const s = await env.DB.prepare(`
    SELECT COUNT(DISTINCT p.id) AS products,
           COALESCE(SUM(i.quantity), 0) AS units
    FROM products p LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.client_id = ? AND p.active = 1`).bind(user.client_id).first();
  const locs = await env.DB.prepare(`
    SELECT COUNT(DISTINCT i.location_id) AS n
    FROM inventory i JOIN products p ON p.id = i.product_id
    WHERE p.client_id = ? AND i.quantity <> 0`).bind(user.client_id).first();
  return json({ summary: { products: s.products, units: s.units, locations: locs.n } });
}

// Fiecare produs individual + total + locațiile unde e depozitat
export async function products(request, env, ctx, user) {
  const { results } = await env.DB.prepare(`
    SELECT p.id, p.sku, p.name, p.category, p.unit, p.barcode,
           COALESCE(SUM(i.quantity), 0) AS total,
           (SELECT COALESCE(SUM(ol.quantity),0) FROM order_lines ol JOIN orders o ON o.id = ol.order_id
              WHERE ol.product_id = p.id AND o.type='outbound' AND o.status NOT IN ('completed','cancelled')) AS reserved
    FROM products p LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.client_id = ? AND p.active = 1
    GROUP BY p.id ORDER BY p.name`).bind(user.client_id).all();
  for (const r of results) r.available = (r.total || 0) - (r.reserved || 0);

  const { results: locs } = await env.DB.prepare(`
    SELECT i.product_id, l.code AS location_code, i.quantity
    FROM inventory i JOIN locations l ON l.id = i.location_id
    JOIN products p ON p.id = i.product_id
    WHERE p.client_id = ? AND i.quantity <> 0
    ORDER BY l.code`).bind(user.client_id).all();

  const byProduct = {};
  for (const r of locs) {
    (byProduct[r.product_id] = byProduct[r.product_id] || []).push({ location: r.location_code, qty: r.quantity });
  }
  const out = results.map((p) => ({ ...p, locations: byProduct[p.id] || [] }));
  return json({ products: out });
}

// Paleții clientului + ce produse sunt pe fiecare
export async function pallets(request, env, ctx, user) {
  const { results: pals } = await env.DB.prepare(`
    SELECT pa.id, pa.code, pa.status, l.code AS location_code, pa.created_at
    FROM pallets pa LEFT JOIN locations l ON l.id = pa.location_id
    WHERE pa.client_id = ? AND pa.status <> 'shipped'
    ORDER BY pa.code`).bind(user.client_id).all();

  const { results: items } = await env.DB.prepare(`
    SELECT pi.pallet_id, pr.sku, pr.name AS product_name, pr.unit, pi.quantity
    FROM pallet_items pi JOIN products pr ON pr.id = pi.product_id
    JOIN pallets pa ON pa.id = pi.pallet_id
    WHERE pa.client_id = ? ORDER BY pr.name`).bind(user.client_id).all();

  const byPallet = {};
  for (const it of items) (byPallet[it.pallet_id] = byPallet[it.pallet_id] || []).push(it);
  const out = pals.map((p) => ({ ...p, items: byPallet[p.id] || [] }));
  return json({ pallets: out });
}

export async function movements(request, env, ctx, user) {
  const { results } = await env.DB.prepare(`
    SELECT m.created_at, m.type, m.quantity, m.reference, p.sku, p.name AS product_name, l.code AS location_code
    FROM stock_movements m
    JOIN products p ON p.id = m.product_id
    JOIN locations l ON l.id = m.location_id
    WHERE p.client_id = ?
    ORDER BY m.created_at DESC, m.id DESC LIMIT 200`).bind(user.client_id).all();
  return json({ movements: results });
}

// Comenzile de livrare create de client (către clienții lui)
export async function orders(request, env, ctx, user) {
  const { results } = await env.DB.prepare(`
    SELECT o.id, o.code, o.status, o.note, o.created_at, o.completed_at,
           o.recipient_name, o.recipient_city,
           (SELECT COUNT(*) FROM order_lines WHERE order_id = o.id) AS line_count,
           (SELECT COALESCE(SUM(quantity),0) FROM order_lines WHERE order_id = o.id) AS total_qty
    FROM orders o
    WHERE o.client_id = ? AND o.type = 'outbound'
    ORDER BY o.created_at DESC, o.id DESC`).bind(user.client_id).all();
  return json({ orders: results });
}

export async function orderGet(request, env, ctx, user, params) {
  const id = Number(params.id);
  const order = await env.DB.prepare(
    "SELECT * FROM orders WHERE id = ? AND client_id = ? AND type = 'outbound'").bind(id, user.client_id).first();
  if (!order) return error('Comandă inexistentă', 404);
  const { results: lines } = await env.DB.prepare(`
    SELECT ol.quantity, pr.sku, pr.name AS product_name, pr.unit
    FROM order_lines ol JOIN products pr ON pr.id = ol.product_id
    WHERE ol.order_id = ? ORDER BY ol.id`).bind(id).all();
  return json({ order, lines });
}

export async function orderCreate(request, env, ctx, user) {
  const b = await readJson(request);
  const lines = Array.isArray(b?.lines) ? b.lines : [];
  if (!lines.length) return error('Adaugă cel puțin un produs', 400);
  if (!b?.recipient_name || !b?.recipient_address) return error('Numele și adresa destinatarului sunt obligatorii', 400);
  for (const l of lines) {
    if (!l.product_id || !(Number(l.quantity) > 0)) return error('Fiecare linie are produs și cantitate > 0', 400);
  }

  // toate produsele trebuie să aparțină clientului
  const ids = lines.map((l) => Number(l.product_id));
  const placeholders = ids.map(() => '?').join(',');
  const { results: owned } = await env.DB.prepare(
    `SELECT id FROM products WHERE id IN (${placeholders}) AND client_id = ?`).bind(...ids, user.client_id).all();
  const ownedSet = new Set(owned.map((r) => r.id));
  for (const id of ids) if (!ownedSet.has(id)) return error('Un produs nu îți aparține', 403);

  const res = await env.DB.prepare(
    `INSERT INTO orders (code, type, status, note, source, client_id,
       recipient_name, recipient_phone, recipient_address, recipient_city, recipient_county, recipient_postal)
     VALUES (?, 'outbound', 'confirmed', ?, 'portal', ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    'TMP', b.note || null, user.client_id,
    b.recipient_name.trim(), b.recipient_phone || null, b.recipient_address.trim(),
    b.recipient_city || null, b.recipient_county || null, b.recipient_postal || null
  ).run();
  const id = res.meta.last_row_id;
  const code = 'OUT-' + String(id).padStart(5, '0');
  await env.DB.prepare('UPDATE orders SET code = ? WHERE id = ?').bind(code, id).run();

  await env.DB.batch(lines.map((l) =>
    env.DB.prepare('INSERT INTO order_lines (order_id, product_id, quantity) VALUES (?, ?, ?)')
      .bind(id, Number(l.product_id), Number(l.quantity))
  ));
  const order = await env.DB.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();
  return json({ order }, 201);
}

export async function exportCsv(request, env, ctx, user) {
  const { results } = await env.DB.prepare(`
    SELECT p.sku, p.name, l.code AS location, i.quantity
    FROM inventory i JOIN products p ON p.id = i.product_id JOIN locations l ON l.id = i.location_id
    WHERE p.client_id = ? AND i.quantity <> 0 ORDER BY p.name, l.code`).bind(user.client_id).all();
  const rows = [['sku', 'produs', 'locatie', 'cantitate']];
  for (const r of results) rows.push([r.sku, r.name, r.location, r.quantity]);
  return csv(rows, 'stocul-meu.csv');
}
