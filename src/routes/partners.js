// Rute parteneri: furnizori (supplier) & clienți (customer)
import { json, error, readJson } from '../lib/http.js';

export async function list(request, env) {
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  let sql = 'SELECT * FROM partners WHERE active = 1';
  const binds = [];
  if (type === 'supplier' || type === 'customer') { sql += ' AND type = ?'; binds.push(type); }
  sql += ' ORDER BY name';
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ partners: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  if (!b?.name || !['supplier', 'customer'].includes(b.type)) return error('name și type (supplier/customer) obligatorii', 400);
  const res = await env.DB.prepare(
    'INSERT INTO partners (type, name, email, phone, address) VALUES (?, ?, ?, ?, ?)'
  ).bind(b.type, b.name.trim(), b.email || null, b.phone || null, b.address || null).run();
  const partner = await env.DB.prepare('SELECT * FROM partners WHERE id = ?').bind(res.meta.last_row_id).first();
  return json({ partner }, 201);
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM partners WHERE id = ?').bind(id).first();
  if (!existing) return error('Partener inexistent', 404);
  const m = { ...existing, ...b };
  await env.DB.prepare('UPDATE partners SET name=?, email=?, phone=?, address=?, active=? WHERE id=?')
    .bind(m.name, m.email || null, m.phone || null, m.address || null, m.active ? 1 : 0, id).run();
  const partner = await env.DB.prepare('SELECT * FROM partners WHERE id = ?').bind(id).first();
  return json({ partner });
}

export async function remove(request, env, ctx, user, params) {
  await env.DB.prepare('UPDATE partners SET active = 0 WHERE id = ?').bind(Number(params.id)).run();
  return json({ ok: true });
}
