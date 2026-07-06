// Rapoarte avansate
import { json, csv } from '../lib/http.js';

// Stoc grupat pe categorie
export async function stockByCategory(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT COALESCE(p.category,'(fără categorie)') AS category,
           COUNT(DISTINCT p.id) AS products,
           COALESCE(SUM(i.quantity),0) AS units
    FROM products p LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.active = 1
    GROUP BY COALESCE(p.category,'(fără categorie)')
    ORDER BY units DESC`).all();
  return json({ rows: results });
}

// Produse sub prag de reaprovizionare
export async function lowStock(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT p.id, p.sku, p.name, p.reorder_point, p.unit,
           COALESCE(SUM(i.quantity),0) AS total
    FROM products p LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.active = 1
    GROUP BY p.id
    HAVING COALESCE(SUM(i.quantity),0) <= p.reorder_point
    ORDER BY (COALESCE(SUM(i.quantity),0) - p.reorder_point)`).all();
  return json({ rows: results });
}

// Mișcări agregate pe perioadă (zile, ultimele N)
export async function movementsByPeriod(request, env) {
  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 30, 1), 180);
  const { results } = await env.DB.prepare(`
    SELECT date(created_at) AS day, type,
           SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) AS qty_in,
           SUM(CASE WHEN quantity < 0 THEN -quantity ELSE 0 END) AS qty_out,
           COUNT(*) AS moves
    FROM stock_movements
    WHERE created_at >= datetime('now', ?)
    GROUP BY day, type ORDER BY day DESC`).bind('-' + days + ' days').all();
  return json({ rows: results });
}

// Top produse după rulaj (volum total de mișcări)
export async function topProducts(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT p.sku, p.name, SUM(ABS(m.quantity)) AS volume, COUNT(*) AS moves
    FROM stock_movements m JOIN products p ON p.id = m.product_id
    WHERE m.created_at >= datetime('now', '-30 days')
    GROUP BY p.id ORDER BY volume DESC LIMIT 10`).all();
  return json({ rows: results });
}

export async function exportLowStockCsv(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT p.sku, p.name, p.reorder_point, COALESCE(SUM(i.quantity),0) AS total
    FROM products p LEFT JOIN inventory i ON i.product_id = p.id
    WHERE p.active = 1 GROUP BY p.id
    HAVING COALESCE(SUM(i.quantity),0) <= p.reorder_point
    ORDER BY total`).all();
  const rows = [['sku', 'produs', 'prag', 'stoc_total']];
  for (const r of results) rows.push([r.sku, r.name, r.reorder_point, r.total]);
  return csv(rows, 'sub-prag.csv');
}
