// Asistent intern „roboțel" — răspunde la întrebări STRICT din datele platformei.
// Nu folosește niciun serviciu extern, token sau LLM: potrivește întrebarea pe
// intenții (cuvinte-cheie) și calculează răspunsul direct din baza de date D1.
// Fiecare răspuns poate întoarce: `nav` (link-uri către pagina din platformă) și
// `suggestions` (întrebări de continuare, ca să ducă utilizatorul dintr-o întrebare în alta).
import { json } from '../lib/http.js';

// normalizează: litere mici + fără diacritice, pentru potrivire robustă
function norm(s) {
  return (s || '').toString().toLowerCase()
    .replace(/ă|â/g, 'a').replace(/î/g, 'i').replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't')
    .replace(/\s+/g, ' ').trim();
}
function has(q, ...words) { return words.some((w) => q.includes(w)); }
async function one(env, sql, ...binds) { return (await env.DB.prepare(sql).bind(...binds).first()) || {}; }
async function all(env, sql, ...binds) { return (await env.DB.prepare(sql).bind(...binds).all()).results || []; }
function money(v) { v = Number(v) || 0; return v.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' lei'; }

// link-uri rapide (label + view din admin). UI-ul le face butoane care navighează.
const NAV = {
  orders: { label: '➜ Deschide Comenzile', view: 'orders' },
  orders_supplier: { label: '➜ Comenzi furnizor', view: 'orders_supplier' },
  orders_client: { label: '➜ Comenzi client', view: 'orders_client' },
  returns_supplier: { label: '➜ Retur furnizor', view: 'returns_supplier' },
  returns_client: { label: '➜ Retur client', view: 'returns_client' },
  stock: { label: '➜ Deschide Stocul', view: 'stock' },
  products: { label: '➜ Deschide Produsele', view: 'products' },
  replenishment: { label: '➜ Necesar aprovizionare', view: 'replenishment' },
  movements: { label: '➜ Mișcări', view: 'movements' },
  reports: { label: '➜ Rapoarte', view: 'reports' },
  clients: { label: '➜ Clienți', view: 'clients' },
  partners: { label: '➜ Furnizori & parteneri', view: 'partners' },
  pallets: { label: '➜ Paleți', view: 'pallets' },
  boxes: { label: '➜ Cutii', view: 'boxes' },
  dashboard: { label: '➜ Dashboard', view: 'dashboard' },
};
function nav(...keys) { return keys.map((k) => NAV[k]).filter(Boolean); }

const STOP = new Set(['stoc', 'stocul', 'produs', 'produsul', 'produse', 'cat', 'cate', 'cata', 'cati', 'am', 'are', 'din', 'la', 'de', 'mai', 'ai', 'avem', 'este', 'sunt', 'cu', 'pe', 'in', 'un', 'una', 'o', 'al', 'ale', 'si', 'pentru', 'azi', 'astazi', 'acum', 'disponibil', 'ramas', 'cel', 'cea', 'ce', 'care', 'imi', 'spune', 'vreau', 'sa', 'stiu', 'cum', 'merge', 'client', 'clientul', 'comanda', 'comenzi', 'vandut', 'vinde', 'face', 'bani', 'valoare']);

