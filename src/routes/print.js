// Coadă de printare: Zebra pune job-uri, „Stația de imprimare" (pagina de pe
// calculatorul cu imprimanta) le ridică și le printează automat.
import { json, error, readJson } from '../lib/http.js';

// Adaugă un job de printare (ex: etichetă de palet/colet).
export async function create(request, env, ctx, user) {
  const b = await readJson(request);
  const type = (b?.type || 'pallet').toString().slice(0, 30);
  const refId = b?.ref_id ? Number(b.ref_id) : null;
  const code = (b?.code || '').toString().slice(0, 60) || null;
  const title = (b?.title || '').toString().slice(0, 120) || null;
  const lot = (b?.lot || '').toString().slice(0, 60) || null;
  const res = await env.DB.prepare(
    "INSERT INTO print_jobs (type, ref_id, code, title, lot, status, created_by) VALUES (?, ?, ?, ?, ?, 'pending', ?)"
  ).bind(type, refId, code, title, lot, user.sub).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

// Job-urile în așteptare (pentru stația de imprimare). Cele mai vechi primele.
// La fiecare interogare marcăm „stația e vie" (heartbeat) — ca să știm pe Zebra
// dacă există un calculator conectat care printează.
export async function pending(request, env) {
  const url = new URL(request.url);
  const station = (url.searchParams.get('station') || '').toString().slice(0, 60);
  // heartbeat: reținem ultima interogare a stației (și numele, dacă e trimis)
  try {
    await env.DB.prepare(
      "INSERT INTO settings (key, value) VALUES ('print_station_last', datetime('now')) ON CONFLICT(key) DO UPDATE SET value = datetime('now')"
    ).run();
    if (station) {
      await env.DB.prepare(
        "INSERT INTO settings (key, value) VALUES ('print_station_name', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value"
      ).bind(station).run();
    }
  } catch (e) { /* settings poate lipsi pe scheme foarte vechi */ }
  const { results } = await env.DB.prepare(
    "SELECT id, type, ref_id, code, title, lot, created_at FROM print_jobs WHERE status='pending' ORDER BY id ASC LIMIT 20"
  ).all();
  return json({ jobs: results });
}

// Starea stației de imprimare: e online un calculator care printează? câte job-uri așteaptă?
export async function status(request, env) {
  let last = null, name = null;
  try {
    const r1 = await env.DB.prepare("SELECT value FROM settings WHERE key='print_station_last'").first();
    last = r1?.value || null;
    const r2 = await env.DB.prepare("SELECT value FROM settings WHERE key='print_station_name'").first();
    name = r2?.value || null;
  } catch (e) {}
  // online dacă stația a interogat în ultimele 15 secunde
  let online = false, ageSec = null;
  if (last) {
    const fresh = await env.DB.prepare("SELECT (strftime('%s','now') - strftime('%s', ?)) AS age").bind(last).first();
    ageSec = fresh?.age != null ? Number(fresh.age) : null;
    online = ageSec != null && ageSec <= 15;
  }
  const p = await env.DB.prepare("SELECT COUNT(*) AS n FROM print_jobs WHERE status='pending'").first();
  return json({ online, last_seen: last, age_sec: ageSec, station: name, pending: p?.n || 0 });
}

// Trimite o etichetă de test în coadă (ca să verifici că imprimanta merge).
export async function test(request, env, ctx, user) {
  const title = 'TEST ' + new Date().toISOString().slice(11, 19);
  const res = await env.DB.prepare(
    "INSERT INTO print_jobs (type, code, title, status, created_by) VALUES ('test', 'TEST', ?, 'pending', ?)"
  ).bind(title, user.sub).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

// Marchează un job ca printat.
export async function done(request, env, ctx, user, params) {
  const id = Number(params.id);
  await env.DB.prepare("UPDATE print_jobs SET status='printed', printed_at=datetime('now') WHERE id=?").bind(id).run();
  return json({ ok: true });
}
