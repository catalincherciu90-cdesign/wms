// PWA: manifest, service worker și iconițe — ca aplicația să fie instalabilă pe Android
// (bază pentru generarea unui APK prin PWABuilder / Bubblewrap / Capacitor).
import { corsHeaders } from '../lib/http.js';
import { ICON_512, ICON_192 } from '../icons.js';
import qrcode from 'qrcode-generator';

const MANIFEST = {
  name: 'WSD Logistics — WMS',
  short_name: 'WSD WMS',
  description: 'Gestiune depozit: recepție, expediere, transfer, scanare coduri de bare (Zebra).',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  background_color: '#ffffff',
  theme_color: '#2f6df6',
  lang: 'ro',
  categories: ['business', 'productivity'],
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

// Service worker: NU cache-uiește aplicația (ca să nu servească niciodată o versiune veche).
// La activare șterge tot cache-ul vechi. Toate cererile merg direct la rețea.
const SW = `
self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// Fără handler de 'fetch' care să răspundă din cache: browserul ia mereu de la rețea.
`;

function bin(b64, type) {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new Response(bytes, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=604800', ...corsHeaders } });
}

export function manifest() {
  return new Response(JSON.stringify(MANIFEST), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600', ...corsHeaders },
  });
}
export function sw() {
  return new Response(SW, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Service-Worker-Allowed': '/', ...corsHeaders },
  });
}
export function icon192() { return bin(ICON_192, 'image/png'); }
export function icon512() { return bin(ICON_512, 'image/png'); }

function qrSvg(data) {
  const qr = qrcode(0, 'M');
  qr.addData(data);
  qr.make();
  return qr.createSvgTag({ cellSize: 7, margin: 2, scalable: true });
}

// Pagină publică de instalare: QR de scanat cu Zebra pentru a descărca/deschide aplicația.
export function installPage(env, url) {
  const appUrl = url.origin;
  const apkUrl = env.APK_URL || '';          // link direct către APK (dacă e configurat)
  const target = apkUrl || appUrl;           // QR-ul principal
  const hasApk = !!apkUrl;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const html = `<!doctype html><html lang="ro"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Instalează aplicația — WSD Logistics WMS</title>
<style>
  :root{--brand:#2f6df6;--brand2:#1e51d6;--text:#1a2233;--muted:#6b7688;--border:#e3e8f0;--bg:#f4f6fb}
  *{box-sizing:border-box}
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:var(--bg);color:var(--text);min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid var(--border);border-radius:20px;box-shadow:0 10px 40px -12px rgba(20,30,60,.25);max-width:460px;width:100%;padding:32px;text-align:center}
  img.logo{height:46px;margin-bottom:6px}
  h1{font-size:22px;margin:10px 0 4px}
  .sub{color:var(--muted);font-size:14px;margin:0 0 22px}
  .qr{background:#fff;border:1px solid var(--border);border-radius:16px;padding:14px;width:260px;height:260px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center}
  .qr svg{width:100%;height:100%}
  .badge{display:inline-block;background:rgba(47,109,246,.1);color:var(--brand);font-weight:700;font-size:12px;padding:5px 12px;border-radius:999px;margin-bottom:8px}
  .urlbox{font-size:12.5px;color:var(--muted);word-break:break-all;background:var(--bg);border-radius:10px;padding:8px 12px;margin:10px 0 18px}
  .btn{display:block;background:var(--brand);color:#fff;text-decoration:none;font-weight:700;padding:13px;border-radius:12px;margin-top:8px}
  .btn.ghost{background:#fff;color:var(--text);border:1px solid var(--border)}
  ol{text-align:left;font-size:13.5px;color:var(--muted);line-height:1.7;margin:18px 0 0;padding-left:20px}
  ol b{color:var(--text)}
</style></head>
<body>
  <div class="card">
    <img class="logo" src="/assets/logo.png" alt="WSD Logistics">
    <div class="badge">${hasApk ? 'Descarcă aplicația' : 'Deschide aplicația'}</div>
    <h1>Instalează WMS pe Zebra</h1>
    <p class="sub">Scanează codul QR cu terminalul Zebra${hasApk ? ' pentru a descărca aplicația (APK)' : ''}.</p>
    <div class="qr">${qrSvg(target)}</div>
    <div class="urlbox">${esc(target)}</div>
    ${hasApk
      ? `<a class="btn" href="${esc(apkUrl)}">⬇ Descarcă APK</a><a class="btn ghost" href="${esc(appUrl)}">Deschide în browser</a>`
      : `<a class="btn" href="${esc(appUrl)}">Deschide aplicația</a>`}
    <ol>
      ${hasApk
        ? '<li>Scanează QR-ul cu Zebra → se descarcă <b>APK-ul</b>.</li><li>Deschide fișierul și apasă <b>Instalează</b> (permite „surse necunoscute").</li><li>Deschide aplicația și autentifică-te.</li>'
        : '<li>Scanează QR-ul cu Zebra → se deschide aplicația.</li><li>Din meniul Chrome apasă <b>„Instalează aplicația" / „Adaugă pe ecranul principal"</b>.</li><li>Deschide aplicația de pe ecranul principal și autentifică-te.</li>'}
    </ol>
  </div>
</body></html>`;

  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders } });
}
