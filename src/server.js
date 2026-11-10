const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { read, write, profileDir } = require('./storage');
const scraper = require('./scraper');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function storesWithStatus() {
  const sessions = read('sessions');
  return read('stores').map((s) => ({
    ...s,
    session: sessions[s.id] || null,
    loginOpen: scraper.isLoginOpen(s.id),
  }));
}

function sanitizeStore(body, id) {
  const num = (v, d = 0) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? d : Number(v));
  if (!body.name || !body.searchUrl || !body.searchUrl.includes('{q}')) {
    throw new Error('Informe nome e uma URL de busca contendo {q}.');
  }
  return {
    id,
    name: String(body.name).trim(),
    color: body.color || '#6b7280',
    homeUrl: body.homeUrl || new URL(body.searchUrl.replace('{q}', 'x')).origin,
    loginUrl: body.loginUrl || body.homeUrl || new URL(body.searchUrl.replace('{q}', 'x')).origin,
    searchUrl: body.searchUrl.trim(),
    selectors: {
      item: body.selectors?.item || '',
      title: body.selectors?.title || '',
      price: body.selectors?.price || '',
      link: body.selectors?.link || '',
    },
    shipping: {
      fee: num(body.shipping?.fee),
      freeAbove: body.shipping?.freeAbove === '' || body.shipping?.freeAbove == null ? null : num(body.shipping.freeAbove),
      minOrder: num(body.shipping?.minOrder),
    },
    enabled: body.enabled !== false,
  };
}

const wrap = (fn) => (req, res) => {
  Promise.resolve(fn(req, res)).catch((e) => res.status(400).json({ error: e.message }));
};

// ---------- estado geral ----------
app.get('/api/state', (req, res) => {
  res.json({
    stores: storesWithStatus(),
    list: read('list'),
    settings: read('settings'),
    results: read('results'),
  });
});

// ---------- lojas ----------
app.post('/api/stores', wrap((req, res) => {
  const stores = read('stores');
  let id = slug(req.body.name || 'loja') || 'loja';
  while (stores.some((s) => s.id === id)) id += '-2';
  const store = sanitizeStore(req.body, id);
  stores.push(store);
  write('stores', stores);
  res.json(store);
}));

app.put('/api/stores/:id', wrap((req, res) => {
  const stores = read('stores');
  const i = stores.findIndex((s) => s.id === req.params.id);
  if (i < 0) throw new Error('Loja não encontrada');
  stores[i] = sanitizeStore({ ...stores[i], ...req.body }, stores[i].id);
  write('stores', stores);
  res.json(stores[i]);
}));

app.delete('/api/stores/:id', wrap((req, res) => {
  write('stores', read('stores').filter((s) => s.id !== req.params.id));
  const sessions = read('sessions');
  delete sessions[req.params.id];
  write('sessions', sessions);
  fs.rmSync(profileDir(req.params.id), { recursive: true, force: true });
  res.json({ ok: true });
}));

app.post('/api/stores/reset-defaults', wrap((req, res) => {
  const current = read('stores');
  for (const d of require('./defaultStores')) if (!current.some((s) => s.id === d.id)) current.push(d);
  write('stores', current);
  res.json({ ok: true });
}));

// ---------- login (janela visível; o usuário entra manualmente) ----------
app.post('/api/stores/:id/login', wrap(async (req, res) => {
  const store = read('stores').find((s) => s.id === req.params.id);
  if (!store) throw new Error('Loja não encontrada');
  const r = await scraper.login(store, () => {
    const sessions = read('sessions');
    sessions[store.id] = { connectedAt: new Date().toISOString() };
    write('sessions', sessions);
  });
  res.json(r);
}));

app.post('/api/stores/:id/login/finish', wrap(async (req, res) => {
  res.json(await scraper.finishLogin(req.params.id));
}));

