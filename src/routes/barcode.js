// Identificare produs după codul de bare, din mai multe surse:
// 1) memorie proprie (cache intern + produse existente)
// 2) cărți (ISBN 978/979 -> Google Books / Open Library)
// 3) UPCitemdb (retail general)
// 4) familia Open*Facts (food / beauty / products / pet food)
// Interogare server-side (Worker) ca să evităm CORS.
import { json, error } from '../lib/http.js';

let cacheReady = false;
async function ensureCache(env) {
  if (cacheReady) return;
  await env.DB.prepare(
    "CREATE TABLE IF NOT EXISTS barcode_cache (code TEXT PRIMARY KEY, name TEXT, brand TEXT, category TEXT, source TEXT, created_at TEXT DEFAULT (datetime('now')))"
  ).run();
  cacheReady = true;
}

export async function lookup(request, env) {
  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').trim();
  if (!code) return error('Parametrul code e obligatoriu', 400);
  if (!/^[0-9]{6,14}$/.test(code)) return error('Cod de bare invalid (se așteaptă 6-14 cifre)', 400);

  // 1a) memorie proprie — cache intern
  try {
    await ensureCache(env);
    const c = await env.DB.prepare('SELECT name, brand, category, source FROM barcode_cache WHERE code = ?').bind(code).first();
    if (c && c.name) return json({ found: true, name: c.name, brand: c.brand, category: c.category, source: 'memorie' });
  } catch (e) { /* fără cache */ }

  // 1b) produs deja existent în catalog (cu acest cod de bare)
  try {
    const p = await env.DB.prepare('SELECT name, category FROM products WHERE barcode = ? AND active = 1').bind(code).first();
    if (p && p.name) return json({ found: true, name: p.name, brand: null, category: p.category, source: 'produs existent' });
  } catch (e) { /* nimic */ }

  let result = null;
  if (/^97[89]/.test(code)) result = await lookupBook(code);   // 2) cărți
  if (!result) result = await lookupUpcItemDb(code);            // 3) retail general
  if (!result) result = await lookupOpenFacts(code);           // 4) Open*Facts

  if (result) {
    try {
      await env.DB.prepare('INSERT OR REPLACE INTO barcode_cache (code, name, brand, category, source) VALUES (?, ?, ?, ?, ?)')
        .bind(code, result.name, result.brand || null, result.category || null, result.source).run();
    } catch (e) { /* cache best-effort */ }
    return json({ found: true, name: result.name, brand: result.brand || null, category: result.category || null, source: result.source });
  }
  return json({ found: false });
}

// ── Cărți: Google Books, apoi Open Library ──────────────────────────────
async function lookupBook(code) {
  try {
    const r = await fetchJson('https://www.googleapis.com/books/v1/volumes?q=isbn:' + encodeURIComponent(code));
    if (r && r.totalItems > 0 && r.items && r.items[0].volumeInfo) {
      const v = r.items[0].volumeInfo;
      return {
        name: v.title + (v.subtitle ? (': ' + v.subtitle) : ''),
        brand: (v.authors || []).join(', ') || null,
        category: (v.categories || [])[0] || 'Carte',
        source: 'Google Books',
      };
    }
  } catch (e) { /* fallback */ }
  try {
    const r = await fetchJson('https://openlibrary.org/api/books?bibkeys=ISBN:' + encodeURIComponent(code) + '&format=json&jscmd=data');
    const b = r && r['ISBN:' + code];
    if (b && b.title) {
      return { name: b.title, brand: (b.authors || []).map((a) => a.name).join(', ') || null, category: 'Carte', source: 'Open Library' };
    }
  } catch (e) { /* nimic */ }
  return null;
}

// ── UPCitemdb (trial gratuit, fără cheie) ───────────────────────────────
async function lookupUpcItemDb(code) {
  try {
    const r = await fetchJson('https://api.upcitemdb.com/prod/trial/lookup?upc=' + encodeURIComponent(code));
    if (r && Array.isArray(r.items) && r.items.length && r.items[0].title) {
      const it = r.items[0];
      return { name: it.title, brand: it.brand || null, category: firstCategory(it.category), source: 'upcitemdb' };
    }
  } catch (e) { /* nimic */ }
  return null;
}

// ── Familia Open*Facts (food / beauty / products / pet food) ────────────
async function lookupOpenFacts(code) {
  const hosts = [
    ['world.openfoodfacts.org', 'aliment'],
    ['world.openbeautyfacts.org', 'cosmetic'],
    ['world.openproductsfacts.org', 'produs'],
    ['world.openpetfoodfacts.org', 'hrană animale'],
  ];
  for (const [host, label] of hosts) {
    try {
      const r = await fetchJson('https://' + host + '/api/v2/product/' + encodeURIComponent(code) + '.json?fields=product_name,brands,categories');
      if (r && r.product && r.product.product_name) {
        return {
          name: r.product.product_name,
          brand: r.product.brands || null,
          category: firstCategory(r.product.categories) || label,
          source: host.replace('world.', '').replace('.org', ''),
        };
      }
    } catch (e) { /* următoarea sursă */ }
  }
  return null;
}

function firstCategory(cat) {
  if (!cat) return null;
  return String(cat).split(/[,>]/)[0].trim() || null;
}

async function fetchJson(u) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 6000);
  try {
    const res = await fetch(u, {
      headers: { 'User-Agent': 'WMS-App/1.0 (warehouse management system)', 'Accept': 'application/json' },
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
