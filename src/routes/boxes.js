// Cutii cu cod de bare propriu (generat de noi) pentru cutiile fără cod de bare.
// Fiecare cutie primește un cod unic CUT-#####; eticheta poartă atât codul cutiei
// cât și codul produsului.
import { json, error, readJson } from '../lib/http.js';

// Generează N cutii pentru un palet + produs. Body: { product_id, count, quantity }.
// quantity = câte bucăți sunt într-o cutie (per_box). Returnează cutiile create,
// cu tot ce trebuie pentru etichetă (cod cutie + cod produs + nume + lot + palet).
export async function create(request, env, ctx, user, params) {
  const palletId = Number(params.id);
  const b = await readJson(request);
  const productId = Number(b?.product_id);
  const count = Math.max(1, Math.min(200, Number(b?.count) || 0)); // max 200 / cerere
  const perBox = Math.max(0, Number(b?.quantity) || 0);
  if (!productId) return error('product_id obligatoriu', 400);
  if (!(Number(b?.count) > 0)) return error('count (nr. etichete) obligatoriu', 400);

  const pallet = await env.DB.prepare('SELECT id, code, lot, client_id FROM pallets WHERE id = ?').bind(palletId).first();
  if (!pallet) return error('Palet inexistent', 404);
  const product = await env.DB.prepare('SELECT id, sku, name, barcode, unit FROM products WHERE id = ?').bind(productId).first();
  if (!product) return error('Produs inexistent', 404);

  const before = await env.DB.prepare('SELECT COALESCE(MAX(id),0) AS m FROM boxes').first();
  const stmts = [];
  for (let i = 0; i < count; i++) {
    stmts.push(env.DB.prepare(
      'INSERT INTO boxes (code, pallet_id, product_id, quantity, lot, created_by) VALUES (NULL, ?, ?, ?, ?, ?)'
    ).bind(palletId, productId, perBox, pallet.lot || null, user.sub));
  }
  await env.DB.batch(stmts);
  // atribuie coduri CUT-##### pe baza id-ului (doar rândurilor tocmai inserate)
  await env.DB.prepare(
    "UPDATE boxes SET code = 'CUT-' || printf('%05d', id) WHERE id > ? AND code IS NULL AND pallet_id = ?"
  ).bind(before.m, palletId).run();

  const { results } = await env.DB.prepare(
    'SELECT id, code, quantity FROM boxes WHERE id > ? AND pallet_id = ? ORDER BY id'
  ).bind(before.m, palletId).all();

  const boxes = results.map((r) => ({
    id: r.id, code: r.code, quantity: r.quantity,
    product_barcode: product.barcode || product.sku, product_sku: product.sku,
    product_name: product.name, unit: product.unit,
    pallet_code: pallet.code, lot: pallet.lot || null,
  }));
  return json({ ok: true, boxes });
}

// Listează cutiile deja generate pentru un palet.
export async function listForPallet(request, env, ctx, user, params) {
  const palletId = Number(params.id);
  const { results } = await env.DB.prepare(`
    SELECT bx.id, bx.code, bx.quantity, bx.lot, bx.created_at,
           pr.sku AS product_sku, pr.name AS product_name, pr.unit,
           COALESCE(pr.barcode, pr.sku) AS product_barcode,
           pa.code AS pallet_code
    FROM boxes bx
    JOIN products pr ON pr.id = bx.product_id
    JOIN pallets pa ON pa.id = bx.pallet_id
    WHERE bx.pallet_id = ? ORDER BY bx.id`).bind(palletId).all();
  return json({ boxes: results });
}

// Rezolvă o cutie după cod (pentru scanare) — ce produs, ce cantitate, unde.
export async function resolve(request, env, ctx, user, params) {
  const code = String(params.code || '').trim();
  const box = await env.DB.prepare(`
    SELECT bx.id, bx.code, bx.quantity, bx.lot, bx.kind, bx.parent_id, bx.status,
           pr.id AS product_id, pr.sku AS product_sku, pr.name AS product_name, pr.unit,
           COALESCE(pr.barcode, pr.sku) AS product_barcode,
           pa.code AS pallet_code, pa.id AS pallet_id,
           l.code AS location_code, c.name AS client_name
    FROM boxes bx
    JOIN products pr ON pr.id = bx.product_id
    LEFT JOIN pallets pa ON pa.id = bx.pallet_id
    LEFT JOIN locations l ON l.id = bx.location_id
    LEFT JOIN clients c ON c.id = pr.client_id
    WHERE bx.code = ? COLLATE NOCASE`).bind(code).first();
  if (!box) return error('Cutie inexistentă', 404);
  return json({ box });
}

// ─────────── Cutii fizice pe niveluri (cutie mare → cutii mici → produse) ───────────

