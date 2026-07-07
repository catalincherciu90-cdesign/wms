// Identificare produs după codul de bare, din baze de date publice (gratuite, fără cheie).
// Se interoghează pe server (Worker) ca să evităm CORS din browser.
import { json, error } from '../lib/http.js';

export async function lookup(request, env) {
  const url = new URL(request.url);
  const code = (url.searchParams.get('code') || '').trim();
  if (!code) return error('Parametrul code e obligatoriu', 400);
  if (!/^[0-9]{6,14}$/.test(code)) return error('Cod de bare invalid (se așteaptă 6-14 cifre)', 400);

  // 1) UPCitemdb (trial gratuit, fără cheie) — retail general
  try {
    const r = await fetchJson('https://api.upcitemdb.com/prod/trial/lookup?upc=' + encodeURIComponent(code));
    if (r && Array.isArray(r.items) && r.items.length) {
      const it = r.items[0];
      if (it.title) {
        return json({
          found: true,
          name: it.title,
          brand: it.brand || null,
          category: firstCategory(it.category),
          source: 'upcitemdb',
        });
      }
    }
  } catch (e) { /* trecem la următoarea sursă */ }

  // 2) Open Food Facts — produse alimentare
  try {
    const r = await fetchJson('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json?fields=product_name,brands,categories');
    if (r && r.product && r.product.product_name) {
      return json({
        found: true,
        name: r.product.product_name,
        brand: r.product.brands || null,
        category: firstCategory(r.product.categories),
        source: 'openfoodfacts',
      });
    }
  } catch (e) { /* nimic */ }

  return json({ found: false });
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
