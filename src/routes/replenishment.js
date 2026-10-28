// Necesar de aprovizionare (replenishment / procurement).
// Analizează istoricul de ieșiri (vânzări/consum) din ultimele N zile, îl raportează
// la stocul curent și la pragul de reaprovizionare, și propune ce și cât de comandat,
// cu urgență (Urgent/Soon/OK) și clasă ABC. Totul se calculează „la cerere".
import { json } from '../lib/http.js';

const WINDOW_DAYS = 90;   // fereastra de istoric pentru cererea medie
const URGENT_DAYS = 7;    // sub atât = Urgent
const SOON_DAYS = 21;     // sub atât = Soon
const TARGET_COVER_DAYS = 30; // ținta de acoperire la comandă

export async function needs(request, env) {
  const url = new URL(request.url);
  const windowDays = Math.max(7, Math.min(365, Number(url.searchParams.get('window')) || WINDOW_DAYS));

  const { results: products } = await env.DB.prepare(
    `SELECT p.id, p.sku, p.name, p.unit, p.reorder_point, p.supplier_id, p.cost,
            pa.name AS supplier_name,
            (SELECT COALESCE(SUM(quantity),0) FROM inventory WHERE product_id = p.id) AS stock
     FROM products p LEFT JOIN partners pa ON pa.id = p.supplier_id
     WHERE p.active = 1`
  ).all();

  // cerere (ieșiri) pe produs în fereastră — ieșirile sunt stocate cu cantitate negativă
  const { results: dem } = await env.DB.prepare(
    `SELECT product_id, COALESCE(SUM(-quantity),0) AS sold
     FROM stock_movements
     WHERE type = 'outbound' AND created_at >= datetime('now', ?)
     GROUP BY product_id`
  ).bind('-' + windowDays + ' day').all();
  const demandMap = {};
  for (const d of dem) demandMap[d.product_id] = Number(d.sold) || 0;

  const items = [];
  for (const p of products) {
    const stock = Number(p.stock) || 0;
    const sold = demandMap[p.id] || 0;
    const daily = sold / windowDays;
    const reorder = Number(p.reorder_point) || 0;
    const cost = Number(p.cost) || 0;
    const coverage = daily > 0 ? (stock / daily) : null; // zile de acoperire (null = fără cerere)

    // cât de comandat: aducem stocul la ținta de acoperire; dacă nu e cerere dar e sub prag, aducem la prag
    let toOrder = 0;
    if (daily > 0) {
      toOrder = Math.max(0, Math.ceil(daily * TARGET_COVER_DAYS) - stock);
      // dacă are prag și e sub el, comandă măcar până la prag
      if (reorder > 0 && stock < reorder) toOrder = Math.max(toOrder, reorder - stock);
    } else if (reorder > 0 && stock < reorder) {
      toOrder = reorder - stock;
    }

    // urgență
    let urgency = 'ok';
    if (reorder > 0 && stock <= reorder) urgency = 'urgent';
    if (coverage != null) {
      if (coverage < URGENT_DAYS) urgency = 'urgent';
      else if (coverage < SOON_DAYS && urgency !== 'urgent') urgency = 'soon';
    }

    const value = toOrder * cost;
    const moved_value = sold * cost; // pentru clasa ABC

    items.push({
      id: p.id, sku: p.sku, name: p.name, unit: p.unit || 'buc',
      supplier_id: p.supplier_id || null, supplier_name: p.supplier_name || null,
      stock, sold, daily_demand: Math.round(daily * 100) / 100,
      coverage_days: coverage == null ? null : Math.round(coverage * 10) / 10,
      reorder_point: reorder, cost, to_order: toOrder, value: Math.round(value * 100) / 100,
      moved_value, urgency, abc: 'C',
    });
  }

  // Clasa ABC: Pareto pe valoarea rulată (sold*cost); dacă nu există costuri, pe cantitatea rulată.
  const anyCost = items.some((it) => it.cost > 0);
  const rankKey = anyCost ? 'moved_value' : 'sold';
  const ranked = items.filter((it) => (it[rankKey] || 0) > 0).sort((a, b) => (b[rankKey] || 0) - (a[rankKey] || 0));
  const totalRank = ranked.reduce((s, it) => s + (it[rankKey] || 0), 0);
  let cum = 0;
  for (const it of ranked) {
    cum += (it[rankKey] || 0);
    const pct = totalRank > 0 ? cum / totalRank : 1;
    it.abc = pct <= 0.8 ? 'A' : pct <= 0.95 ? 'B' : 'C';
  }

  // KPIs
  const toOrderItems = items.filter((it) => it.to_order > 0);
  const urgentCount = items.filter((it) => it.urgency === 'urgent').length;
  const valueToOrder = Math.round(toOrderItems.reduce((s, it) => s + (it.value || 0), 0) * 100) / 100;
  const covs = items.filter((it) => it.coverage_days != null).map((it) => it.coverage_days).sort((a, b) => a - b);
  const medianCoverage = covs.length ? (covs.length % 2 ? covs[(covs.length - 1) / 2] : Math.round((covs[covs.length / 2 - 1] + covs[covs.length / 2]) / 2 * 10) / 10) : null;

  // Necesar pe furnizor (doar produse de comandat)
  const supMap = {};
  for (const it of toOrderItems) {
    const key = it.supplier_id || 0;
    if (!supMap[key]) supMap[key] = { supplier_id: it.supplier_id || null, supplier_name: it.supplier_name || 'Fără furnizor', products: 0, qty: 0, value: 0 };
    supMap[key].products += 1;
    supMap[key].qty += it.to_order;
    supMap[key].value += it.value || 0;
  }
  const bySupplier = Object.values(supMap).sort((a, b) => b.products - a.products)
    .map((s) => ({ ...s, value: Math.round(s.value * 100) / 100 }));

  // Urgență pe clasă de valoare (A vs B/C)
  const uc = { urgent: { A: 0, BC: 0 }, soon: { A: 0, BC: 0 }, ok: { A: 0, BC: 0 } };
  for (const it of items) {
    const band = it.abc === 'A' ? 'A' : 'BC';
    if (uc[it.urgency]) uc[it.urgency][band] += 1;
  }

  return json({
    computed_at: new Date().toISOString(),
    window_days: windowDays,
    kpis: {
      to_order_now: toOrderItems.length,
      urgent: urgentCount,
      value_to_order: valueToOrder,
      median_coverage: medianCoverage,
      products_analysed: items.length,
    },
    by_supplier: bySupplier,
    urgency_by_class: uc,
    items,
  });
}
