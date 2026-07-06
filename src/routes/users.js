// Rute utilizatori (doar admin)
import { json, error, readJson } from '../lib/http.js';
import { hashPassword } from '../lib/auth.js';

export async function list(request, env) {
  const { results } = await env.DB.prepare(
    'SELECT id, email, name, role, active, created_at FROM users ORDER BY name'
  ).all();
  return json({ users: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  if (!b?.email || !b?.name || !b?.password) return error('email, name și password obligatorii', 400);
  const role = ['admin', 'operator', 'viewer'].includes(b.role) ? b.role : 'operator';
  try {
    const hash = await hashPassword(b.password);
    const res = await env.DB.prepare(
      'INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, ?)'
    ).bind(b.email.toLowerCase().trim(), b.name.trim(), hash, role).run();
    const user = await env.DB.prepare('SELECT id, email, name, role, active, created_at FROM users WHERE id = ?')
      .bind(res.meta.last_row_id).first();
    return json({ user }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error('Email deja folosit', 409);
    throw e;
  }
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
  if (!existing) return error('Utilizator inexistent', 404);
  const role = ['admin', 'operator', 'viewer'].includes(b.role) ? b.role : existing.role;
  const name = b.name?.trim() || existing.name;
  const active = b.active === undefined ? existing.active : (b.active ? 1 : 0);
  await env.DB.prepare('UPDATE users SET name=?, role=?, active=? WHERE id=?').bind(name, role, active, id).run();
  if (b.password) {
    const hash = await hashPassword(b.password);
    await env.DB.prepare('UPDATE users SET password_hash=? WHERE id=?').bind(hash, id).run();
  }
  const updated = await env.DB.prepare('SELECT id, email, name, role, active, created_at FROM users WHERE id = ?').bind(id).first();
  return json({ user: updated });
}