export async function ask(request, env) {
  const b = await request.json().catch(() => ({}));
  const raw = (b && b.question) || '';
  const q = norm(raw);
  if (!q) return json({ answer: 'Întreabă-mă ceva despre datele din platformă (comenzi, produse, stoc, bani). Scrie „ajutor" ca să vezi ce pot.', suggestions: defaultSuggestions() });

  // ── AJUTOR ──
  if (has(q, 'ajutor', 'ce poti', 'ce stii', 'help', 'ce poate', 'cum te')) {
    return json({ answer: 'Pot răspunde cu date din platformă și îți dau link direct la pagină:\n• Comenzi (pe status, azi, noi/vechi, furnizor/client, retururi)\n• Produse și stoc (inclusiv stocul unui anume produs)\n• Cel mai vândut produs / top rulaj\n• Bani: valoarea stocului, vânzări 30 zile\n• Ce trebuie aprovizionat\n• Clienți, furnizori, paleți, cutii\n• Un rezumat general („cum merge")', suggestions: defaultSuggestions() });
  }

  // ── REZUMAT ──
  if (has(q, 'cum merge', 'cum mergem', 'rezumat', 'status', 'sumar', 'situatia', 'overview', 'general', 'cum stam')) {
    const o = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('completed','cancelled')");
    const todayO = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE date(created_at)=date('now')");
    const p = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active = 1');
    const u = await one(env, 'SELECT COALESCE(SUM(quantity),0) AS n FROM inventory');
    const low = await lowCount(env);
    const val = await one(env, 'SELECT COALESCE(SUM(i.quantity * p.cost),0) AS v FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.cost IS NOT NULL');
    return json({
      answer: 'Pe scurt:\n' +
        '• Comenzi deschise: ' + (o.n || 0) + ' (azi: ' + (todayO.n || 0) + ')\n' +
        '• Produse active: ' + (p.n || 0) + '\n' +
        '• Unități în stoc: ' + (u.n || 0) + '\n' +
        '• Produse sub prag: ' + low + '\n' +
        '• Valoarea stocului: ' + money(val.v),
      nav: nav('dashboard', 'orders', 'replenishment'),
      suggestions: ['Ce comenzi sunt azi?', 'Ce trebuie comandat?', 'Care e cel mai vândut produs?'],
    });
  }

  // ── CEL MAI VÂNDUT / TOP ──
  if (has(q, 'cel mai vandut', 'cele mai vandute', 'top produs', 'top produse', 'bestseller', 'cel mai vindut', 'cel mai cerut', 'top rulaj', 'cele mai cerute')) {
    const rows = await all(env, "SELECT p.sku, p.name, COALESCE(SUM(-sm.quantity),0) AS sold FROM stock_movements sm JOIN products p ON p.id=sm.product_id WHERE sm.type='outbound' AND sm.created_at >= datetime('now','-30 day') GROUP BY p.id ORDER BY sold DESC LIMIT 5");
    if (!rows.length) return json({ answer: 'Nu există ieșiri în ultimele 30 de zile, deci nu pot calcula topul.', nav: nav('reports', 'movements'), suggestions: defaultSuggestions() });
    const list = rows.map((r, i) => '  ' + (i + 1) + '. ' + r.sku + ' — ' + r.name + ': ' + r.sold + ' buc').join('\n');
    return json({ answer: 'Cele mai vândute produse (ultimele 30 zile):\n' + list, nav: nav('reports', 'stock'), suggestions: ['Stocul la ' + rows[0].name, 'Ce trebuie comandat?', 'Valoarea vânzărilor 30 zile'] });
  }

  // ── BANI / VALOARE ──
  if (has(q, 'bani', 'valoare', 'valoarea', 'cost', 'lei', 'cat face', 'suma', 'venit', 'vanzari', 'vandut lei', 'cifra')) {
    const stockVal = await one(env, 'SELECT COALESCE(SUM(i.quantity * p.cost),0) AS v FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.cost IS NOT NULL');
    const sold30 = await one(env, "SELECT COALESCE(SUM(-sm.quantity * p.cost),0) AS v FROM stock_movements sm JOIN products p ON p.id=sm.product_id WHERE sm.type='outbound' AND p.cost IS NOT NULL AND sm.created_at >= datetime('now','-30 day')");
    const missingCost = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1 AND (cost IS NULL OR cost=0)');
    let ans = 'Bani (din datele platformei):\n' +
      '• Valoarea stocului curent: ' + money(stockVal.v) + '\n' +
      '• Valoarea ieșirilor ultimele 30 zile: ' + money(sold30.v);
    if ((missingCost.n || 0) > 0) ans += '\n\nNotă: ' + missingCost.n + ' produse nu au cost setat (pune „Cost unitar" la produs pentru valori complete).';
    return json({ answer: ans, nav: nav('replenishment', 'reports', 'products'), suggestions: ['Ce trebuie comandat?', 'Care e cel mai vândut produs?', 'Câte comenzi deschise?'] });
  }

  // ── APROVIZIONARE ──
  if (has(q, 'de comandat', 'aprovizion', 'necesar', 'reorder', 'sub prag', 'trebuie comandat', 'replenish', 'urgent', 'ce comand', 'ce sa comand')) {
    const low = await lowCount(env);
    const out0 = await one(env, 'SELECT COUNT(*) AS n FROM products p WHERE p.active=1 AND (SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE product_id=p.id) <= 0');
    return json({
      answer: 'Aprovizionare:\n• Produse sub prag de reaprovizionare: ' + low + '\n• Produse cu stoc zero: ' + (out0.n || 0) + '\n\nDeschide „Necesar aprovizionare" pentru lista completă, urgențe (Urgent/Soon/OK) și cantitățile de comandat pe furnizor.',
      nav: nav('replenishment', 'stock'),
      suggestions: ['Care e cel mai vândut produs?', 'Valoarea stocului', 'Cum merge?'],
    });
  }

  // ── COMENZI ──
  if (has(q, 'comenzi', 'comanda', 'comenzile', 'comzi', 'order', 'retur', 'retururi')) {
    if (has(q, 'retur')) {
      const rs = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE kind='supplier_return'");
      const rc = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE kind='client_return'");
      return json({ answer: 'Retururi:\n• Retur furnizor: ' + (rs.n || 0) + '\n• Retur client: ' + (rc.n || 0), nav: nav('returns_supplier', 'returns_client'), suggestions: ['Câte comenzi deschise?', 'Cum merge?'] });
    }
    if (has(q, 'azi', 'astazi', 'today', 'pentru azi', 'de azi')) {
      const rows = await all(env, "SELECT code, type, status, COALESCE((SELECT name FROM partners WHERE id=o.partner_id),(SELECT name FROM clients WHERE id=o.client_id)) AS who FROM orders o WHERE date(created_at)=date('now') ORDER BY id DESC");
      if (!rows.length) return json({ answer: 'Nu există comenzi create astăzi.', nav: nav('orders'), suggestions: ['Comenzi noi (7 zile)', 'Comenzi vechi nefinalizate', 'Câte comenzi deschise?'] });
      const list = rows.map((o) => '  - ' + o.code + ' (' + typeLbl(o) + ', ' + o.status + (o.who ? ', ' + o.who : '') + ')').join('\n');
      return json({ answer: 'Comenzi create astăzi (' + rows.length + '):\n' + list, nav: nav('orders'), suggestions: ['Comenzi vechi nefinalizate', 'Ce trebuie comandat?', 'Cum merge?'] });
    }
    if (has(q, 'noi', 'recent', 'nou', 'ultim')) {
      const today = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE date(created_at)=date('now')");
      const w = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE created_at >= datetime('now','-7 day')");
      const recent = await all(env, "SELECT code, type, kind, status FROM orders ORDER BY created_at DESC, id DESC LIMIT 5");
      const list = recent.map((o) => '  - ' + o.code + ' (' + typeLbl(o) + ', ' + o.status + ')').join('\n');
      return json({ answer: 'Comenzi noi:\n• Azi: ' + (today.n || 0) + '\n• Ultimele 7 zile: ' + (w.n || 0) + (list ? ('\n\nUltimele:\n' + list) : ''), nav: nav('orders'), suggestions: ['Comenzi azi', 'Comenzi vechi nefinalizate'] });
    }
    if (has(q, 'vechi', 'restant', 'nefinaliz', 'intarz', 'blocat', 'deschis', 'neprocesat', 'in asteptare')) {
      const open = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('completed','cancelled')");
      const old = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('completed','cancelled') AND created_at < datetime('now','-14 day')");
      const list = await all(env, "SELECT code, type, kind, status, date(created_at) AS d FROM orders WHERE status NOT IN ('completed','cancelled') ORDER BY created_at ASC LIMIT 5");
      const l = list.map((o) => '  - ' + o.code + ' (' + o.status + ', din ' + o.d + ')').join('\n');
      return json({ answer: 'Comenzi nefinalizate:\n• Total deschise: ' + (open.n || 0) + '\n• Mai vechi de 14 zile: ' + (old.n || 0) + (l ? ('\n\nCele mai vechi:\n' + l) : ''), nav: nav('orders'), suggestions: ['Comenzi azi', 'Comenzi noi', 'Cum merge?'] });
    }
    if (has(q, 'furnizor', 'intrare')) {
      const n = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE type='inbound' AND COALESCE(kind,'normal')='normal'");
      const open = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE type='inbound' AND COALESCE(kind,'normal')='normal' AND status NOT IN ('completed','cancelled')");
      return json({ answer: 'Comenzi furnizor (intrare): ' + (n.n || 0) + ' total, ' + (open.n || 0) + ' deschise.', nav: nav('orders_supplier'), suggestions: ['Comenzi client', 'Ce trebuie comandat?'] });
    }
    if (has(q, 'client', 'iesire')) {
      const n = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE type='outbound' AND COALESCE(kind,'normal')='normal'");
      const open = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE type='outbound' AND COALESCE(kind,'normal')='normal' AND status NOT IN ('completed','cancelled')");
      return json({ answer: 'Comenzi client (ieșire): ' + (n.n || 0) + ' total, ' + (open.n || 0) + ' deschise.', nav: nav('orders_client'), suggestions: ['Comenzi furnizor', 'Comenzi azi'] });
    }
    const byStatus = await all(env, 'SELECT status, COUNT(*) AS n FROM orders GROUP BY status');
    const total = byStatus.reduce((s, r) => s + r.n, 0);
    const map = { draft: 'ciornă', confirmed: 'confirmate', prepared: 'pregătite', completed: 'finalizate', cancelled: 'anulate' };
    const lines = byStatus.map((r) => '• ' + (map[r.status] || r.status) + ': ' + r.n).join('\n');
    return json({ answer: 'Comenzi — total ' + total + ':\n' + lines, nav: nav('orders'), suggestions: ['Comenzi azi', 'Comenzi vechi nefinalizate', 'Câte retururi?'] });
  }

  // ── PRODUS ANUME (stocul unui produs) / căutare produs ──
  // declanșat când întreabă de stocul/disponibilul a ceva, sau când textul conține un produs recognoscibil
  const prodHit = await tryProductLookup(env, raw, q);
  if (prodHit) return json(prodHit);

  // ── STOC (general) ──
  if (has(q, 'stoc', 'in stoc', 'unitat', 'cantitate', 'bucat', 'cate bucati', 'cate unitati', 'cat stoc')) {
    const u = await one(env, 'SELECT COALESCE(SUM(quantity),0) AS n FROM inventory');
    const p = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1');
    const loc = await one(env, 'SELECT COUNT(DISTINCT location_id) AS n FROM inventory WHERE quantity>0');
    const low = await lowCount(env);
    return json({ answer: 'Stoc:\n• Unități în stoc: ' + (u.n || 0) + '\n• Produse active: ' + (p.n || 0) + '\n• Locații ocupate: ' + (loc.n || 0) + '\n• Produse sub prag: ' + low + '\n\nPontaj: întreabă „stocul la <nume produs>" pentru un produs anume.', nav: nav('stock', 'products', 'replenishment'), suggestions: ['Stocul la <produs>', 'Ce trebuie comandat?', 'Care e cel mai vândut produs?'] });
  }

  // ── PRODUSE ──
  if (has(q, 'produse', 'produs', 'articol', 'sku', 'referinte')) {
    const p = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1');
    const withClient = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1 AND client_id IS NOT NULL');
    const noBc = await one(env, "SELECT COUNT(*) AS n FROM products WHERE active=1 AND (barcode IS NULL OR TRIM(barcode)='')");
    return json({ answer: 'Produse active: ' + (p.n || 0) + '\n• Ale clienților: ' + (withClient.n || 0) + '\n• Fără cod de bare: ' + (noBc.n || 0), nav: nav('products', 'stock'), suggestions: ['Stocul la <produs>', 'Care e cel mai vândut produs?', 'Ce trebuie comandat?'] });
  }

  // ── CLIENT ANUME / CLIENTI ──
  const clientHit = await tryClientLookup(env, raw, q);
  if (clientHit) return json(clientHit);
  if (has(q, 'clienti', 'client', 'furnizori', 'parteneri', 'partener')) {
    const c = await one(env, 'SELECT COUNT(*) AS n FROM clients WHERE active=1');
    const sup = await one(env, "SELECT COUNT(*) AS n FROM partners WHERE type='supplier'");
    const cust = await one(env, "SELECT COUNT(*) AS n FROM partners WHERE type='customer'");
    return json({ answer: 'Clienți (depozitare): ' + (c.n || 0) + '\n• Furnizori: ' + (sup.n || 0) + '\n• Clienți parteneri: ' + (cust.n || 0), nav: nav('clients', 'partners'), suggestions: ['Stocul clientului <nume>', 'Câte produse în stoc?'] });
  }

  // ── PALEȚI / CUTII ──
  if (has(q, 'paleti', 'palet', 'colet')) {
    const byKind = await all(env, "SELECT kind, COUNT(*) AS n FROM pallets WHERE status<>'shipped' GROUP BY kind");
    const l = byKind.map((r) => '• ' + (r.kind || 'palet') + ': ' + r.n).join('\n') || 'Niciun palet în depozit.';
    return json({ answer: 'Paleți/colete în depozit:\n' + l, nav: nav('pallets'), suggestions: ['Câte cutii sunt?', 'Cum merge?'] });
  }
  if (has(q, 'cutii', 'cutie', 'bax', 'baxuri')) {
    const m = await one(env, "SELECT COUNT(*) AS n FROM boxes WHERE kind='master' AND status='stored'");
    const i = await one(env, "SELECT COUNT(*) AS n FROM boxes WHERE kind='inner' AND status='stored'");
    return json({ answer: 'Cutii în stoc:\n• Baxuri (cutii mari): ' + (m.n || 0) + '\n• Cutii mici: ' + (i.n || 0), nav: nav('boxes'), suggestions: ['Câți paleți sunt?', 'Câte produse în stoc?'] });
  }

  // ── FALLBACK ──
  return json({ answer: 'Nu am înțeles întrebarea. Pot răspunde despre comenzi, produse, stocul unui produs, bani, aprovizionare, clienți, paleți și cutii — toate din datele platformei. Scrie „ajutor" pentru exemple.', suggestions: defaultSuggestions() });
}

