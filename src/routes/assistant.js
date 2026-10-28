// Asistent intern „roboțel" — răspunde la întrebări STRICT din datele platformei.
// Nu folosește niciun serviciu extern, token sau LLM: potrivește întrebarea pe
// intenții (cuvinte-cheie) și calculează răspunsul direct din baza de date D1.
import { json } from '../lib/http.js';

// normalizează: litere mici + fără diacritice, pentru potrivire robustă
function norm(s) {
  return (s || '').toString().toLowerCase()
    .replace(/ă|â/g, 'a').replace(/î/g, 'i').replace(/ș|ş/g, 's').replace(/ț|ţ/g, 't')
    .replace(/\s+/g, ' ').trim();
}
function has(q, ...words) { return words.some((w) => q.includes(w)); }
async function one(env, sql, ...binds) { return (await env.DB.prepare(sql).bind(...binds).first()) || {}; }

const CAPABILITIES = [
  'Câte comenzi sunt (pe status, intrare/ieșire, retururi)',
  'Comenzi noi / recente și comenzi vechi nefinalizate',
  'Câte produse sunt și câte sunt sub prag',
  'Cât stoc este (unități, locații, pe cutii)',
  'Bani: valoarea stocului, vânzări 30 zile, valoarea de comandat',
  'Ce trebuie aprovizionat (urgențe)',
  'Câți clienți, furnizori, paleți, cutii',
  'Un rezumat general („cum merge")',
];

