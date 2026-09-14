// Servicii (manipulare, ambalare, transport…) cu preț + atașare la comenzi.
import { json, error, readJson } from '../lib/http.js';

// ── Catalog servicii ────────────────────────────────────────────────────────
export async function list(request, env) {
  const url = new URL(request.url);
  const all = url.searchParams.get('all') === '1';
  const sql = all
    ? 'SELECT * FROM services ORDER BY name'
    : 'SELECT * FROM services WHERE active = 1 ORDER BY name';
  const { results } = await env.DB.prepare(sql).all();
  return json({ services: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  const name = (b?.name ?? '').toString().trim();
  if (!name) return error('Numele serviciului e obligatoriu', 400);
  const price = Number(b?.price) || 0;
  const res = await env.DB.prepare(
    'INSERT INTO services (name, price, unit) VALUES (?, ?, ?)'
  ).bind(name, price, (b?.unit ?? '').toString().trim() || null).run();
  const service = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ service }, 201);
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
  if (!existing) return error('Serviciu inexistent', 404);
  const m = { ...existing, ...b };
  await env.DB.prepare('UPDATE services SET name=?, price=?, unit=?, active=? WHERE id=?')
    .bind((m.name || '').toString().trim(), Number(m.price) || 0, (m.unit ?? '') ? String(m.unit).trim() : null, m.active ? 1 : 0, id).run();
  const service = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(id).first();
  return json({ service });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  await env.DB.prepare('DELETE FROM services WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

// ── Servicii atașate unei comenzi ───────────────────────────────────────────
export async function listForOrder(request, env, ctx, user, params) {
  const orderId = Number(params.id);
  const { results } = await env.DB.prepare(
    'SELECT id, service_id, name, price, quantity FROM order_services WHERE order_id = ? ORDER BY id'
  ).bind(orderId).all();
  const total = results.reduce((a, r) => a + (Number(r.price) || 0) * (Number(r.quantity) || 0), 0);
  return json({ services: results, total });
}

export async function addToOrder(request, env, ctx, user, params) {
  const orderId = Number(params.id);
  const b = await readJson(request);
  const order = await env.DB.prepare('SELECT id FROM orders WHERE id = ?').bind(orderId).first();
  if (!order) return error('Comandă inexistentă', 404);

  const qty = Number(b?.quantity) > 0 ? Number(b.quantity) : 1;
  let name, price, serviceId = null;
  if (b?.service_id) {
    const s = await env.DB.prepare('SELECT * FROM services WHERE id = ?').bind(Number(b.service_id)).first();
    if (!s) return error('Serviciu inexistent', 404);
    serviceId = s.id; name = s.name; price = Number(s.price) || 0;
  } else {
    // serviciu ad-hoc (nume + preț date direct)
    name = (b?.name ?? '').toString().trim();
    if (!name) return error('Alege un serviciu sau dă un nume', 400);
    price = Number(b?.price) || 0;
  }
  const res = await env.DB.prepare(
    'INSERT INTO order_services (order_id, service_id, name, price, quantity) VALUES (?, ?, ?, ?, ?)'
  ).bind(orderId, serviceId, name, price, qty).run();
  const line = await env.DB.prepare('SELECT id, service_id, name, price, quantity FROM order_services WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ line }, 201);
}

export async function removeFromOrder(request, env, ctx, user, params) {
  const orderId = Number(params.id);
  const lineId = Number(params.lineId);
  await env.DB.prepare('DELETE FROM order_services WHERE id = ? AND order_id = ?').bind(lineId, orderId).run();
  return json({ ok: true });
}