// Recepție pe cutii: creează cutii mari (master) cu cutiile mici în interior,
// plus cutii mici libere și bucăți libere; adaugă bucățile în stoc (inbound).
// Body: { product_id, location_id, masters, inners, pieces, lot }
export async function receive(request, env, ctx, user) {
  const b = await readJson(request);
  const productId = Number(b?.product_id);
  const locationId = Number(b?.location_id);
  let masters = Math.max(0, Math.floor(Number(b?.masters) || 0));
  const looseInners = Math.max(0, Math.floor(Number(b?.inners) || 0));
  const loosePieces = Math.max(0, Math.floor(Number(b?.pieces) || 0));
  const lot = (b?.lot || '').toString().trim() || null;
  // Cod propriu al baxului (de pe eticheta furnizorului). Dacă e scanat, acel bax
  // primește codul lui în loc de CM-… auto-generat; se aplică unui SINGUR bax.
  const masterCode = (b?.master_code || '').toString().trim() || null;
  if (masterCode && masters !== 1) masters = 1;
  if (!productId || !locationId) return error('product_id și location_id obligatorii', 400);
  if (masters <= 0 && looseInners <= 0 && loosePieces <= 0) return error('Pune cel puțin o cutie sau bucăți', 400);
  if (masterCode) {
    const dup = await env.DB.prepare("SELECT id FROM boxes WHERE code = ?").bind(masterCode).first();
    if (dup) return error('Codul de bax „' + masterCode + '" există deja în sistem', 400);
  }

  const product = await env.DB.prepare('SELECT id, sku, name, barcode, unit, pcs_per_inner, inner_per_master FROM products WHERE id = ?').bind(productId).first();
  if (!product) return error('Produs inexistent', 404);
  const loc = await env.DB.prepare('SELECT id, code FROM locations WHERE id = ?').bind(locationId).first();
  if (!loc) return error('Locație inexistentă', 404);
  // Ambalarea folosită la ACEASTĂ recepție: override din body (configurație/lot) sau implicitul produsului.
  const pi = Math.floor(Number(b?.pcs_per_inner) > 0 ? Number(b.pcs_per_inner) : (product.pcs_per_inner || 0));
  const im = Math.floor(Number(b?.inner_per_master) > 0 ? Number(b.inner_per_master) : (product.inner_per_master || 0));
  if ((masters > 0 || looseInners > 0) && pi <= 0) return error('Setează „Bucăți / cutie mică" la produs ca să recepționezi pe cutii', 400);
  if (masters > 0 && im <= 0) return error('Setează „Cutii mici / cutie mare" la produs', 400);
  if (masters > 200 || looseInners > 500) return error('Prea multe cutii într-o recepție (max 200 mari / 500 mici)', 400);

  const totalPieces = masters * pi * im + looseInners * pi + loosePieces;
  const beforeAll = (await env.DB.prepare('SELECT COALESCE(MAX(id),0) AS m FROM boxes').first()).m;

  // 1) cutii mari (master)
  let masterIds = [];
  if (masters > 0) {
    const ms = [];
    for (let i = 0; i < masters; i++) {
      const code = (masterCode && i === 0) ? masterCode : null; // baxul cu cod propriu îl păstrează; restul → CM-… auto
      ms.push(env.DB.prepare(
        "INSERT INTO boxes (code, kind, parent_id, location_id, product_id, quantity, lot, status, created_by) VALUES (?, 'master', NULL, ?, ?, ?, ?, 'stored', ?)"
      ).bind(code, locationId, productId, pi * im, lot, user.sub));
    }
    await env.DB.batch(ms);
    await env.DB.prepare("UPDATE boxes SET code = 'CM-' || printf('%05d', id) WHERE id > ? AND kind='master' AND code IS NULL").bind(beforeAll).run();
    const { results } = await env.DB.prepare("SELECT id FROM boxes WHERE id > ? AND kind='master' ORDER BY id").bind(beforeAll).all();
    masterIds = results.map((r) => r.id);
  }

  // 2) cutii mici (inner): cele din fiecare cutie mare + cele libere
  const beforeI = (await env.DB.prepare('SELECT COALESCE(MAX(id),0) AS m FROM boxes').first()).m;
  const is = [];
  for (const mid of masterIds) {
    for (let k = 0; k < im; k++) {
      is.push(env.DB.prepare(
        "INSERT INTO boxes (code, kind, parent_id, location_id, product_id, quantity, lot, status, created_by) VALUES (NULL, 'inner', ?, ?, ?, ?, ?, 'stored', ?)"
      ).bind(mid, locationId, productId, pi, lot, user.sub));
    }
  }
  for (let i = 0; i < looseInners; i++) {
    is.push(env.DB.prepare(
      "INSERT INTO boxes (code, kind, parent_id, location_id, product_id, quantity, lot, status, created_by) VALUES (NULL, 'inner', NULL, ?, ?, ?, ?, 'stored', ?)"
    ).bind(locationId, productId, pi, lot, user.sub));
  }
  if (is.length) {
    // în loturi (D1 limitează nr. de statements per batch)
    for (let i = 0; i < is.length; i += 50) await env.DB.batch(is.slice(i, i + 50));
    await env.DB.prepare("UPDATE boxes SET code = 'CT-' || printf('%05d', id) WHERE id > ? AND kind='inner' AND code IS NULL").bind(beforeI).run();
  }

  // 3) stoc: bucățile intră în inventar (inbound)
  if (totalPieces > 0) {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO inventory (product_id, location_id, quantity) VALUES (?, ?, ?) ON CONFLICT(product_id, location_id) DO UPDATE SET quantity = quantity + excluded.quantity, updated_at = datetime('now')").bind(productId, locationId, totalPieces),
      env.DB.prepare("INSERT INTO stock_movements (product_id, location_id, type, quantity, reference, note, user_id) VALUES (?, ?, 'inbound', ?, 'CUTII', ?, ?)").bind(productId, locationId, totalPieces, 'recepție pe cutii', user.sub),
    ]);
  }

  // cutiile create (pentru etichete)
  const { results: created } = await env.DB.prepare(
    "SELECT id, code, kind, quantity FROM boxes WHERE id > ? AND product_id = ? AND location_id = ? ORDER BY id"
  ).bind(beforeAll, productId, locationId).all();

  return json({ ok: true, masters, loose_inners: looseInners, loose_pieces: loosePieces, total_pieces: totalPieces, boxes: created });
}

