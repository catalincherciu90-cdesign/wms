// Statistici pentru dashboard
import { json } from '../lib/http.js';

export async function stats(request, env) {
  const [products, locations, totalUnits, lowStock, moves7] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE active = 1').first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM locations WHERE active = 1').first(),
    env.DB.prepare('SELECT COALESCE(SUM(quantity),0) AS n FROM inventory').first(),
    env.DB.prepare(`
      SELECT COUNT(*) AS n FROM (
        SELECT p.id FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.active = 1 GROUP BY p.id
        HAVING COALESCE(SUM(i.quantity),0) <= p.reorder_point
      )`).first(),
    env.DB.prepare(`
      SELECT date(created_at) AS day,
             SUM(CASE WHEN quantity > 0 THEN quantity ELSE 0 END) AS inbound,
             SUM(CASE WHEN quantity < 0 THEN -quantity ELSE 0 END) AS outbound
      FROM stock_movements
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY day ORDER BY day`).all(),
  ]);

  return json({
    kpis: {
      products: products.n,
      locations: locations.n,
      total_units: totalUnits.n,
      low_stock: lowStock.n,
    },
    activity: moves7.results,
  });
}
