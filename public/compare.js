// Lógica de comparação (pura, sem DOM) – usada pelo frontend e pelos testes.
//
// prices: { [itemId]: { [storeId]: { price, title, url } | undefined } }
// items:  [{ id, query, qty }]
// stores: [{ id, name, shipping: { fee, freeAbove, minOrder } }]

export function shippingFor(store, subtotal) {
  const s = store.shipping || {};
  if (subtotal <= 0) return 0;
  const free = s.freeAbove !== null && s.freeAbove !== undefined && s.freeAbove !== '' && subtotal >= Number(s.freeAbove);
  return free ? 0 : Number(s.fee || 0);
}

function meetsMinimum(store, subtotal) {
  return subtotal >= Number(store.shipping?.minOrder || 0);
}

// Mais barato por produto (preço unitário)
export function cheapestPerItem(items, stores, prices) {
  return items.map((item) => {
    let best = null;
    for (const st of stores) {
      const p = prices[item.id]?.[st.id];
      if (p && p.price > 0 && (!best || p.price < best.price)) best = { storeId: st.id, ...p };
    }
    return { item, best };
  });
}

// Total comprando TUDO em uma única loja
export function totalsPerStore(items, stores, prices) {
  return stores
    .map((st) => {
      let subtotal = 0;
      const missing = [];
      for (const item of items) {
        const p = prices[item.id]?.[st.id];
        if (p && p.price > 0) subtotal += p.price * (item.qty || 1);
        else missing.push(item);
      }
      const shipping = shippingFor(st, subtotal);
      return {
        store: st,
        subtotal,
        shipping,
        total: subtotal + shipping,
        missing,
        belowMinimum: subtotal > 0 && !meetsMinimum(st, subtotal),
        complete: missing.length === 0,
      };
    })
    .sort((a, b) => a.missing.length - b.missing.length || a.total - b.total);
}

// Melhor combinação de lojas (pode dividir a compra) considerando o frete de
// cada loja usada. Testa todos os subconjuntos de lojas (até ~14 lojas é instantâneo).
// Para cada subconjunto, cada item vai para a loja mais barata do subconjunto;
// em seguida tenta mover itens entre lojas se isso economizar (ex.: atingir frete grátis).
export function bestSplit(items, stores, prices) {
  const n = stores.length;
  if (!n || !items.length) return null;
  const available = items.filter((it) => stores.some((s) => prices[it.id]?.[s.id]?.price > 0));
  const unavailable = items.filter((it) => !available.includes(it));
  const priceOf = (it, s) => prices[it.id]?.[s.id]?.price;

  const evaluate = (assign, subset) => {
    const subtotals = new Map(subset.map((s) => [s.id, 0]));
    for (const it of available) {
      const s = assign.get(it.id);
      subtotals.set(s.id, subtotals.get(s.id) + priceOf(it, s) * (it.qty || 1));
    }
    let total = 0;
    for (const s of subset) {
      const sub = subtotals.get(s.id);
      if (sub === 0) continue;
      if (!meetsMinimum(s, sub)) return { total: Infinity };
      total += sub + shippingFor(s, sub);
    }
    return { total, subtotals };
  };

  let best = null;
  const limit = Math.min(n, 16);
  for (let mask = 1; mask < 1 << limit; mask++) {
    const subset = stores.filter((_, i) => mask & (1 << i));
    const assign = new Map();
    let ok = true;
    for (const it of available) {
      let b = null;
      for (const s of subset) {
        const p = priceOf(it, s);
        if (p > 0 && (!b || p < priceOf(it, b))) b = s;
      }
      if (!b) { ok = false; break; }
      assign.set(it.id, b);
    }
    if (!ok) continue;

    // melhoria local: mover um item para outra loja do subconjunto se reduzir o total
    let cur = evaluate(assign, subset);
    for (let improved = true, guard = 0; improved && guard < 50; guard++) {
      improved = false;
      for (const it of available) {
        const orig = assign.get(it.id);
        for (const s of subset) {
          if (s === orig || !(priceOf(it, s) > 0)) continue;
          assign.set(it.id, s);
          const r = evaluate(assign, subset);
          if (r.total < cur.total - 0.001) { cur = r; improved = true; break; }
          assign.set(it.id, orig);
        }
      }
    }
    if (cur.total < (best?.total ?? Infinity)) best = { total: cur.total, assign: new Map(assign), subset };
  }
  if (!best) return null;

  const groups = best.subset
    .map((s) => {
      const its = available.filter((it) => best.assign.get(it.id) === s);
      const subtotal = its.reduce((a, it) => a + priceOf(it, s) * (it.qty || 1), 0);
      return { store: s, items: its, subtotal, shipping: shippingFor(s, subtotal) };
    })
    .filter((g) => g.items.length);
  return { total: best.total, groups, unavailable };
}
