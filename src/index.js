// WMS — Cloudflare Worker (entry point + router)
import { json, error, corsHeaders } from './lib/http.js';
import { authenticate, hasRole } from './lib/auth.js';
import { renderUI } from './ui.js';

import * as auth from './routes/auth.js';
import * as products from './routes/products.js';
import * as locations from './routes/locations.js';
import * as inventory from './routes/inventory.js';
import * as dashboard from './routes/dashboard.js';
import * as users from './routes/users.js';
import * as partners from './routes/partners.js';
import * as orders from './routes/orders.js';
import * as reports from './routes/reports.js';
import * as qr from './routes/qr.js';
import * as vendor from './routes/vendor.js';
import * as barcode from './routes/barcode.js';
import * as clients from './routes/clients.js';
import * as portal from './routes/portal.js';
import * as pallets from './routes/pallets.js';
import * as pwa from './routes/pwa.js';
import { ensureSchema } from './lib/schema.js';

// role: null = public, altfel rolul minim necesar (viewer < operator < admin)
const routes = [
  ['POST', '/api/auth/login', auth.login, null],
  ['GET', '/api/auth/me', auth.me, 'viewer'],

  ['GET', '/api/dashboard', dashboard.stats, 'viewer'],

  ['GET', '/api/products', products.list, 'viewer'],
  ['GET', '/api/products/export', products.exportCsv, 'viewer'],
  ['POST', '/api/products', products.create, 'operator'],
  ['POST', '/api/products/import', products.importProducts, 'operator'],
  ['PUT', '/api/products/:id', products.update, 'operator'],
  ['DELETE', '/api/products/:id', products.remove, 'admin'],

  ['GET', '/api/locations', locations.list, 'viewer'],
  ['POST', '/api/locations', locations.create, 'operator'],
  ['PUT', '/api/locations/:id', locations.update, 'operator'],
  ['DELETE', '/api/locations/:id', locations.remove, 'admin'],

  ['GET', '/api/inventory/stock', inventory.stock, 'viewer'],
  ['GET', '/api/inventory/summary', inventory.summary, 'viewer'],
  ['GET', '/api/inventory/movements', inventory.movements, 'viewer'],
  ['GET', '/api/inventory/export', inventory.exportStockCsv, 'viewer'],
  ['POST', '/api/inventory/receive', inventory.receive, 'operator'],
  ['POST', '/api/inventory/ship', inventory.ship, 'operator'],
  ['POST', '/api/inventory/adjust', inventory.adjust, 'operator'],
  ['POST', '/api/inventory/transfer', inventory.transfer, 'operator'],

  ['GET', '/api/users', users.list, 'admin'],
  ['POST', '/api/users', users.create, 'admin'],
  ['PUT', '/api/users/:id', users.update, 'admin'],

  ['GET', '/api/partners', partners.list, 'viewer'],
  ['POST', '/api/partners', partners.create, 'operator'],
  ['PUT', '/api/partners/:id', partners.update, 'operator'],
  ['DELETE', '/api/partners/:id', partners.remove, 'admin'],

  ['GET', '/api/orders', orders.list, 'viewer'],
  ['GET', '/api/orders/:id', orders.get, 'viewer'],
  ['POST', '/api/orders', orders.create, 'operator'],
  ['PUT', '/api/orders/:id/status', orders.setStatus, 'operator'],
  ['POST', '/api/orders/:id/complete', orders.complete, 'operator'],
  ['DELETE', '/api/orders/:id', orders.remove, 'operator'],

  ['GET', '/api/reports/stock-by-category', reports.stockByCategory, 'viewer'],
  ['GET', '/api/reports/low-stock', reports.lowStock, 'viewer'],
  ['GET', '/api/reports/low-stock/export', reports.exportLowStockCsv, 'viewer'],
  ['GET', '/api/reports/movements-by-period', reports.movementsByPeriod, 'viewer'],
  ['GET', '/api/reports/top-products', reports.topProducts, 'viewer'],

  ['GET', '/api/qr', qr.svg, 'viewer'],

  ['GET', '/api/barcode-lookup', barcode.lookup, 'operator'],

  // Clienți de depozitare + conturile lor (staff)
  ['GET', '/api/clients', clients.list, 'operator'],
  ['POST', '/api/clients', clients.create, 'admin'],
  ['PUT', '/api/clients/:id', clients.update, 'admin'],
  ['GET', '/api/clients/:id/users', clients.listUsers, 'admin'],
  ['POST', '/api/clients/:id/users', clients.createUser, 'admin'],

  // Paleți (staff)
  ['GET', '/api/pallets', pallets.list, 'viewer'],
  ['GET', '/api/pallets/:id', pallets.get, 'viewer'],
  ['POST', '/api/pallets', pallets.create, 'operator'],
  ['PUT', '/api/pallets/:id', pallets.update, 'operator'],
  ['POST', '/api/pallets/:id/items', pallets.addItem, 'operator'],
  ['DELETE', '/api/pallets/:id/items/:itemId', pallets.removeItem, 'operator'],
  ['DELETE', '/api/pallets/:id', pallets.remove, 'operator'],

  // Portal client (acces doar la datele proprii)
  ['GET', '/api/portal/me', portal.me, 'client'],
  ['GET', '/api/portal/summary', portal.summary, 'client'],
  ['GET', '/api/portal/products', portal.products, 'client'],
  ['GET', '/api/portal/pallets', portal.pallets, 'client'],
  ['GET', '/api/portal/movements', portal.movements, 'client'],
  ['GET', '/api/portal/export', portal.exportCsv, 'client'],
];