app.delete('/api/stores/:id/session', wrap(async (req, res) => {
  await scraper.finishLogin(req.params.id);
  fs.rmSync(profileDir(req.params.id), { recursive: true, force: true });
  const sessions = read('sessions');
  delete sessions[req.params.id];
  write('sessions', sessions);
  res.json({ ok: true });
}));

// ---------- lista e configurações ----------
app.put('/api/list', wrap((req, res) => {
  const list = (req.body || [])
    .filter((it) => it.query && String(it.query).trim())
    .map((it) => ({
      id: it.id || crypto.randomUUID(),
      query: String(it.query).trim(),
      qty: Math.max(1, Number(it.qty) || 1),
    }));
  write('list', list);
  // remove resultados de itens que saíram da lista
  const results = read('results');
  for (const k of Object.keys(results)) if (!list.some((it) => it.id === k)) delete results[k];
  write('results', results);
  res.json(list);
}));

app.put('/api/settings', wrap((req, res) => {
  res.json(write('settings', { ...read('settings'), ...req.body }));
}));

// seleção manual de outro produto / preço manual
app.put('/api/results/:itemId/:storeId', wrap((req, res) => {
  const results = read('results');
  const r = results[req.params.itemId]?.[req.params.storeId];
  if (!r) throw new Error('Resultado não encontrado');
  if ('selected' in req.body) r.selected = req.body.selected === null ? null : Number(req.body.selected);
  if ('manualPrice' in req.body) r.manualPrice = req.body.manualPrice === null || req.body.manualPrice === '' ? null : Number(req.body.manualPrice);
  write('results', results);
  res.json(r);
}));

// ---------- busca ----------
const jobs = new Map();

function defaultSelection(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const valid = candidates
    .map((c, idx) => ({ ...c, idx }))
    .filter((c) => c.price > 0);
  if (!valid.length) return null;
  const exacts = valid.filter((c) => c.matchType === 'exact');
  const pool = exacts.length > 0 ? exacts : valid;
  const maxScore = Math.max(...pool.map((c) => c.score ?? 0));
  const topTier = pool.filter((c) => (c.score ?? 0) >= maxScore - 0.08);
  topTier.sort((a, b) => a.price - b.price);
  return topTier[0].idx;
}

app.post('/api/search', wrap((req, res) => {
  const settings = read('settings');
  const list = read('list');
  const itemIds = req.body?.itemIds;
  const items = itemIds ? list.filter((it) => itemIds.includes(it.id)) : list;
  const stores = read('stores').filter(
    (s) => s.enabled && (!req.body?.storeIds || req.body.storeIds.includes(s.id))
  );
  if (!items.length) throw new Error('A lista de compras está vazia.');
  if (!stores.length) throw new Error('Nenhuma loja ativa.');

  const busy = stores.find((s) => scraper.isLoginOpen(s.id));
  if (busy) throw new Error(`Feche a janela de login de ${busy.name} antes de buscar.`);

  const id = crypto.randomUUID();
  const job = { id, total: items.length * stores.length, done: 0, running: true, errors: [], startedAt: Date.now() };
  jobs.set(id, job);

  Promise.all(
    stores.map((store) =>
      scraper
        .searchStore(store, items, settings, (r) => {
          const results = read('results');
          results[r.itemId] ??= {};
          results[r.itemId][r.storeId] = {
            candidates: r.candidates,
            selected: defaultSelection(r.candidates, settings.minMatch ?? 0.6),
            manualPrice: null,
            error: r.error,
            method: r.method,
            searchUrl: r.searchUrl,
            at: new Date().toISOString(),
          };
          write('results', results);
          job.done++;
        })
        .catch((e) => {
          job.errors.push(`${store.name}: ${e.message.split('\n')[0]}`);
          job.done += items.length;
        })
    )
  ).finally(() => {
    job.running = false;
    setTimeout(() => jobs.delete(id), 10 * 60 * 1000);
  });

  res.json(job);
}));

app.get('/api/search/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Busca não encontrada' });
  res.json({ ...job, results: read('results') });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Comparador de Preços rodando em http://localhost:${PORT}`));
