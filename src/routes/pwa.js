// PWA: manifest, service worker și iconițe — ca aplicația să fie instalabilă pe Android
// (bază pentru generarea unui APK prin PWABuilder / Bubblewrap / Capacitor).
import { corsHeaders } from '../lib/http.js';
import { ICON_512, ICON_192 } from '../icons.js';

const MANIFEST = {
  name: 'WMS — Gestiune Depozit',
  short_name: 'WMS',
  description: 'Gestiune depozit: recepție, expediere, transfer, scanare coduri de bare.',
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

// Service worker: pornire offline a shell-ului; API-ul merge mereu la rețea.
const SW = `
const CACHE = 'wms-shell-v1';
const SHELL = ['/', '/vendor/zxing.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return; // API: mereu rețea
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/')));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((resp) => {
    const copy = resp.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
    return resp;
  }).catch(() => r)));
});
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
