// CMR — scrisoare de transport internațională. Formular cu 24 de casete.
// Câmpurile se salvează în `data` (JSON); câteva coloane sunt indexate (serie, nr, destinatar).
import { json, error, readJson } from '../lib/http.js';

// Datele transportatorului (caseta 16) — implicit, din formularul firmei. Se pot suprascrie din setări.
const DEFAULT_CARRIER =
  'SOSTESU STEP FORWARD S.R.L.\n' +
  'C.I.F.: RO44879034 · Nr. Ord. R.C. J23/5551/2021\n' +
  'Sediu social: str. Câmpului, nr. 12, Pantelimon, jud. Ilfov\n' +
  'Sediu secundar: Str. Veveriței, nr. 1, hala C, Pantelimon, jud. Ilfov\n' +
  'RO03BTRLRONCRT0CE6460801 - Banca Transilvania';

async function getSetting(env, key, def) {
  try {
    const r = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
    return r && r.value != null ? r.value : def;
  } catch (e) { return def; }
}

async function setSetting(env, key, value) {
  await env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')
    .bind(key, String(value)).run();
}

async function nextNumber(env, series) {
  let next = 1;
  try {
    const r = await env.DB.prepare('SELECT MAX(number) AS m FROM cmrs WHERE series = ?').bind(series).first();
    next = (r && r.m ? Number(r.m) : 0) + 1;
  } catch (e) {}
  const seed = Number(await getSetting(env, 'cmr_next', '0')) || 0;
  if (seed > next) next = seed;
  return next;
}

// Valori implicite pentru un CMR nou (serie, transportator, următorul număr).
export async function defaults(request, env) {
  const series = (await getSetting(env, 'cmr_series', 'WSD')) || 'WSD';
  const carrier = (await getSetting(env, 'cmr_carrier', DEFAULT_CARRIER)) || DEFAULT_CARRIER;
  return json({ series, carrier, next: await nextNumber(env, series) });
}

export async function list(request, env) {
  const { results } = await env.DB.prepare(
    'SELECT id, series, number, order_id, consignee_name, created_at FROM cmrs ORDER BY id DESC LIMIT 500'
  ).all();
  return json({ cmrs: results });
}

export async function get(request, env, ctx, user, params) {
  const id = Number(params.id);
  const row = await env.DB.prepare('SELECT * FROM cmrs WHERE id = ?').bind(id).first();
  if (!row) return error('CMR inexistent', 404);
  let data = {};
  try { data = JSON.parse(row.data || '{}'); } catch (e) {}
  return json({ cmr: { ...data, id: row.id, series: row.series, number: row.number, order_id: row.order_id, created_at: row.created_at } });
}

export async function create(request, env, ctx, user) {
  const b = await readJson(request);
  const series = ((b && b.series) || 'WSD').toString().trim() || 'WSD';
  // Numărul se atribuie AUTOMAT la salvare (se ignoră orice valoare din formular),
  // ca să fie unic și consecutiv chiar dacă lucrează mai mulți simultan.
  const number = await nextNumber(env, series);
  const consignee = ((b && b.consignee_name) || '').toString();
  const data = { ...(b || {}) };
  delete data.series; delete data.number; delete data.id; delete data.created_at;
  const res = await env.DB.prepare(
    'INSERT INTO cmrs (series, number, order_id, consignee_name, data, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(series, number, b && b.order_id ? Number(b.order_id) : null, consignee, JSON.stringify(data), user.sub).run();
  return json({ ok: true, id: res.meta.last_row_id, series, number }, 201);
}

// Setează numărul de pornire (următorul CMR) și, opțional, seria/transportatorul. Doar admin.
export async function saveConfig(request, env, ctx, user) {
  const b = await readJson(request);
  if (b && b.next != null && Number(b.next) > 0) await setSetting(env, 'cmr_next', Math.floor(Number(b.next)));
  if (b && b.series) await setSetting(env, 'cmr_series', String(b.series).trim());
  if (b && b.carrier != null) await setSetting(env, 'cmr_carrier', String(b.carrier));
  const series = (await getSetting(env, 'cmr_series', 'WSD')) || 'WSD';
  return json({ ok: true, next: await nextNumber(env, series) });
}

export async function update(request, env, ctx, user, params) {
  const id = Number(params.id);
  const b = await readJson(request);
  const row = await env.DB.prepare('SELECT * FROM cmrs WHERE id = ?').bind(id).first();
  if (!row) return error('CMR inexistent', 404);
  const series = ((b && b.series) || row.series || 'WSD').toString().trim() || 'WSD';
  const number = Number(b && b.number) || row.number;
  const consignee = ((b && b.consignee_name) || '').toString();
  const data = { ...(b || {}) };
  delete data.series; delete data.number; delete data.id; delete data.order_id; delete data.created_at;
  await env.DB.prepare('UPDATE cmrs SET series=?, number=?, consignee_name=?, data=? WHERE id=?')
    .bind(series, number, consignee, JSON.stringify(data), id).run();
  return json({ ok: true, id });
}

export async function remove(request, env, ctx, user, params) {
  const id = Number(params.id);
  const row = await env.DB.prepare('SELECT id FROM cmrs WHERE id = ?').bind(id).first();
  if (!row) return error('CMR inexistent', 404);
  await env.DB.prepare('DELETE FROM cmrs WHERE id = ?').bind(id).run();
  return json({ ok: true });
}
