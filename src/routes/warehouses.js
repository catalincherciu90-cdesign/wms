// Gestiuni / depozite: unități de stoc distincte. O gestiune grupează locații;
// stocul ei = suma inventarului din locațiile care îi aparțin. Doar intern (staff).
import { json, error, readJson } from '../lib/http.js';

export async function list(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT w.*,
      (SELECT COUNT(*) FROM locations l WHERE l.warehouse_id = w.id) AS locations,
      (SELECT COALESCE(SUM(i.quantity),0) FROM inventory i JOIN locations l ON l.id = i.location_id WHERE l.warehouse_id = w.id) AS units
    FROM warehouses w ORDER BY w.active DESC, w.name`).all();
  return json({ warehouses: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  if (!b?.name || !b.name.trim()) return error('Numele gestiunii e obligatoriu', 400);
  const res = await env.DB.prepare('INSERT INTO warehouses (code, name, notes, active) VALUES (?, ?, ?, 1)')
    .bind((b.code || '').toString().trim() || null, b.name.trim(), (b.notes || '').toString().trim() || null).run();
  const warehouse = await env.DB.prepare('SELECT * FROM warehouses WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ warehouse }, 201);
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM warehouses WHERE id = ?').bind(id).first();
  if (!existing) return error('Gestiune inexistentă', 404);
  const m = { ...existing, ...b };
  await env.DB.prepare('UPDATE warehouses SET code=?, name=?, notes=?, active=? WHERE id=?')
    .bind((m.code || '').toString().trim() || null, (m.name || '').toString().trim() || existing.name, (m.notes || '').toString().trim() || null, m.active ? 1 : 0, id).run();
  const warehouse = await env.DB.prepare('SELECT * FROM warehouses WHERE id = ?').bind(id).first();
  return json({ warehouse });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  const wh = await env.DB.prepare('SELECT id FROM warehouses WHERE id = ?').bind(id).first();
  if (!wh) return error('Gestiune inexistentă', 404);
  const loc = await env.DB.prepare('SELECT COUNT(*) AS n FROM locations WHERE warehouse_id = ?').bind(id).first();
  if ((loc?.n || 0) > 0) {
    // are locații — o dezactivăm în loc s-o ștergem (păstrează asocierile)
    await env.DB.prepare('UPDATE warehouses SET active = 0 WHERE id = ?').bind(id).run();
    return json({ ok: true, archived: true });
  }
  await env.DB.prepare('DELETE FROM warehouses WHERE id = ?').bind(id).run();
  return json({ ok: true, deleted: true });
}
