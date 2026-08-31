// Backup bază de date → dump SQL compatibil MySQL/MariaDB.
// - descărcabil (pentru import manual în phpMyAdmin)
// - trimis automat la un receptor PHP pe serverul clientului (backup.php)
import { json, error, corsHeaders } from '../lib/http.js';

// Config implicit (se poate suprascrie cu variabile în Cloudflare: BACKUP_URL, BACKUP_TOKEN)
const BACKUP_URL_DEFAULT = 'https://wsdlogistics.ro/backup-wms-cdesign.php';
const BACKUP_TOKEN_DEFAULT = 'k9Qm2vX7pL4wZ8rT1nJ6bH3yD5sF0aG-wsdBackup-Ee2cU8oInR4t';

// Ordinea contează la restore (părinți înainte de copii). Whitelist fix de tabele.
const TABLES = [
  'clients', 'client_users', 'users', 'partners',
  'products', 'locations', 'inventory', 'stock_movements',
  'orders', 'order_lines', 'pallets', 'pallet_items',
];

function mysqlType(sqliteType) {
  const t = (sqliteType || '').toUpperCase();
  if (t.includes('INT')) return 'BIGINT';
  if (t.includes('REAL') || t.includes('FLOA') || t.includes('DOUB') || t.includes('NUM') || t.includes('DEC')) return 'DOUBLE';
  return 'TEXT';
}

function sqlValue(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'NULL';
  let s = String(v);
  s = s.split('\\').join('\\\\');
  s = s.split("'").join("\\'");
  s = s.split('\n').join('\\n');
  s = s.split('\r').join('\\r');
  return "'" + s + "'";
}

// Generează dump-ul SQL complet (string).
export async function generateBackupSql(env) {
  let out = '';
  out += '-- WMS WSD Logistics — backup baza de date\n';
  out += '-- Generat: ' + new Date().toISOString() + '\n';
  out += '-- Import in phpMyAdmin: selecteaza baza ta -> tab Import -> alege acest fisier.\n\n';
  out += 'SET NAMES utf8mb4;\n';
  out += 'SET FOREIGN_KEY_CHECKS = 0;\n\n';

  // Prefix pentru tabele: baza de destinație poate fi partajată cu altă aplicație,
  // așa că scriem în `wms_<tabel>` ca să NU atingem tabele existente (ex. webmail).
  const PREFIX = (env.BACKUP_TABLE_PREFIX !== undefined && env.BACKUP_TABLE_PREFIX !== null)
    ? env.BACKUP_TABLE_PREFIX : 'wms_';

  for (const t of TABLES) {
    let info;
    try {
      info = await env.DB.prepare('PRAGMA table_info(' + t + ')').all();
    } catch (e) { continue; }
    const cols = (info && info.results) || [];
    if (!cols.length) continue;

    const tt = PREFIX + t; // numele în MySQL (cu prefix)
    out += '-- ------------------------------------------------------\n';
    out += '-- Tabel: ' + tt + ' (sursa: ' + t + ')\n';
    out += 'DROP TABLE IF EXISTS `' + tt + '`;\n';

    const defs = cols.map((c) => {
      let d = '`' + c.name + '` ' + mysqlType(c.type);
      if (c.pk && /INT/i.test(c.type || '')) d += ' AUTO_INCREMENT';
      if (c.notnull && !c.pk) d += ' NOT NULL';
      return d;
    });
    const pks = cols.filter((c) => c.pk).map((c) => '`' + c.name + '`');
    let create = 'CREATE TABLE `' + tt + '` (\n  ' + defs.join(',\n  ');
    if (pks.length) create += ',\n  PRIMARY KEY (' + pks.join(', ') + ')';
    create += '\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n';
    out += create;

    const colNames = cols.map((c) => c.name);
    const colList = colNames.map((n) => '`' + n + '`').join(', ');
    let rowsRes;
    try {
      rowsRes = await env.DB.prepare('SELECT * FROM ' + t).all();
    } catch (e) { rowsRes = { results: [] }; }
    const rows = (rowsRes && rowsRes.results) || [];
    if (rows.length) {
      for (let i = 0; i < rows.length; i += 50) {
        const chunk = rows.slice(i, i + 50);
        const values = chunk.map((r) => '(' + colNames.map((n) => sqlValue(r[n])).join(', ') + ')').join(',\n  ');
        out += 'INSERT INTO `' + tt + '` (' + colList + ') VALUES\n  ' + values + ';\n';
      }
    }
    out += '\n';
  }

  out += 'SET FOREIGN_KEY_CHECKS = 1;\n';
  return out;
}

