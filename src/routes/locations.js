// Rute locații de depozit
import { json, error, readJson } from '../lib/http.js';

export async function list(request, env) {
  // used = câți paleți sunt depozitați în locație (pentru bara de ocupare)
  const { results } = await env.DB.prepare(`
    SELECT l.*,
      (SELECT COUNT(*) FROM pallets p WHERE p.location_id = l.id AND p.status = 'stored') AS used
    FROM locations l ORDER BY l.code`).all();
  return json({ locations: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  if (!b?.code) return error('Cod locație obligatoriu', 400);
  try {
    const res = await env.DB.prepare(
      'INSERT INTO locations (code, name, zone, capacity) VALUES (?, ?, ?, ?)'
    ).bind(b.code.trim(), b.name || null, b.zone || null, Number(b.capacity) || 0).run();
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
  await env.DB.prepare('UPDATE locations SET code=?, name=?, zone=?, capacity=?, active=? WHERE id=?')
    .bind(m.code, m.name || null, m.zone || null, Number(m.capacity) || 0, m.active ? 1 : 0, id).run();
  const location = await env.DB.prepare('SELECT * FROM locations WHERE id = ?').bind(id).first();
  return json({ location });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  await env.DB.prepare('UPDATE locations SET active = 0 WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
