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

  for (const t of TABLES) {
    let info;
    try {
      info = await env.DB.prepare('PRAGMA table_info(' + t + ')').all();
    } catch (e) { continue; }
    const cols = (info && info.results) || [];
    if (!cols.length) continue;

    out += '-- ------------------------------------------------------\n';
    out += '-- Tabel: ' + t + '\n';
    out += 'DROP TABLE IF EXISTS `' + t + '`;\n';

    const defs = cols.map((c) => {
      let d = '`' + c.name + '` ' + mysqlType(c.type);
      if (c.pk && /INT/i.test(c.type || '')) d += ' AUTO_INCREMENT';
      if (c.notnull && !c.pk) d += ' NOT NULL';
      return d;
    });
    const pks = cols.filter((c) => c.pk).map((c) => '`' + c.name + '`');
    let create = 'CREATE TABLE `' + t + '` (\n  ' + defs.join(',\n  ');
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
        out += 'INSERT INTO `' + t + '` (' + colList + ') VALUES\n  ' + values + ';\n';
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

// Endpoint manual: buton „Trimite backup pe server".
export async function backupPush(request, env, ctx, user) {
  const r = await pushToServer(env);
  if (!r.ok) return json(r, 502);
  return json(r);
}

// Apelat din cron (scheduled) — backup automat.
export async function scheduledBackup(env) {
  try { return await pushToServer(env); } catch (e) { return { ok: false, error: String(e) }; }
}
