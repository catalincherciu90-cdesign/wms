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
  const res = await env.DB.prepare('INSERT INTO clients (name, email, phone) VALUES (?, ?, ?)')
    .bind(b.name.trim(), b.email || null, b.phone || null).run();
  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ client }, 201);
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  if (!existing) return error('Client inexistent', 404);
  const m = { ...existing, ...b };
  await env.DB.prepare('UPDATE clients SET name=?, email=?, phone=?, active=? WHERE id=?')
    .bind(m.name, m.email || null, m.phone || null, m.active ? 1 : 0, id).run();
  const client = await env.DB.prepare('SELECT * FROM clients WHERE id = ?').bind(id).first();
  return json({ client });
}

// Conturi de portal ale unui client
export async function listUsers(request, env, ctx, user, params) {
  const { results } = await env.DB.prepare(
    'SELECT id, client_id, email, name, active, created_at FROM client_users WHERE client_id = ? ORDER BY name'
  ).bind(Number(params.id)).all();
  return json({ users: results });
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
