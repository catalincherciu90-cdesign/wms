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
  const res = await env.DB.prepare(
    "INSERT INTO print_jobs (type, ref_id, code, title, status, created_by) VALUES (?, ?, ?, ?, 'pending', ?)"
  ).bind(type, refId, code, title, user.sub).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

// Job-urile în așteptare (pentru stația de imprimare). Cele mai vechi primele.
export async function pending(request, env) {
  const { results } = await env.DB.prepare(
    "SELECT id, type, ref_id, code, title, created_at FROM print_jobs WHERE status='pending' ORDER BY id ASC LIMIT 20"
  ).all();
  return json({ jobs: results });
}

// Marchează un job ca printat.
export async function done(request, env, ctx, user, params) {
  const id = Number(params.id);
  await env.DB.prepare("UPDATE print_jobs SET status='printed', printed_at=datetime('now') WHERE id=?").bind(id).run();
  return json({ ok: true });
}
