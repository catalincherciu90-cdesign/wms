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

// ---- Editor de etichetă: șabloane configurabile din admin ----
export const LBL_FONT = { sm: 24, md: 32, lg: 46, xl: 62 };
export const LBL_BC = { sm: 90, md: 150, lg: 210 };
const LBL_ALIGN = { L: 'L', C: 'C', R: 'R' };

// Câmpurile disponibile pe fiecare tip de etichetă (value, label, poate-fi-cod-de-bare).
export function labelFields(type) {
  if (type === 'pallet') return [
    ['kind', 'Tip (PALET/COLET)', 0], ['code', 'Cod palet', 1], ['client', 'Client', 0],
    ['location', 'Locatie', 0], ['lot', 'Lot', 0], ['aviz', 'Aviz', 0], ['date', 'Data si ora', 0],
    ['items', 'Lista produse', 0], ['fixed', 'Text fix', 0],
  ];
  if (type === 'box') return [
    ['box_code', 'Cod cutie', 1], ['product_barcode', 'Cod produs', 1], ['product_name', 'Nume produs', 0],
    ['lot', 'Lot', 0], ['qty', 'Buc/cutie', 0], ['date', 'Data si ora', 0], ['meta', 'Lot + data', 0], ['fixed', 'Text fix', 0],
  ];
  return [ // product
    ['title', 'Nume produs', 0], ['code', 'Cod produs', 1], ['lot', 'Lot', 0],
    ['date', 'Data si ora', 0], ['meta', 'Lot + data', 0], ['fixed', 'Text fix', 0],
  ];
}
const BARCODE_FIELDS = { code: 1, box_code: 1, product_barcode: 1 };

export function defaultTemplate(type) {
  const dim = { width_mm: 100, height_mm: 150, valign: 'center' };
  if (type === 'pallet') return { ...dim, elements: [
    { field: 'kind', render: 'text', size: 'lg', align: 'C' },
    { field: 'code', render: 'text', size: 'md', align: 'C' },
    { field: 'code', render: 'barcode', size: 'md', align: 'C' },
    { field: 'client', render: 'text', size: 'sm', align: 'C' },
    { field: 'lot', render: 'text', size: 'sm', align: 'C' },
    { field: 'date', render: 'text', size: 'sm', align: 'C' },
  ] };
  if (type === 'box') return { ...dim, elements: [
    { field: 'box_code', render: 'barcode', size: 'md', align: 'C' },
    { field: 'product_name', render: 'text', size: 'md', align: 'C' },
    { field: 'product_barcode', render: 'barcode', size: 'md', align: 'C' },
    { field: 'meta', render: 'text', size: 'sm', align: 'C' },
  ] };
  return { ...dim, elements: [ // product
    { field: 'title', render: 'text', size: 'lg', align: 'C' },
    { field: 'code', render: 'barcode', size: 'lg', align: 'C' },
    { field: 'meta', render: 'text', size: 'sm', align: 'C' },
  ] };
}

export async function getTemplate(env, type) {
  try {
    const r = await env.DB.prepare("SELECT value FROM settings WHERE key = ?").bind('label_tpl_' + type).first();
    if (r?.value) {
      const t = JSON.parse(r.value);
      if (t && Array.isArray(t.elements)) {
        // completează dimensiunile lipsă (șabloane vechi salvate fără mm/valign)
        if (!t.width_mm) t.width_mm = 100;
        if (!t.height_mm) t.height_mm = 150;
        if (!['top', 'center', 'spread'].includes(t.valign)) t.valign = 'center';
        return t;
      }
    }
  } catch (e) {}
  return defaultTemplate(type);
}