// Descărcare directă (.sql) — pentru import manual în phpMyAdmin.
export async function backupSql(request, env, ctx, user) {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const out = await generateBackupSql(env);
  return new Response(out, {
    headers: {
      'Content-Type': 'application/sql; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wms-backup-' + ts + '.sql"',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

// Trimite backup-ul către receptorul PHP de pe serverul clientului.
async function pushToServer(env) {
  const url = env.BACKUP_URL || BACKUP_URL_DEFAULT;
  const token = env.BACKUP_TOKEN || BACKUP_TOKEN_DEFAULT;
  if (!url || !token) return { ok: false, error: 'Backup extern neconfigurat (lipsă URL sau token).' };
  const sql = await generateBackupSql(env);
  let resp, text;
  try {
    resp = await fetch(url, {
      method: 'POST',
      headers: { 'X-Backup-Token': token, 'Content-Type': 'application/sql; charset=utf-8' },
      body: sql,
    });
    text = await resp.text();
  } catch (e) {
    return { ok: false, error: 'Nu am putut contacta serverul de backup: ' + (e?.message || e) };
  }
  let parsed = null;
  try { parsed = JSON.parse(text); } catch (e) { /* răspuns non-JSON */ }
  if (!resp.ok || (parsed && parsed.ok === false)) {
    const detail = (parsed && parsed.error) ? parsed.error : (text ? text.slice(0, 400) : '(fără detalii)');
    return { ok: false, error: 'Server backup (HTTP ' + resp.status + '): ' + detail, status: resp.status, server: parsed || text.slice(0, 400) };
  }
  return { ok: true, bytes: sql.length, server: parsed || text.slice(0, 200) };
}

// ── Snapshot JSON + Restaurare (în baza WMS / D1) ──────────────────────────
// Descarcă un snapshot complet (JSON) — formatul potrivit pentru RESTAURARE în WMS.
export async function backupJson(request, env, ctx, user) {
  const ts = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
  const tables = {};
  for (const t of TABLES) {
    try {
      const r = await env.DB.prepare('SELECT * FROM ' + t).all();
      tables[t] = (r && r.results) || [];
    } catch (e) { tables[t] = []; }
  }
  const body = JSON.stringify({ app: 'wms', version: 1, generated: new Date().toISOString(), tables });
  return new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="wms-snapshot-' + ts + '.json"',
      'Cache-Control': 'no-store',
      ...corsHeaders,
    },
  });
}

// Restaurează baza WMS dintr-un snapshot JSON. ATENȚIE: înlocuiește datele curente.
export async function restore(request, env, ctx, user) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: 'Fișier invalid (nu e JSON).' }, 400); }
  const tables = body && body.tables;
  if (!tables || typeof tables !== 'object') return json({ ok: false, error: 'Snapshot invalid (lipsește secțiunea „tables").' }, 400);

  // Golește tabelele (copiii înainte de părinți)
  for (let i = TABLES.length - 1; i >= 0; i--) {
    try { await env.DB.prepare('DELETE FROM ' + TABLES[i]).run(); } catch (e) { /* tabel inexistent */ }
  }

  const summary = {};
  // Inserează (părinții înainte de copii)
  for (const t of TABLES) {
    const rows = Array.isArray(tables[t]) ? tables[t] : [];
    if (!rows.length) { summary[t] = 0; continue; }
    let cols = [];
    try {
      const info = await env.DB.prepare('PRAGMA table_info(' + t + ')').all();
      cols = ((info && info.results) || []).map((c) => c.name);
    } catch (e) {}
    if (!cols.length) { summary[t] = 0; continue; }

    let inserted = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const chunk = rows.slice(i, i + 50);
      const stmts = [];
      for (const row of chunk) {
        if (!row || typeof row !== 'object') continue;
        const use = cols.filter((c) => Object.prototype.hasOwnProperty.call(row, c));
        if (!use.length) continue;
        const ph = use.map(() => '?').join(', ');
        const colSql = use.map((c) => '"' + c + '"').join(', ');
        stmts.push(env.DB.prepare('INSERT INTO ' + t + ' (' + colSql + ') VALUES (' + ph + ')').bind(...use.map((c) => row[c])));
      }
      if (!stmts.length) continue;
      try { await env.DB.batch(stmts); inserted += stmts.length; } catch (e) { /* sar peste chunk-ul cu probleme */ }
    }
    summary[t] = inserted;
  }
  return json({ ok: true, restored: summary });
}

// ── Setări (tabela settings) ───────────────────────────────────────────────
async function getSetting(env, key, def) {
  try {
    const r = await env.DB.prepare('SELECT value FROM settings WHERE key = ?').bind(key).first();
    return (r && r.value !== null && r.value !== undefined) ? r.value : def;
  } catch (e) { return def; }
}
async function setSetting(env, key, value) {
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).bind(key, String(value)).run();
}

// Intervale permise (ore). 0 = oprit.
const ALLOWED_INTERVALS = [0, 1, 6, 12, 24, 168];

