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
  const owner = url.searchParams.get('owner');
  if (owner === 'client') conds.push('p.client_id IS NOT NULL');
  else if (owner === 'internal') conds.push('p.client_id IS NULL');
  if (conds.length) sql += ' WHERE ' + conds.join(' AND ');
  sql += ' ORDER BY p.name';
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ products: results });
}

export async function create(request, env) {
  const b = await readJson(request);
  const barcode = (b?.barcode ?? '').toString().trim();
  const sku = (b?.sku ?? '').toString().trim() || barcode; // SKU auto din EAN dacă lipsește
  if (!barcode) return error('Codul EAN (cod de bare) e obligatoriu', 400);
  if (!b?.name) return error('Numele e obligatoriu', 400);
  try {
    const res = await env.DB.prepare(
      `INSERT INTO products (sku, barcode, name, description, category, unit, reorder_point, client_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      sku, barcode, b.name.trim(), b.description || null,
      b.category || null, b.unit || 'buc', Number(b.reorder_point) || 0, b.client_id ? Number(b.client_id) : null
    ).run();
    const product = await env.DB.prepare('SELECT * FROM products WHERE id = ?').bind(res.meta.last_row_id).first();
    return json({ product }, 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return error('EAN sau SKU deja existent', 409);
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
  const p = await env.DB.prepare('SELECT id FROM products WHERE id = ?').bind(id).first();
  if (!p) return error('Produs inexistent', 404);
  // Ștergere DEFINITIVĂ: curăță întâi referințele, apoi produsul (atomic).
  await env.DB.batch([
    env.DB.prepare('DELETE FROM stock_movements WHERE product_id = ?').bind(id),
    env.DB.prepare('DELETE FROM inventory WHERE product_id = ?').bind(id),
    env.DB.prepare('DELETE FROM pallet_items WHERE product_id = ?').bind(id),
    env.DB.prepare('DELETE FROM order_lines WHERE product_id = ?').bind(id),
    env.DB.prepare('DELETE FROM products WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}

// Import în masă (din Excel/CSV parsat în client -> listă de produse)
export async function importProducts(request, env, ctx, user) {
  const b = await readJson(request);
  if (!Array.isArray(b?.products) || !b.products.length) return error('Lista de produse e goală', 400);
  if (b.products.length > 3000) return error('Prea multe rânduri (max 3000)', 400);
  const clientId = b.client_id ? Number(b.client_id) : null;

  const valid = [];
  let skipped = 0;
  for (const p of b.products) {
    const barcode = (p.barcode ?? '').toString().trim();
    const sku = (p.sku ?? '').toString().trim() || barcode; // SKU auto din EAN
    const name = (p.name ?? '').toString().trim();
    if (!sku || !name) { skipped++; continue; }
    valid.push({
      sku, name,
      barcode: barcode || null,
      category: (p.category ?? '').toString().trim() || null,
      unit: (p.unit ?? '').toString().trim() || 'buc',
      reorder_point: Number(p.reorder_point) || 0,
    });
  }

  let created = 0;
  for (let i = 0; i < valid.length; i += 100) {
    const chunk = valid.slice(i, i + 100);
    const res = await env.DB.batch(chunk.map((p) =>
      env.DB.prepare('INSERT OR IGNORE INTO products (sku, barcode, name, category, unit, reorder_point, client_id) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .bind(p.sku, p.barcode, p.name, p.category, p.unit, p.reorder_point, clientId)
    ));
    for (const r of res) { if (r.meta && r.meta.changes > 0) created++; else skipped++; }
  }
  return json({ created, skipped, total: b.products.length });
}

// Reasignează în masă proprietarul (clientul) mai multor produse.
export async function reassign(request, env, ctx, user) {
  const b = await readJson(request);
  const ids = Array.isArray(b?.ids) ? b.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return error('Selectează cel puțin un produs', 400);
  if (ids.length > 1000) return error('Prea multe produse selectate (max 1000)', 400);
  const clientId = b.client_id ? Number(b.client_id) : null;
  if (clientId) {
    const c = await env.DB.prepare('SELECT id FROM clients WHERE id = ?').bind(clientId).first();
    if (!c) return error('Client inexistent', 404);
  }
  const placeholders = ids.map(() => '?').join(',');
  const res = await env.DB.prepare(`UPDATE products SET client_id = ? WHERE id IN (${placeholders})`)
    .bind(clientId, ...ids).run();
  return json({ ok: true, updated: res.meta.changes });
}

// Ștergere DEFINITIVĂ în masă (cu cascadă pe referințe).
export async function bulkDelete(request, env, ctx, user) {
  const b = await readJson(request);
  const ids = Array.isArray(b?.ids) ? b.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return error('Selectează cel puțin un produs', 400);
  if (ids.length > 1000) return error('Prea multe produse selectate (max 1000)', 400);
  const ph = ids.map(() => '?').join(',');
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM stock_movements WHERE product_id IN (${ph})`).bind(...ids),
    env.DB.prepare(`DELETE FROM inventory WHERE product_id IN (${ph})`).bind(...ids),
    env.DB.prepare(`DELETE FROM pallet_items WHERE product_id IN (${ph})`).bind(...ids),
    env.DB.prepare(`DELETE FROM order_lines WHERE product_id IN (${ph})`).bind(...ids),
    env.DB.prepare(`DELETE FROM products WHERE id IN (${ph})`).bind(...ids),
  ]);
  return json({ ok: true, deleted: ids.length });
}

export async function exportCsv(request, env) {
  const { results } = await env.DB.prepare('SELECT * FROM products ORDER BY name').all();
  const rows = [['id', 'sku', 'barcode', 'name', 'category', 'unit', 'reorder_point', 'active']];
  for (const p of results) rows.push([p.id, p.sku, p.barcode, p.name, p.category, p.unit, p.reorder_point, p.active]);
  return csv(rows, 'produse.csv');
}