// Arbore de cutii în stoc (master cu cutiile mici), cu filtre opționale.
export async function tree(request, env) {
  const url = new URL(request.url);
  const locationId = url.searchParams.get('location_id');
  const productId = url.searchParams.get('product_id');
  const clientId = url.searchParams.get('client_id');
  let sql = `
    SELECT bx.id, bx.code, bx.kind, bx.parent_id, bx.quantity, bx.lot, bx.location_id, bx.created_at,
           pr.id AS product_id, pr.sku AS product_sku, pr.name AS product_name,
           l.code AS location_code, c.name AS client_name
    FROM boxes bx
    JOIN products pr ON pr.id = bx.product_id
    LEFT JOIN locations l ON l.id = bx.location_id
    LEFT JOIN clients c ON c.id = pr.client_id
    WHERE bx.status = 'stored'`;
  const binds = [];
  if (locationId) { sql += ' AND bx.location_id = ?'; binds.push(Number(locationId)); }
  if (productId) { sql += ' AND bx.product_id = ?'; binds.push(Number(productId)); }
  if (clientId) { sql += ' AND pr.client_id = ?'; binds.push(Number(clientId)); }
  sql += ' ORDER BY bx.kind DESC, bx.id';
  const { results } = await env.DB.prepare(sql).bind(...binds).all();
  return json({ boxes: results });
}

// Expediază o cutie (mare → scoate toate cutiile mici din ea; mică → doar ea).
// Scade bucățile din stoc (outbound) și marchează cutia/cutiile ca expediate.
export async function ship(request, env, ctx, user, params) {
  const id = Number(params.id);
  const box = await env.DB.prepare('SELECT * FROM boxes WHERE id = ?').bind(id).first();
  if (!box) return error('Cutie inexistentă', 404);
  if (box.status === 'shipped') return error('Cutia e deja expediată', 400);
  const locId = box.location_id;
  if (!locId) return error('Cutia nu are locație — nu poate fi expediată', 400);

  let pieces = 0;
  const marks = [];
  if (box.kind === 'master') {
    const { results: inners } = await env.DB.prepare("SELECT id, quantity FROM boxes WHERE parent_id = ? AND status='stored'").bind(id).all();
    for (const inn of inners) { pieces += Number(inn.quantity) || 0; marks.push(inn.id); }
    marks.push(id);
  } else {
    pieces = Number(box.quantity) || 0;
    marks.push(id);
  }

  if (pieces > 0) {
    const inv = await env.DB.prepare('SELECT quantity FROM inventory WHERE product_id = ? AND location_id = ?').bind(box.product_id, locId).first();
    const avail = inv?.quantity || 0;
    if (avail < pieces) return error('Stoc insuficient în locație (disponibil: ' + avail + ', necesar: ' + pieces + ')', 400);
    await env.DB.batch([
      env.DB.prepare("UPDATE inventory SET quantity = quantity - ?, updated_at = datetime('now') WHERE product_id = ? AND location_id = ?").bind(pieces, box.product_id, locId),
      env.DB.prepare("INSERT INTO stock_movements (product_id, location_id, type, quantity, reference, note, user_id) VALUES (?, ?, 'outbound', ?, ?, ?, ?)").bind(box.product_id, locId, -pieces, box.code, 'expediere cutie', user.sub),
    ]);
  }
  const upd = marks.map((mid) => env.DB.prepare("UPDATE boxes SET status='shipped' WHERE id = ?").bind(mid));
  await env.DB.batch(upd);
  return json({ ok: true, pieces, boxes_shipped: marks.length, kind: box.kind });
}