// Valorile câmpurilor pentru un job (după tip). DT = {{DT}} (ora locală, pusă de agent).
async function labelValues(env, job) {
  const DT = '{{DT}}';
  if (job.type === 'product') {
    return { title: job.title || '', code: job.code || '', lot: job.lot || '', date: DT,
      meta: (job.lot ? ('Lot: ' + job.lot + '   ') : '') + DT };
  }
  if (job.type === 'box') {
    const b = await env.DB.prepare('SELECT bx.code, bx.quantity, bx.lot, pr.name AS product_name, COALESCE(pr.barcode, pr.sku) AS product_barcode FROM boxes bx JOIN products pr ON pr.id = bx.product_id WHERE bx.id = ?').bind(job.ref_id).first() || {};
    return { box_code: b.code || job.code || '', product_barcode: b.product_barcode || '', product_name: b.product_name || job.title || '',
      lot: b.lot || '', qty: b.quantity != null ? String(b.quantity) : '', date: DT,
      meta: (b.lot ? ('Lot: ' + b.lot + '   ') : '') + (b.quantity ? ('Buc/cutie: ' + b.quantity + '   ') : '') + DT };
  }
  // pallet / colet / ambalaje
  const pallet = await env.DB.prepare('SELECT pa.*, c.name AS client_name, l.code AS location_code FROM pallets pa LEFT JOIN clients c ON c.id = pa.client_id LEFT JOIN locations l ON l.id = pa.location_id WHERE pa.id = ?').bind(job.ref_id).first() || {};
  const { results: items } = await env.DB.prepare('SELECT pi.quantity, pr.name AS product_name FROM pallet_items pi JOIN products pr ON pr.id = pi.product_id WHERE pi.pallet_id = ? ORDER BY pr.name').bind(pallet.id || 0).all();
  const kind = pallet.kind === 'colet' ? 'COLET' : (pallet.kind === 'ambalaje' ? 'PALET AMBALAJE' : 'PALET');
  const itemsTxt = (items || []).slice(0, 8).map((it) => it.product_name + '  ' + it.quantity).join('\\&');
  return { kind, code: pallet.code || job.code || '', client: pallet.client_name || '', location: pallet.location_code || '',
    lot: pallet.lot || '', aviz: pallet.aviz || '', date: DT, items: itemsTxt };
}

const mmToDots = (mm) => Math.round((Number(mm) || 0) / 25.4 * 300); // 300 dpi (ZT411)

