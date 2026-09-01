// Modul comercial: oferte către clienți (linii din catalogul de servicii) + contract.
import { json, error, readJson } from '../lib/http.js';

export async function list(request, env) {
  const { results } = await env.DB.prepare(`
    SELECT o.*, c.name AS client_name,
      (SELECT COALESCE(SUM(price*quantity),0) FROM offer_lines WHERE offer_id = o.id) AS subtotal
    FROM offers o LEFT JOIN clients c ON c.id = o.client_id
    ORDER BY o.created_at DESC, o.id DESC`).all();
  for (const r of results) r.total = (r.subtotal || 0) * (1 + (Number(r.vat_rate) || 0) / 100);
  return json({ offers: results });
}

export async function get(request, env, ctx, user, params) {
  const id = Number(params.id);
  const offer = await env.DB.prepare(`
    SELECT o.*, c.name AS client_name, c.cui AS client_cui, c.reg_com AS client_reg_com,
           c.address AS client_address, c.email AS client_email, c.phone AS client_phone
    FROM offers o LEFT JOIN clients c ON c.id = o.client_id WHERE o.id = ?`).bind(id).first();
  if (!offer) return error('Ofertă inexistentă', 404);
  const { results: lines } = await env.DB.prepare(
    'SELECT id, name, price, quantity FROM offer_lines WHERE offer_id = ? ORDER BY id').bind(id).all();
  const subtotal = lines.reduce((a, l) => a + (Number(l.price) || 0) * (Number(l.quantity) || 0), 0);
  const vat = subtotal * (Number(offer.vat_rate) || 0) / 100;
  return json({ offer, lines, subtotal, vat, total: subtotal + vat });
}

export async function create(request, env, ctx, user) {
  const b = await readJson(request);
  const lines = Array.isArray(b?.lines) ? b.lines : [];
  if (!lines.length) return error('Adaugă cel puțin o linie', 400);
  const clientId = b.client_id ? Number(b.client_id) : null;
  const recipientName = (b?.recipient_name ?? '').toString().trim();
  if (!clientId && !recipientName) return error('Alege un client sau scrie destinatarul', 400);

  const res = await env.DB.prepare(
    `INSERT INTO offers (code, client_id, recipient_name, recipient_contact, status, vat_rate, note, valid_until)
     VALUES ('TMP', ?, ?, ?, 'draft', ?, ?, ?)`
  ).bind(clientId, recipientName || null, (b?.recipient_contact ?? '').toString().trim() || null,
    Number(b?.vat_rate) || 0, (b?.note ?? '').toString().trim() || null, (b?.valid_until ?? '').toString().trim() || null).run();
  const id = res.meta.last_row_id;
  const code = 'OFR-' + String(id).padStart(5, '0');
  await env.DB.prepare('UPDATE offers SET code = ? WHERE id = ?').bind(code, id).run();

  await env.DB.batch(lines.filter((l) => (l.name || '').toString().trim()).map((l) =>
    env.DB.prepare('INSERT INTO offer_lines (offer_id, name, price, quantity) VALUES (?, ?, ?, ?)')
      .bind(id, l.name.toString().trim(), Number(l.price) || 0, Number(l.quantity) > 0 ? Number(l.quantity) : 1)));

  const offer = await env.DB.prepare('SELECT * FROM offers WHERE id = ?').bind(id).first();
  return json({ offer }, 201);
}

export async function setStatus(request, env, ctx, user, params) {
  const b = await readJson(request);
  const id = Number(params.id);
  if (!['draft', 'sent', 'accepted', 'rejected'].includes(b?.status)) return error('Status invalid', 400);
  const o = await env.DB.prepare('SELECT id FROM offers WHERE id = ?').bind(id).first();
  if (!o) return error('Ofertă inexistentă', 404);
  await env.DB.prepare('UPDATE offers SET status = ? WHERE id = ?').bind(b.status, id).run();
  return json({ ok: true, status: b.status });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM offer_lines WHERE offer_id = ?').bind(id),
    env.DB.prepare('DELETE FROM offers WHERE id = ?').bind(id),
  ]);
  return json({ ok: true });
}