export async function ask(request, env) {
  const b = await request.json().catch(() => ({}));
  const raw = (b && b.question) || '';
  const q = norm(raw);
  if (!q) return json({ answer: 'Întreabă-mă ceva despre datele din platformă (comenzi, produse, stoc, bani). Scrie „ajutor" ca să vezi ce pot.', suggestions: defaultSuggestions() });

  // ajutor / capabilități
  if (has(q, 'ajutor', 'ce poti', 'ce stii', 'help', 'ce poate', 'cum te')) {
    return json({ answer: 'Pot răspunde cu date din platformă:\n• ' + CAPABILITIES.join('\n• '), suggestions: defaultSuggestions() });
  }

  // rezumat general („cum merge", „status", „rezumat")
  if (has(q, 'cum merge', 'cum mergem', 'rezumat', 'status', 'sumar', 'situatia', 'overview', 'general')) {
    const o = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('completed','cancelled')");
    const p = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active = 1');
    const u = await one(env, 'SELECT COALESCE(SUM(quantity),0) AS n FROM inventory');
    const low = await one(env, 'SELECT COUNT(*) AS n FROM (SELECT p.id FROM products p WHERE p.active=1 AND p.reorder_point>0 AND (SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE product_id=p.id) <= p.reorder_point)');
    const val = await one(env, 'SELECT COALESCE(SUM(i.quantity * p.cost),0) AS v FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.cost IS NOT NULL');
    return json({ answer:
      'Pe scurt:\n' +
      '• Comenzi deschise: ' + (o.n || 0) + '\n' +
      '• Produse active: ' + (p.n || 0) + '\n' +
      '• Unități în stoc: ' + (u.n || 0) + '\n' +
      '• Produse sub prag: ' + (low.n || 0) + '\n' +
      '• Valoarea stocului: ' + money(val.v), suggestions: defaultSuggestions() });
  }

  // BANI / valoare
  if (has(q, 'bani', 'valoare', 'valoarea', 'cost', 'lei', 'cat face', 'cât face', 'suma')) {
    const stockVal = await one(env, 'SELECT COALESCE(SUM(i.quantity * p.cost),0) AS v FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.cost IS NOT NULL');
    const sold30 = await one(env, "SELECT COALESCE(SUM(-sm.quantity * p.cost),0) AS v FROM stock_movements sm JOIN products p ON p.id=sm.product_id WHERE sm.type='outbound' AND p.cost IS NOT NULL AND sm.created_at >= datetime('now','-30 day')");
    const missingCost = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1 AND (cost IS NULL OR cost=0)');
    let ans = 'Bani (din datele platformei):\n' +
      '• Valoarea stocului curent: ' + money(stockVal.v) + '\n' +
      '• Valoarea vânzărilor (ieșiri) ultimele 30 zile: ' + money(sold30.v);
    if ((missingCost.n || 0) > 0) ans += '\n\nNotă: ' + missingCost.n + ' produse nu au cost setat, deci nu intră în calcul. Pune „Cost unitar" la produs pentru valori complete.';
    return json({ answer: ans, suggestions: ['Ce trebuie comandat?', 'Câte comenzi deschise?', 'Valoarea de comandat'] });
  }

  // APROVIZIONARE / de comandat / sub prag
  if (has(q, 'de comandat', 'aprovizion', 'necesar', 'reorder', 'sub prag', 'trebuie comandat', 'replenish', 'urgent')) {
    const low = await one(env, 'SELECT COUNT(*) AS n FROM (SELECT p.id FROM products p WHERE p.active=1 AND p.reorder_point>0 AND (SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE product_id=p.id) <= p.reorder_point)');
    const out0 = await one(env, 'SELECT COUNT(*) AS n FROM products p WHERE p.active=1 AND (SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE product_id=p.id) <= 0');
    return json({ answer:
      'Aprovizionare:\n' +
      '• Produse sub prag de reaprovizionare: ' + (low.n || 0) + '\n' +
      '• Produse cu stoc zero: ' + (out0.n || 0) + '\n\n' +
      'Deschide „Necesar aprovizionare" pentru lista completă, urgențe și cantități de comandat.', suggestions: ['Câte produse în stoc?', 'Valoarea stocului', 'Cum merge?'] });
  }

  // STOC
  if (has(q, 'stoc', 'in stoc', 'unitat', 'cantitate', 'bucat', 'cat am', 'cate bucati', 'cate unitati')) {
    const u = await one(env, 'SELECT COALESCE(SUM(quantity),0) AS n FROM inventory');
    const p = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1');
    const loc = await one(env, 'SELECT COUNT(DISTINCT location_id) AS n FROM inventory WHERE quantity>0');
    const low = await one(env, 'SELECT COUNT(*) AS n FROM (SELECT p.id FROM products p WHERE p.active=1 AND p.reorder_point>0 AND (SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE product_id=p.id) <= p.reorder_point)');
    return json({ answer:
      'Stoc:\n' +
      '• Unități în stoc: ' + (u.n || 0) + '\n' +
      '• Produse active: ' + (p.n || 0) + '\n' +
      '• Locații ocupate: ' + (loc.n || 0) + '\n' +
      '• Produse sub prag: ' + (low.n || 0), suggestions: ['Valoarea stocului', 'Ce trebuie comandat?', 'Câte comenzi?'] });
  }

  // COMENZI
  if (has(q, 'comenzi', 'comanda', 'comenzile', 'comzi', 'order', 'retur', 'retururi')) {
    // tip specific
    if (has(q, 'retur')) {
      const rs = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE kind='supplier_return'");
      const rc = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE kind='client_return'");
      return json({ answer: 'Retururi:\n• Retur furnizor: ' + (rs.n || 0) + '\n• Retur client: ' + (rc.n || 0), suggestions: defaultSuggestions() });
    }
    if (has(q, 'noi', 'recent', 'azi', 'nou', 'ultim')) {
      const today = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE date(created_at)=date('now')");
      const w = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE created_at >= datetime('now','-7 day')");
      const { results: recent } = await env.DB.prepare("SELECT code, type, status FROM orders ORDER BY created_at DESC, id DESC LIMIT 5").all();
      const list = (recent || []).map((o) => '  - ' + o.code + ' (' + (o.type === 'inbound' ? 'intrare' : 'ieșire') + ', ' + o.status + ')').join('\n');
      return json({ answer: 'Comenzi noi:\n• Azi: ' + (today.n || 0) + '\n• Ultimele 7 zile: ' + (w.n || 0) + (list ? ('\n\nUltimele:\n' + list) : ''), suggestions: ['Comenzi vechi nefinalizate', 'Câte comenzi deschise?'] });
    }
    if (has(q, 'vechi', 'restant', 'nefinaliz', 'intarz', 'blocat', 'deschis', 'neprocesat')) {
      const open = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('completed','cancelled')");
      const old = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE status NOT IN ('completed','cancelled') AND created_at < datetime('now','-14 day')");
      const { results: list } = await env.DB.prepare("SELECT code, type, status, date(created_at) AS d FROM orders WHERE status NOT IN ('completed','cancelled') ORDER BY created_at ASC LIMIT 5").all();
      const l = (list || []).map((o) => '  - ' + o.code + ' (' + o.status + ', din ' + o.d + ')').join('\n');
      return json({ answer: 'Comenzi nefinalizate:\n• Total deschise: ' + (open.n || 0) + '\n• Mai vechi de 14 zile: ' + (old.n || 0) + (l ? ('\n\nCele mai vechi:\n' + l) : ''), suggestions: ['Comenzi noi', 'Cum merge?'] });
    }
    if (has(q, 'furnizor', 'intrare')) {
      const n = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE type='inbound' AND COALESCE(kind,'normal')='normal'");
      return json({ answer: 'Comenzi furnizor (intrare): ' + (n.n || 0), suggestions: defaultSuggestions() });
    }
    if (has(q, 'client', 'iesire')) {
      const n = await one(env, "SELECT COUNT(*) AS n FROM orders WHERE type='outbound' AND COALESCE(kind,'normal')='normal'");
      return json({ answer: 'Comenzi client (ieșire): ' + (n.n || 0), suggestions: defaultSuggestions() });
    }
    // general pe status
    const { results: byStatus } = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM orders GROUP BY status').all();
    const total = (byStatus || []).reduce((s, r) => s + r.n, 0);
    const map = { draft: 'ciornă', confirmed: 'confirmate', prepared: 'pregătite', completed: 'finalizate', cancelled: 'anulate' };
    const lines = (byStatus || []).map((r) => '• ' + (map[r.status] || r.status) + ': ' + r.n).join('\n');
    return json({ answer: 'Comenzi — total ' + total + ':\n' + lines, suggestions: ['Comenzi noi', 'Comenzi vechi nefinalizate', 'Câte retururi?'] });
  }

  // PRODUSE
  if (has(q, 'produse', 'produs', 'articol', 'sku', 'referinte')) {
    const p = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1');
    const withClient = await one(env, 'SELECT COUNT(*) AS n FROM products WHERE active=1 AND client_id IS NOT NULL');
    const noBc = await one(env, "SELECT COUNT(*) AS n FROM products WHERE active=1 AND (barcode IS NULL OR TRIM(barcode)='')");
    return json({ answer: 'Produse active: ' + (p.n || 0) + '\n• Ale clienților: ' + (withClient.n || 0) + '\n• Fără cod de bare: ' + (noBc.n || 0), suggestions: ['Câte produse în stoc?', 'Ce trebuie comandat?'] });
  }

  // CLIENTI / PARTENERI
  if (has(q, 'clienti', 'client', 'furnizori', 'parteneri', 'partener')) {
    const c = await one(env, 'SELECT COUNT(*) AS n FROM clients WHERE active=1');
    const sup = await one(env, "SELECT COUNT(*) AS n FROM partners WHERE type='supplier'");
    const cust = await one(env, "SELECT COUNT(*) AS n FROM partners WHERE type='customer'");
    return json({ answer: 'Clienți (depozitare): ' + (c.n || 0) + '\n• Furnizori: ' + (sup.n || 0) + '\n• Clienți parteneri: ' + (cust.n || 0), suggestions: defaultSuggestions() });
  }

  // PALETI / CUTII
  if (has(q, 'paleti', 'palet', 'colet')) {
    const { results: byKind } = await env.DB.prepare("SELECT kind, COUNT(*) AS n FROM pallets WHERE status<>'shipped' GROUP BY kind").all();
    const l = (byKind || []).map((r) => '• ' + (r.kind || 'palet') + ': ' + r.n).join('\n') || 'Niciun palet în depozit.';
    return json({ answer: 'Paleți/colete în depozit:\n' + l, suggestions: defaultSuggestions() });
  }
  if (has(q, 'cutii', 'cutie', 'bax', 'baxuri')) {
    const m = await one(env, "SELECT COUNT(*) AS n FROM boxes WHERE kind='master' AND status='stored'");
    const i = await one(env, "SELECT COUNT(*) AS n FROM boxes WHERE kind='inner' AND status='stored'");
    return json({ answer: 'Cutii în stoc:\n• Baxuri (cutii mari): ' + (m.n || 0) + '\n• Cutii mici: ' + (i.n || 0), suggestions: defaultSuggestions() });
  }

  // fallback
  return json({ answer: 'Nu am înțeles întrebarea. Pot răspunde despre comenzi, produse, stoc, bani, aprovizionare, clienți, paleți și cutii — toate din datele platformei. Scrie „ajutor" pentru exemple.', suggestions: defaultSuggestions() });
}

function money(v) {
  v = Number(v) || 0;
  return v.toLocaleString('ro-RO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' lei';
}
function defaultSuggestions() {
  return ['Cum merge?', 'Câte comenzi sunt?', 'Câte produse în stoc?', 'Ce trebuie comandat?', 'Valoarea stocului'];
}
