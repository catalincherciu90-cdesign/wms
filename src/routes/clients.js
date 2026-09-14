// Gestionarea clienților de depozitare + a conturilor lor de portal (staff)
import { json, error, readJson } from '../lib/http.js';
import { hashPassword } from '../lib/auth.js';

export async function list(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM products p WHERE p.client_id = c.id AND p.active = 1) AS product_count,
      (SELECT COUNT(*) FROM client_users u WHERE u.client_id = c.id) AS user_count
    FROM clients c WHERE c.active = 1 ORDER BY c.name`).all();
  return json({ clients: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  if (!b?.name) return error('Numele clientului e obligatoriu', 400);
  const res = await env.DB.prepare('INSERT INTO clients (name, email, phone, cui, reg_com, address) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(b.name.trim(), b.email || null, b.phone || null, b.cui || null, b.reg_com || null, b.address || null).run();
  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ client }, 201);
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  if (!existing) return error('Client inexistent', 404);
  const m = { ...existing, ...b };
  await env.DB.prepare('UPDATE clients SET name=?, email=?, phone=?, cui=?, reg_com=?, address=?, active=? WHERE id=?')
    .bind(m.name, m.email || null, m.phone || null, m.cui || null, m.reg_com || null, m.address || null, m.active ? 1 : 0, id).run();
  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  return json({ client });
}

// Ștergere client (firmă) — blocată dacă mai are marfă (produse/paleți), ca să nu orfanizăm stocul.
export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  const client = await env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(id).first();
  if (!client) return error('Client inexistent', 404);
  const prod = await env.DB.prepare('SELECT COUNT(*) AS n FROM products WHERE client_id = ?').bind(id).first();
  if (prod.n > 0) return error('Clientul are ' + prod.n + ' produse. Șterge sau reasignează întâi produsele.', 400);
  const pal = await env.DB.prepare('SELECT COUNT(*) AS n FROM pallets WHERE client_id = ?').bind(id).first();
  if (pal.n > 0) return error('Clientul are ' + pal.n + ' paleți. Golește/șterge întâi paleții.', 400);
  // Ștergem comenzile (+liniile), conturile de portal, apoi clientul.
  await env.DB.batch([
    env.DB.prepare('DELETE FROM order_lines WHERE order_id IN (SELECT id FROM orders WHERE client_id = ?)').bind(id),
    env.DB.prepare('DELETE FROM orders WHERE client_id = ?').bind(id),
    env.DB.prepare('DELETE FROM client_users WHERE client_id = ?').bind(id),
    env.DB.prepare('DELETE FROM clients WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

// Dosarul complet al unui client: date firmă, produse + stoc, comenzi, conturi, paleți.
export async function overview(request, env, ctx, user, params) {
  const id = Number(params.id);
  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  if (!client) return error('Client inexistent', 404);

  const { results: products } = await env.DB.prepare(`
    SELECT p.id, p.sku, p.barcode, p.name, p.category, p.unit, p.reorder_point,
           COALESCE(SUM(i.quantity),0) AS total,
           (SELECT COALESCE(SUM(ol.quantity),0) FROM order_lines ol JOIN orders o ON o.id=ol.order_id
              WHERE ol.product_id=p.id AND o.type='outbound' AND o.status NOT IN ('completed','cancelled')) AS reserved
    FROM products p LEFT JOIN inventory i ON i.product_id=p.id
    WHERE p.client_id=? AND p.active=1
    GROUP BY p.id ORDER BY p.name`).bind(id).all();
  for (const r of products) {
    r.available = (r.total || 0) - (r.reserved || 0);
    r.low = (Number(r.reorder_point) > 0 && (r.total || 0) <= Number(r.reorder_point)) ? 1 : 0;
  }

  const { results: orders } = await env.DB.prepare(`
    SELECT o.id, o.code, o.status, o.source, o.created_at, o.recipient_name, o.recipient_city,
           (SELECT COUNT(*) FROM order_lines WHERE order_id=o.id) AS line_count,
           (SELECT COALESCE(SUM(quantity),0) FROM order_lines WHERE order_id=o.id) AS total_qty
    FROM orders o WHERE o.client_id=? AND o.type='outbound'
    ORDER BY o.created_at DESC, o.id DESC LIMIT 100`).bind(id).all();

  const { results: users } = await env.DB.prepare(
    'SELECT id, email, name, active, created_at FROM client_users WHERE client_id=? ORDER BY name'
  ).bind(id).all();

  const { results: pallets } = await env.DB.prepare(`
    SELECT pa.id, pa.code, pa.status, l.code AS location_code
    FROM pallets pa LEFT JOIN locations l ON l.id=pa.location_id
    WHERE pa.client_id=? ORDER BY pa.code`).bind(id).all();

  const units = products.reduce((a, p) => a + (p.total || 0), 0);
  const low = products.filter((p) => p.low).length;
  const openOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length;

  return json({
    client, products, orders, users, pallets,
    stats: { products: products.length, units, low, orders: orders.length, open_orders: openOrders, users: users.length, pallets: pallets.length },
  });
}

// Conturi de portal ale unui client
export async function listUsers(request, env, ctx, user, params) {
  const { results } = await env.DB.prepare(
    'SELECT id, client_id, email, name, active, created_at FROM client_users WHERE client_id = ? ORDER BY name'
  ).bind(Number(params.id)).all();
  return json({ users: results });
}

export async function removeUser(request, env, ctx, user, params) {
  const clientId = Number(params.id);
  const userId = Number(params.userId);
  const res = await env.DB.prepare('DELETE FROM client_users WHERE id = ? AND client_id = ?').bind(userId, clientId).run();
  if (!res.meta.changes) return error('Cont inexistent', 404);
  return json({ ok: true });
}

export async function createUser(request, env, ctx, user, params) {
  const b = await readJson(request);
  const clientId = Number(params.id);
  if (!b?.email || !b?.name || !b?.password) return error('email, name și password obligatorii', 400);
  const client = await env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(clientId).first();
  if (!client) return error('Client inexistent', 404);
  try {
    const hash = await hashPassword(b.password);
    const res = await env.DB.prepare(
      'INSERT INTO client_users (client_id, email, name, password_hash) VALUES (?, ?, ?, ?)'
    ).bind(clientId, b.email.toLowerCase().trim(), b.name.trim(), hash).run();
    const cu = await env.DB.prepare('SELECT id, client_id, email, name, active, created_at FROM client_users WHERE id = ?')
      .bind(res.meta.last_row_id).first();
    return json({ user: cu }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error('Email deja folosit', 409);
    throw e;
  }
}