// Înregistrează un backup în istoric (păstrează ultimele 200).
async function logBackup(env, kind, r) {
  try {
    const status = (r && r.ok) ? 'ok' : 'fail';
    const bytes = (r && r.bytes) || 0;
    const statements = (r && r.server && r.server.statements) || 0;
    const note = (r && r.ok) ? '' : String((r && r.error) || '').slice(0, 500);
    await env.DB.prepare('INSERT INTO backup_log (kind, status, bytes, statements, note) VALUES (?, ?, ?, ?, ?)')
      .bind(kind, status, bytes, statements, note).run();
    await env.DB.prepare('DELETE FROM backup_log WHERE id NOT IN (SELECT id FROM backup_log ORDER BY id DESC LIMIT 200)').run();
  } catch (e) { /* istoricul e best-effort */ }
}

export async function backupLog(request, env, ctx, user) {
  let results = [];
  try {
    const r = await env.DB.prepare('SELECT id, created_at, kind, status, bytes, statements, note FROM backup_log ORDER BY id DESC LIMIT 50').all();
    results = (r && r.results) || [];
  } catch (e) {}
  return json({ log: results });
}

// Endpoint manual: buton „Trimite backup pe server".
export async function backupPush(request, env, ctx, user) {
  const r = await pushToServer(env);
  await setSetting(env, 'backup_last_run', new Date().toISOString());
  await setSetting(env, 'backup_last_status', r.ok ? 'ok' : 'fail');
  await setSetting(env, 'backup_last_error', r.ok ? '' : (r.error || ''));
  await logBackup(env, 'manual', r);
  if (!r.ok) return json(r, 502);
  return json(r);
}

// Citește setările de backup automat.
export async function backupSettingsGet(request, env, ctx, user) {
  const interval = Number(await getSetting(env, 'backup_interval_hours', '0')) || 0;
  return json({
    interval_hours: interval,
    last_run: await getSetting(env, 'backup_last_run', ''),
    last_status: await getSetting(env, 'backup_last_status', ''),
    last_error: await getSetting(env, 'backup_last_error', ''),
    allowed: ALLOWED_INTERVALS,
  });
}

// Setează intervalul de backup automat.
export async function backupSettingsSet(request, env, ctx, user) {
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const h = Number(body && body.interval_hours);
  if (!ALLOWED_INTERVALS.includes(h)) return json({ ok: false, error: 'Interval invalid.' }, 400);
  await setSetting(env, 'backup_interval_hours', h);
  return json({ ok: true, interval_hours: h });
}

// Rulează backup DOAR când e scadent conform intervalului ales.
// Folosit atât de cron (scheduled) cât și de declanșatorul „leneș" din fetch.
export async function maybeBackup(env, kind) {
  const hours = Number(await getSetting(env, 'backup_interval_hours', '0')) || 0;
  if (hours <= 0) return { ok: true, skipped: 'oprit' };
  const last = await getSetting(env, 'backup_last_run', '');
  const now = Date.now();
  if (last) {
    const lastMs = Date.parse(last);
    if (Number.isFinite(lastMs) && (now - lastMs) < (hours * 3600 * 1000 - 60000)) {
      return { ok: true, skipped: 'nescadent' };
    }
  }
  // „Prindem" slotul imediat (setăm last_run înainte de trimitere) ca să nu se
  // declanșeze de două ori din cereri concurente.
  await setSetting(env, 'backup_last_run', new Date().toISOString());
  const r = await pushToServer(env);
  await setSetting(env, 'backup_last_status', r.ok ? 'ok' : 'fail');
  await setSetting(env, 'backup_last_error', r.ok ? '' : (r.error || ''));
  await logBackup(env, kind || 'auto', r);
  return r;
}

// Apelat din cron (scheduled).
export async function scheduledBackup(env) {
  try { return await maybeBackup(env, 'auto'); } catch (e) { return { ok: false, error: String(e) }; }
}

// Endpoint pentru programator EXTERN (ex. Cron Job din cPanel pe serverul tău).
// Public, dar protejat cu cheie (?key=... sau header X-Cron-Key). Rulează la oră fixă,
// independent de conectarea utilizatorului. Cu ?force=1 face backup indiferent de interval.
export async function cronRun(request, env) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || request.headers.get('x-cron-key') || '';
  const expected = env.CRON_KEY || env.BACKUP_TOKEN || BACKUP_TOKEN_DEFAULT;
  if (!expected || key !== expected) return json({ ok: false, error: 'Cheie invalidă' }, 403);
  const force = url.searchParams.get('force') === '1';
  let r;
  if (force) {
    r = await pushToServer(env);
    await setSetting(env, 'backup_last_run', new Date().toISOString());
    await setSetting(env, 'backup_last_status', r.ok ? 'ok' : 'fail');
    await setSetting(env, 'backup_last_error', r.ok ? '' : (r.error || ''));
    await logBackup(env, 'auto', r);
  } else {
    r = await maybeBackup(env, 'auto');
  }
  return json(r);
}