function typeLbl(o) { return o.kind === 'supplier_return' ? 'retur furnizor' : o.kind === 'client_return' ? 'retur client' : (o.type === 'inbound' ? 'intrare' : 'ieșire'); }
async function lowCount(env) {
  const r = await one(env, 'SELECT COUNT(*) AS n FROM (SELECT p.id FROM products p WHERE p.active=1 AND p.reorder_point>0 AND (SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE product_id=p.id) <= p.reorder_point)');
  return r.n || 0;
}
function keywords(q) { return q.split(' ').filter((w) => w.length >= 3 && !STOP.has(w)); }

// Caută un produs după cuvintele din întrebare (match pe nume/sku/cod, robust la diacritice).
async function tryProductLookup(env, raw, q) {
  const wantsStock = has(q, 'stoc', 'cat am', 'cate am', 'cat mai', 'disponibil', 'mai am', 'cate bucati', 'cat e', 'cat de');
  const words = keywords(q);
  if (!words.length) return null;
  // încarcă produsele active și potrivește în JS (ca să prindă și cu/ fără diacritice)
  const prods = await all(env, 'SELECT id, sku, name, barcode FROM products WHERE active=1');
  const scored = prods.map((p) => {
    const hay = norm((p.name || '') + ' ' + (p.sku || '') + ' ' + (p.barcode || ''));
    const hits = words.filter((w) => hay.includes(w)).length;
    return { p, hits };
  }).filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits);
  if (!scored.length) return wantsStock ? { answer: 'Nu am găsit un produs care să se potrivească. Caută-l în pagina Produse.', nav: nav('products', 'stock'), suggestions: ['Câte produse în stoc?'] } : null;
  // dacă nu cere explicit stoc și potrivirea e slabă (1 cuvânt scurt), nu interveni
  if (!wantsStock && scored[0].hits < 1) return null;
  const top = scored.slice(0, 5).map((x) => x.p);
  if (top.length > 1 && scored[0].hits === scored[1].hits) {
    // mai multe potriviri egale — listează-le
    const list = top.map((p) => '  - ' + p.sku + ' — ' + p.name).join('\n');
    return { answer: 'Am găsit mai multe produse. La care te referi?\n' + list, nav: nav('products', 'stock'), suggestions: top.slice(0, 3).map((p) => 'Stocul la ' + p.name) };
  }
  const p = top[0];
  const rows = await all(env, 'SELECT i.quantity, l.code AS loc FROM inventory i LEFT JOIN locations l ON l.id=i.location_id WHERE i.product_id=? AND i.quantity>0 ORDER BY i.quantity DESC', p.id);
  const total = rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);
  const sold = await one(env, "SELECT COALESCE(SUM(-quantity),0) AS n FROM stock_movements WHERE product_id=? AND type='outbound' AND created_at >= datetime('now','-30 day')", p.id);
  let ans = 'Stoc ' + p.sku + ' — ' + p.name + ':\n• Total în stoc: ' + total + ' buc';
  if (rows.length) ans += '\n• Pe locații: ' + rows.slice(0, 6).map((r) => (r.loc || '—') + ': ' + r.quantity).join(', ');
  ans += '\n• Ieșiri ultimele 30 zile: ' + (sold.n || 0) + ' buc';
  return { answer: ans, nav: nav('stock', 'products'), suggestions: ['Care e cel mai vândut produs?', 'Ce trebuie comandat?', 'Câte produse în stoc?'] };
}

