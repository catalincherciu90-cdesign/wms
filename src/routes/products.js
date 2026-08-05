// Rute produse / SKU
import { json, error, csv, readJson } from '../lib/http.js';

export async function list(request, env) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q');
  const clientId = url.searchParams.get('client_id');
  let sql = 'SELECT p.*, c.name AS client_name FROM products p LEFT JOIN clients c ON c.id = p.client_id';
  const conds = [];
  const binds = [];
  if (q) {
    conds.push('(p.sku LIKE ? OR p.name LIKE ? OR p.barcode LIKE ?)');
    const like = `%${q}%`;
    binds.push(like, like, like);
  }
  if (clientId) { conds.push('p.client_id = ?'); binds.push(Number(clientId)); }
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY p.name';
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ products: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  if (!b?.sku || !b?.name) return error('SKU și nume obligatorii', 400);
  try {
    const res = await env.DB.prepare(
      `INSERT INTO products (sku, barcode, name, description, category, unit, reorder_point, client_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      b.sku.trim(), b.barcode?.trim() || null, b.name.trim(), b.description || null,
      b.category || null, b.unit || 'buc', Number(b.reorder_point) || 0, b.client_id ? Number(b.client_id) : null
    ).run();
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ product }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error('SKU sau cod de bare deja existent', 409);
    throw e;
  }
}

export async function update(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  const existing = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  if (!existing) return error('Produs inexistent', 404);
  const m = { ...existing, ...b };
  await env.DB.prepare(
    `UPDATE products SET sku=?, barcode=?, name=?, description=?, category=?, unit=?, reorder_point=?, client_id=?, active=? WHERE id=?`
  ).bind(
    m.sku, m.barcode || null, m.name, m.description || null, m.category || null,
    m.unit || 'buc', Number(m.reorder_point) || 0, m.client_id ? Number(m.client_id) : null, m.active ? 1 : 0, id
  ).run();
  const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(id).first();
  return json({ product });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  // soft-delete ca să nu stricăm istoricul de mișcări
  await env.DB.prepare('UPDATE products SET active = 0 WHERE id = ?').bind(id).run();
  return json({ ok: true });
}

export async function exportCsv(request, env) {
  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY name').all();
  const rows = [['id', 'sku', 'barcode', 'name', 'category', 'unit', 'reorder_point', 'active']];
  for (const p of results) rows.push([p.id, p.sku, p.barcode, p.name, p.category, p.unit, p.reorder_point, p.active]);
  return csv(rows, 'produse.csv');
}
