// Portal client — fiecare endpoint returnează DOAR datele clientului autentificat.
import { json, csv } from '../lib/http.js';

export async function me(request, env, ctx, user) {
  const client = await env.DB.prepare('SELECT id, name, email, phone FROM clients WHERE id = ?').bind(user.client_id).first();
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
           COALESCE(SUM(i.quantity), 0) AS total
    FROM products p LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.client_id = ? AND p.active = 1
    GROUP BY p.id ORDER BY p.name`).bind(user.client_id).all();

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

export async function exportCsv(request, env, ctx, user) {
  const { results } = await env.DB.prepare(`
    SELECT p.sku, p.name, l.code AS location, i.quantity
    FROM inventory i JOIN products p ON p.id = i.product_id JOIN locations l ON l.id = i.location_id
    WHERE p.client_id = ? AND i.quantity <> 0 ORDER BY p.name, l.code`).bind(user.client_id).all();
  const rows = [['sku', 'produs', 'locatie', 'cantitate']];
  for (const r of results) rows.push([r.sku, r.name, r.location, r.quantity]);
  return csv(rows, 'stocul-meu.csv');
}