function match(routePath, actualPath) {
  const rp = routePath.split('/');
  const ap = actualPath.split('/');
  if (rp.length !== ap.length) return null;
  const params = {};
  for (let i = 0; i < rp.length; i++) {
    if (rp[i].startsWith(':')) params[rp[i].slice(1)] = decodeURIComponent(ap[i]);
    else if (rp[i] !== ap[i]) return null;
  }
  return params;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    // API
    if (path.startsWith('/api/')) {
      await ensureSchema(env); // migrare idempotentă (clienți, portal, coloane noi)
      for (const [method, pattern, handler, role] of routes) {
        if (method !== request.method) continue;
        const params = match(pattern, path);
        if (!params) continue;

        let user = null;
        if (role !== null) {
          user = await authenticate(request, env);
          if (!user) return error('Neautentificat', 401);
          if (role === 'client') {
            if (user.kind !== 'client') return error('Doar conturi de client', 403);
          } else {
            // rutele de staff nu sunt accesibile conturilor de client
            if (user.kind === 'client' || !hasRole(user, role)) return error('Permisiuni insuficiente', 403);
          }
        }
        try {
          return await handler(request, env, ctx, user, params);
        } catch (e) {
          return error('Eroare server: ' + (e?.message || e), 500);
        }
      }
      return error('Endpoint inexistent', 404);
    }

    // Biblioteci client servite de Worker
    if (path === '/vendor/zxing.js') return vendor.zxing();
    if (path === '/vendor/xlsx.js') return vendor.xlsx();
    if (path.startsWith('/assets/') && path.endsWith('.png')) return vendor.image(path.slice(8, -4));

    // PWA (instalabil pe Android / bază pentru APK)
    if (path === '/manifest.webmanifest') return pwa.manifest();
    if (path === '/sw.js') return pwa.sw();
    if (path === '/icon-192.png') return pwa.icon192();
    if (path === '/icon-512.png') return pwa.icon512();

    // Health check
    if (path === '/health') return json({ ok: true, service: 'wms', ts: new Date().toISOString() });

    // Interfața web (SPA) pentru orice altă cale
    return new Response(renderUI(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  },
};
