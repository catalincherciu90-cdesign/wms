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

/* ================= Agent local ZPL (imprimare directă în Zebra, fără browser) =================
   Un mic program rulează pe PC-ul cu imprimanta, ia job-urile din coadă și le trimite direct în
   limbaj Zebra (ZPL) prin spooler-ul Windows. Serverul generează ZPL-ul; agentul doar îl trimite.
   Agentul se autentifică cu un token (settings.print_agent_token), nu cu JWT. */

function zplEsc(s) { return String(s == null ? '' : s).replace(/[\^~]/g, ' '); }

// Construiește ZPL pentru un job (produs / palet-colet / test). {{DT}} = data/ora, pusă de agent (ora locală).
async function jobToZpl(env, job, w) {
  w = w > 0 ? w : 1200;
  const DT = '{{DT}}';
  // Centrat pe toată lățimea etichetei (^FB ... ,C) — ca eticheta din browser.
  const C = (y, h, txt) => '^FO0,' + y + '^FB' + w + ',2,4,C,0^A0N,' + h + ',' + h + '^FD' + txt + '^FS';
  const Cbc = (y, hgt, code) => '^FO0,' + y + '^FB' + w + ',1,0,C,0^BY3^BCN,' + hgt + ',Y,N,N^FD' + code + '^FS';
  const Csmall = (y, txt) => '^FO0,' + y + '^FB' + w + ',1,0,C,0^A0N,26,26^FD' + txt + '^FS';

  if (job.type === 'test') {
    return '^XA^CI28^PW' + w
      + C(50, 50, 'TEST PRINT')
      + Cbc(150, 160, 'TEST-OK')
      + Csmall(360, DT)
      + '^XZ';
  }
  if (job.type === 'product') {
    const meta = (job.lot ? ('Lot: ' + zplEsc(job.lot) + '   ') : '') + DT;
    return '^XA^CI28^PW' + w
      + C(35, 46, zplEsc(job.title))       // nume produs (mare, centrat, până la 2 rânduri)
      + Cbc(185, 170, zplEsc(job.code))     // cod de bare centrat + numărul dedesubt
      + Csmall(410, meta)                   // lot + data/ora (mic, jos)
      + '^XZ';
  }
  // palet / colet / ambalaje
  const pallet = await env.DB.prepare(
    'SELECT pa.*, c.name AS client_name, l.code AS location_code FROM pallets pa LEFT JOIN clients c ON c.id = pa.client_id LEFT JOIN locations l ON l.id = pa.location_id WHERE pa.id = ?'
  ).bind(job.ref_id).first();
  if (!pallet) {
    return '^XA^CI28^PW' + w + C(35, 44, zplEsc(job.code)) + Cbc(120, 160, zplEsc(job.code)) + '^XZ';
  }
  const { results: items } = await env.DB.prepare(
    'SELECT pi.quantity, pr.name AS product_name, pr.sku FROM pallet_items pi JOIN products pr ON pr.id = pi.product_id WHERE pi.pallet_id = ? ORDER BY pr.name'
  ).bind(pallet.id).all();
  const kind = pallet.kind === 'colet' ? 'COLET' : (pallet.kind === 'ambalaje' ? 'PALET AMBALAJE' : 'PALET');
  let s = '^XA^CI28^PW' + w;
  s += C(25, 44, kind);
  s += C(80, 40, zplEsc(pallet.code));
  s += Cbc(135, 150, zplEsc(pallet.code));
  let y = 330;
  const metaLines = [];
  if (pallet.client_name) metaLines.push('Client: ' + zplEsc(pallet.client_name));
  if (pallet.location_code) metaLines.push('Locatie: ' + zplEsc(pallet.location_code));
  if (pallet.lot) metaLines.push('Lot: ' + zplEsc(pallet.lot));
  if (pallet.aviz) metaLines.push('Aviz: ' + zplEsc(pallet.aviz));
  metaLines.push('Data: ' + DT);
  for (const t of metaLines) { s += '^FO30,' + y + '^A0N,28,28^FD' + t + '^FS'; y += 34; }
  y += 6;
  for (const it of items.slice(0, 12)) { s += '^FO30,' + y + '^A0N,26,26^FB' + (w - 60) + ',1,0,L^FD' + zplEsc(it.product_name) + '  ' + it.quantity + '^FS'; y += 32; }
  s += '^XZ';
  return s;
}

async function getAgentToken(env, create) {
  let t = (await env.DB.prepare("SELECT value FROM settings WHERE key='print_agent_token'").first())?.value || null;
  if (!t && create) {
    t = crypto.randomUUID().replace(/-/g, '');
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('print_agent_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(t).run();
  }
  return t;
}

// Admin: obține (creează dacă lipsește) token-ul agentului.
export async function agentToken(request, env) {
  return json({ token: await getAgentToken(env, true) });
}
// Admin: regenerează token-ul (invalidează agenții vechi).
export async function agentTokenRegen(request, env) {
  const t = crypto.randomUUID().replace(/-/g, '');
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('print_agent_token', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(t).run();
  return json({ token: t });
}

// Agentul cere următorul job (ca ZPL). Autentificat prin token.
export async function agentNext(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const real = await getAgentToken(env, false);
  if (!real || token !== real) return error('Token invalid', 403);
  const w = Number(url.searchParams.get('w')) || 1200;
  try {
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('print_station_last', datetime('now')) ON CONFLICT(key) DO UPDATE SET value = datetime('now')").run();
    await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('print_station_name', 'Agent ZPL') ON CONFLICT(key) DO UPDATE SET value = excluded.value").run();
  } catch (e) {}
  const job = await env.DB.prepare("SELECT id, type, ref_id, code, title, lot FROM print_jobs WHERE status='pending' ORDER BY id ASC LIMIT 1").first();
  if (!job) return json({ none: true });
  const zpl = await jobToZpl(env, job, w);
  return json({ id: job.id, zpl });
}
// Agentul confirmă că a printat un job.
export async function agentDone(request, env) {
  const b = await readJson(request);
  const real = await getAgentToken(env, false);
  if (!real || b?.token !== real) return error('Token invalid', 403);
  await env.DB.prepare("UPDATE print_jobs SET status='printed', printed_at=datetime('now') WHERE id=?").bind(Number(b.id)).run();
  return json({ ok: true });
}

// base64 din UTF-16LE (pentru powershell -EncodedCommand)
function toB64Utf16le(s) {
  let bin = '';
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); bin += String.fromCharCode(c & 0xff) + String.fromCharCode((c >> 8) & 0xff); }
  return btoa(bin);
}

