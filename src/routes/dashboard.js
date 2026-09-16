// Statistici pentru dashboard
import { json } from '../lib/http.js';

export async function stats(request, env) {
  const url = new URL(request.url);
  const c = url.searchParams.get('client_id') ? Number(url.searchParams.get('client_id')) : null;
  const cp = c ? [c] : [];              // bind pentru filtrele pe produs
  const pAnd = c ? ' AND p.client_id = ?' : '';

  const [products, locations, totalUnits, reserved, lowStock, openOrders, moves7, byCategory, recentOrders, lowList,
         ordersByStatus, topProducts, moves30, stockByClient] = await Promise.all([
    env.DB.prepare('SELECT COUNT(*) AS n FROM products p WHERE p.active = 1' + pAnd).bind(...cp).first(),
    c
      ? env.DB.prepare('SELECT COUNT(DISTINCT i.location_id) AS n FROM inventory i JOIN products p ON p.id = i.product_id WHERE i.quantity <> 0 AND p.client_id = ?').bind(c).first()
      : env.DB.prepare('SELECT COUNT(*) AS n FROM locations WHERE active = 1').first(),
    env.DB.prepare('SELECT COALESCE(SUM(i.quantity),0) AS n FROM inventory i' + (c ? ' JOIN products p ON p.id = i.product_id WHERE p.client_id = ?' : '')).bind(...cp).first(),
    env.DB.prepare("SELECT COALESCE(SUM(ol.quantity),0) AS n FROM order_lines ol JOIN orders o ON o.id = ol.order_id JOIN products p ON p.id = ol.product_id WHERE o.type='outbound' AND o.status NOT IN ('completed','cancelled')" + pAnd).bind(...cp).first(),
    env.DB.prepare(`
      SELECT COUNT(*) AS n FROM (
        SELECT p.id FROM products p
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.active = 1${pAnd} GROUP BY p.id
        HAVING COALESCE(SUM(i.quantity),0) <= p.reorder_point
      )`).bind(...cp).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM orders WHERE status IN ('draft','confirmed')" + (c ? ' AND client_id = ?' : '')).bind(...cp).first(),
    env.DB.prepare(`
      SELECT date(m.created_at) AS day,
             SUM(CASE WHEN m.quantity > 0 THEN m.quantity ELSE 0 END) AS inbound,
             SUM(CASE WHEN m.quantity < 0 THEN -m.quantity ELSE 0 END) AS outbound
      FROM stock_movements m ${c ? 'JOIN products p ON p.id = m.product_id ' : ''}
      WHERE m.created_at >= datetime('now', '-7 days')${pAnd}
      GROUP BY day ORDER BY day`).bind(...cp).all(),
    env.DB.prepare(`
      SELECT COALESCE(p.category,'(fără categorie)') AS category, COALESCE(SUM(i.quantity),0) AS units
      FROM products p LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.active = 1${pAnd} GROUP BY COALESCE(p.category,'(fără categorie)')
      HAVING units > 0 ORDER BY units DESC LIMIT 8`).bind(...cp).all(),
    env.DB.prepare(`
      SELECT o.code, o.type, o.status, o.created_at, p.name AS partner_name
      FROM orders o LEFT JOIN partners p ON p.id = o.partner_id
      ${c ? 'WHERE o.client_id = ? ' : ''}ORDER BY o.created_at DESC, o.id DESC LIMIT 6`).bind(...cp).all(),
    env.DB.prepare(`
      SELECT p.sku, p.name, p.reorder_point, COALESCE(SUM(i.quantity),0) AS total
      FROM products p LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.active = 1${pAnd} GROUP BY p.id
      HAVING COALESCE(SUM(i.quantity),0) <= p.reorder_point
      ORDER BY total LIMIT 8`).bind(...cp).all(),
    // Comenzi pe status (câte sunt în fiecare stare)
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM orders WHERE 1=1" + (c ? ' AND client_id = ?' : '') + ' GROUP BY status').bind(...cp).all(),
    // Top produse după rulaj (mișcări) în ultimele 30 de zile
    env.DB.prepare(`
      SELECT p.sku, p.name, SUM(ABS(m.quantity)) AS moved
      FROM stock_movements m JOIN products p ON p.id = m.product_id
      WHERE m.created_at >= datetime('now', '-30 days')${pAnd}
      GROUP BY p.id ORDER BY moved DESC LIMIT 6`).bind(...cp).all(),
    // Totaluri intrări/ieșiri pe ultimele 30 de zile
    env.DB.prepare(`
      SELECT COALESCE(SUM(CASE WHEN m.quantity > 0 THEN m.quantity ELSE 0 END),0) AS inbound,
             COALESCE(SUM(CASE WHEN m.quantity < 0 THEN -m.quantity ELSE 0 END),0) AS outbound
      FROM stock_movements m ${c ? 'JOIN products p ON p.id = m.product_id ' : ''}
      WHERE m.created_at >= datetime('now', '-30 days')${pAnd}`).bind(...cp).first(),
    // Stoc pe client (relevant mai ales fără filtru — vederea 3PL)
    env.DB.prepare(`
      SELECT COALESCE(cl.name,'Intern (companie)') AS name, COALESCE(SUM(i.quantity),0) AS units
      FROM inventory i JOIN products p ON p.id = i.product_id
      LEFT JOIN clients cl ON cl.id = p.client_id
      WHERE i.quantity > 0${pAnd}
      GROUP BY p.client_id ORDER BY units DESC LIMIT 8`).bind(...cp).all(),
  ]);

  return json({
    kpis: {
      products: products.n,
      locations: locations.n,
      total_units: totalUnits.n,
      reserved: reserved.n,
      low_stock: lowStock.n,
      open_orders: openOrders.n,
    },
    activity: moves7.results,
    by_category: byCategory.results,
    recent_orders: recentOrders.results,
    low_stock_list: lowList.results,
    orders_by_status: ordersByStatus.results,
    top_products: topProducts.results,
    moves_30: moves30,
    stock_by_client: stockByClient.results,
  });
}