// Construiește ZPL dintr-un șablon, folosind dimensiunea fizică a etichetei (mm)
// și alinierea pe verticală (sus / centru / distribuit), ca să iasă exact ca în preview.
async function jobToZpl(env, job, wFallback) {
  const DT = '{{DT}}';
  if (job.type === 'test') {
    const w0 = wFallback > 0 ? wFallback : 1200;
    return '^XA^CI28^PW' + w0
      + '^FO0,50^FB' + w0 + ',1,0,C,0^A0N,50,50^FDTEST PRINT^FS'
      + '^FO0,150^FB' + w0 + ',1,0,C,0^BY3^BCN,160,Y,N,N^FDTEST-OK^FS'
      + '^FO0,360^FB' + w0 + ',1,0,C,0^A0N,26,26^FD' + DT + '^FS'
      + '^XZ';
  }
  const tpl = await getTemplate(env, job.type === 'inbound' || job.type === 'outbound' ? 'pallet' : job.type);
  const vals = await labelValues(env, job);
  const w = tpl.width_mm ? mmToDots(tpl.width_mm) : (wFallback > 0 ? wFallback : 1181);
  const h = tpl.height_mm ? mmToDots(tpl.height_mm) : 0; // 0 = lasă imprimanta să folosească lungimea calibrată
  const valign = ['top', 'center', 'spread'].includes(tpl.valign) ? tpl.valign : 'top';

  // 1) rezolvă elementele vizibile + înălțimea fiecărui bloc
  const blocks = [];
  for (const e of (tpl.elements || [])) {
    const align = LBL_ALIGN[e.align] || 'C';
    const isBc = e.render === 'barcode' && BARCODE_FIELDS[e.field];
    const val = e.field === 'fixed' ? (e.text || '') : (vals[e.field] != null ? vals[e.field] : '');
    if (val === '' && e.field !== 'fixed') continue;
    if (isBc) {
      const bh = LBL_BC[e.size] || LBL_BC.md;
      blocks.push({ isBc: true, align, val, bh, h: bh + 30 /* + HRI */, gap: 20 });
    } else {
      const fh = LBL_FONT[e.size] || LBL_FONT.md;
      const lines = e.field === 'items' ? Math.min(8, String(val).split('\\&').length || 1) : 1;
      blocks.push({ isBc: false, align, val, fh, maxLines: e.field === 'items' ? 8 : 2, h: fh * lines, gap: 12 });
    }
  }
  const contentH = blocks.reduce((a, b, i) => a + b.h + (i < blocks.length - 1 ? b.gap : 0), 0);

  // 2) poziția de start + spațiul suplimentar între blocuri (pentru „distribuit")
  const pad = 24;
  let y = pad, extra = 0;
  if (h > 0) {
    if (valign === 'center') y = Math.max(pad, Math.round((h - contentH) / 2));
    else if (valign === 'spread' && blocks.length > 1) extra = Math.max(0, Math.round((h - contentH - 2 * pad) / (blocks.length - 1)));
  }

  // 3) generează ZPL
  let s = '^XA^CI28^PW' + w + (h > 0 ? ('^LL' + h) : '');
  blocks.forEach((b, i) => {
    if (b.isBc) {
      s += '^FO0,' + y + '^FB' + w + ',1,0,' + b.align + ',0^BY3^BCN,' + b.bh + ',Y,N,N^FD' + zplEsc(b.val) + '^FS';
    } else {
      s += '^FO0,' + y + '^FB' + w + ',' + b.maxLines + ',4,' + b.align + ',0^A0N,' + b.fh + ',' + b.fh + '^FD' + zplEsc(b.val) + '^FS';
    }
    y += b.h + b.gap + extra;
  });
  s += '^XZ';
  return s;
}

// Admin: citește / salvează șablonul de etichetă pentru un tip.
export async function labelTemplateGet(request, env) {
  const url = new URL(request.url);
  const type = ['product', 'pallet', 'box'].includes(url.searchParams.get('type')) ? url.searchParams.get('type') : 'product';
  return json({ type, template: await getTemplate(env, type), fields: labelFields(type) });
}
export async function labelTemplateSave(request, env) {
  const b = await readJson(request);
  const type = ['product', 'pallet', 'box'].includes(b?.type) ? b.type : null;
  if (!type) return error('Tip invalid (product/pallet/box)', 400);
  const els = Array.isArray(b?.template?.elements) ? b.template.elements.slice(0, 20).map((e) => ({
    field: String(e.field || '').slice(0, 30),
    render: e.render === 'barcode' ? 'barcode' : 'text',
    size: ['sm', 'md', 'lg', 'xl'].includes(e.size) ? e.size : 'md',
    align: ['L', 'C', 'R'].includes(e.align) ? e.align : 'C',
    text: e.field === 'fixed' ? String(e.text || '').slice(0, 60) : undefined,
  })) : [];
  const width_mm = Math.max(20, Math.min(300, Number(b?.template?.width_mm) || 100));
  const height_mm = Math.max(20, Math.min(400, Number(b?.template?.height_mm) || 150));
  const valign = ['top', 'center', 'spread'].includes(b?.template?.valign) ? b.template.valign : 'center';
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind('label_tpl_' + type, JSON.stringify({ width_mm, height_mm, valign, elements: els })).run();
  return json({ ok: true });
}
export async function labelTemplateReset(request, env) {
  const b = await readJson(request);
  const type = ['product', 'pallet', 'box'].includes(b?.type) ? b.type : null;
  if (!type) return error('Tip invalid', 400);
  await env.DB.prepare("DELETE FROM settings WHERE key = ?").bind('label_tpl_' + type).run();
  return json({ ok: true, template: defaultTemplate(type) });
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
