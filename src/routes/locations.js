// Rute locații de depozit
import { json, error, readJson } from '../lib/http.js';

export async function list(request, env) {
  const { results } = await env.DB.prepare('SELECT * FROM locations ORDER BY code').all();
  return json({ locations: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  if (!b?.code) return error('Cod locație obligatoriu', 400);
  try {
    const res = await env.DB.prepare(
      'INSERT INTO locations (code, name, zone) VALUES (?, ?, ?)'
    ).bind(b.code.trim(), b.name || null, b.zone || null).run();
    const location = await env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ location }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error('Cod locație deja existent', 409);
    throw e;
  }
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(id).first();
  if (!existing) return error('Locație inexistentă', 404);
  const m = { ...existing, ...b };
  await env.DB.prepare('UPDATE locations SET code=?, name=?, zone=?, active=? WHERE id=?')
    .bind(m.code, m.name || null, m.zone || null, m.active ? 1 : 0, id).run();
  const location = await env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(id).first();
  return json({ location });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  await env.DB.prepare('UPDATE locations SET active = 0 WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