// Scriptul PowerShell al agentului (doar ASCII — diacriticele din etichete vin din ZPL/UTF-8 la runtime).
function buildAgentPs(base, token, printer, w) {
  return [
    "$ErrorActionPreference='SilentlyContinue'",
    "$base='" + base + "'",
    "$token='" + token + "'",
    "$printer='" + printer.replace(/'/g, "''") + "'",
    "$w=" + w,
    'Add-Type @"',
    'using System;using System.Runtime.InteropServices;',
    'public class RawPrinter{',
    '[StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)] public struct DOCINFO{[MarshalAs(UnmanagedType.LPWStr)]public string pDocName;[MarshalAs(UnmanagedType.LPWStr)]public string pOutputFile;[MarshalAs(UnmanagedType.LPWStr)]public string pDataType;}',
    '[DllImport("winspool.Drv",EntryPoint="OpenPrinterW",SetLastError=true,CharSet=CharSet.Unicode)] public static extern bool OpenPrinter(string s,out IntPtr h,IntPtr p);',
    '[DllImport("winspool.Drv",EntryPoint="ClosePrinter",SetLastError=true)] public static extern bool ClosePrinter(IntPtr h);',
    '[DllImport("winspool.Drv",EntryPoint="StartDocPrinterW",SetLastError=true,CharSet=CharSet.Unicode)] public static extern bool StartDocPrinter(IntPtr h,int l,ref DOCINFO d);',
    '[DllImport("winspool.Drv",EntryPoint="EndDocPrinter",SetLastError=true)] public static extern bool EndDocPrinter(IntPtr h);',
    '[DllImport("winspool.Drv",EntryPoint="StartPagePrinter",SetLastError=true)] public static extern bool StartPagePrinter(IntPtr h);',
    '[DllImport("winspool.Drv",EntryPoint="EndPagePrinter",SetLastError=true)] public static extern bool EndPagePrinter(IntPtr h);',
    '[DllImport("winspool.Drv",EntryPoint="WritePrinter",SetLastError=true)] public static extern bool WritePrinter(IntPtr h,byte[] b,int c,out int w);',
    'public static bool Send(string name,byte[] bytes){IntPtr h;var di=new DOCINFO();di.pDocName="WMS ZPL";di.pDataType="RAW";if(!OpenPrinter(name,out h,IntPtr.Zero))return false;bool ok=false;if(StartDocPrinter(h,1,ref di)){if(StartPagePrinter(h)){int wr;ok=WritePrinter(h,bytes,bytes.Length,out wr);EndPagePrinter(h);}EndDocPrinter(h);}ClosePrinter(h);return ok;}',
    '}',
    '"@',
    'Write-Host ("Agent print WMS pornit. Imprimanta: " + $printer)',
    'Write-Host "Lasa aceasta fereastra deschisa. Inchide-o ca sa opresti agentul."',
    'while($true){',
    '  try{',
    '    $r=Invoke-RestMethod -Uri "$base/api/print/agent/next?token=$token&w=$w" -TimeoutSec 20',
    '    if($r.none){ Start-Sleep -Seconds 2; continue }',
    "    $zpl=$r.zpl -replace '\\{\\{DT\\}\\}',(Get-Date -Format 'dd.MM.yyyy HH:mm')",
    '    $bytes=[System.Text.Encoding]::UTF8.GetBytes($zpl)',
    '    $sent=[RawPrinter]::Send($printer,$bytes)',
    '    if($sent){',
    "      Invoke-RestMethod -Uri \"$base/api/print/agent/done\" -Method Post -Body (@{token=$token;id=$r.id}|ConvertTo-Json) -ContentType 'application/json' | Out-Null",
    '      Write-Host ("Printat #" + $r.id)',
    '    } else { Write-Host ("EROARE: nu am putut trimite la " + $printer + " (verifica numele imprimantei)") }',
    '  } catch { Start-Sleep -Seconds 3 }',
    '  Start-Sleep -Milliseconds 500',
    '}',
  ].join('\n');
}

// Descarcă agentul ca .bat (rulează PowerShell fără restricții, cu scriptul inclus base64).
export async function agentBat(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token') || '';
  const real = await getAgentToken(env, false);
  if (!real || token !== real) return new Response('Token invalid', { status: 403 });
  const printer = (url.searchParams.get('printer') || 'ZDesigner ZT411-300dpi').slice(0, 120);
  const w = Number(url.searchParams.get('w')) || 1200;
  const ps = buildAgentPs(url.origin, token, printer, w);
  const b64 = toB64Utf16le(ps);
  const bat = '@echo off\r\ntitle Agent print WMS\r\npowershell -NoProfile -ExecutionPolicy Bypass -EncodedCommand ' + b64 + '\r\npause\r\n';
  return new Response(bat, { headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment; filename="agent-print-wms.bat"',
    'Cache-Control': 'no-store',
  } });
}