// Caută un client după nume și dă un rezumat (stoc + ieșiri 30 zile).
async function tryClientLookup(env, raw, q) {
  if (!has(q, 'client', 'clientul')) return null;
  const words = keywords(q);
  if (!words.length) return null;
  const clients = await all(env, 'SELECT id, name FROM clients WHERE active=1');
  const scored = clients.map((c) => {
    const hay = norm(c.name || '');
    const hits = words.filter((w) => hay.includes(w)).length;
    return { c, hits };
  }).filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits);
  if (!scored.length) return null;
  const c = scored[0].c;
  const stock = await one(env, 'SELECT COALESCE(SUM(i.quantity),0) AS n FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.client_id=?', c.id);
  const prods = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1 AND client_id=?', c.id);
  const sold = await one(env, "SELECT COALESCE(SUM(-sm.quantity),0) AS n FROM stock_movements sm JOIN products p ON p.id=sm.product_id WHERE p.client_id=? AND sm.type='outbound' AND sm.created_at >= datetime('now','-30 day')", c.id);
  return { answer: 'Client ' + c.name + ':\n• Produse: ' + (prods.n || 0) + '\n• Unități în stoc: ' + (stock.n || 0) + '\n• Expediat ultimele 30 zile: ' + (sold.n || 0) + ' buc', nav: nav('clients', 'stock'), suggestions: ['Câte comenzi client?', 'Care e cel mai vândut produs?'] };
}

function defaultSuggestions() {
  return ['Cum merge?', 'Ce comenzi sunt azi?', 'Stocul la <produs>', 'Ce trebuie comandat?', 'Care e cel mai vândut produs?'];
}
