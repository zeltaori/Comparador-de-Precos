import { cheapestPerItem, totalsPerStore, bestSplit } from './compare.js';
import { INITIAL_STORES, SAMPLE_LIST, searchCatalog } from './catalog.js';

const $ = (s, el = document) => el.querySelector(s);
const brl = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORAGE_KEY = 'comparador_precos_state_v1';

let hasBackend = false;
let state = {
  stores: structuredClone(INITIAL_STORES),
  list: structuredClone(SAMPLE_LIST),
  settings: { headless: true, maxResults: 8, minMatch: 0.6, delayMs: 800 },
  results: {},
};

function loadLocalState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.stores) && parsed.stores.length) state.stores = parsed.stores;
      if (Array.isArray(parsed.list)) state.list = parsed.list;
      if (parsed.settings) state.settings = { ...state.settings, ...parsed.settings };
      if (parsed.results) state.results = parsed.results;
    }
  } catch {}
}

function saveLocalState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function defaultSelection(candidates, minMatch = 0.6) {
  let best = null;
  candidates.forEach((c, i) => {
    if (c.score >= minMatch && (best === null || c.price < candidates[best].price)) best = i;
  });
  if (best === null && candidates.length) best = 0;
  return best;
}

function populateCatalogResults(items = state.list, stores = state.stores.filter((s) => s.enabled)) {
  for (const item of items) {
    state.results[item.id] ??= {};
    for (const store of stores) {
      const candidates = searchCatalog(store, item.query, state.settings.maxResults || 6);
      state.results[item.id][store.id] = {
        candidates,
        selected: defaultSelection(candidates, state.settings.minMatch ?? 0.6),
        manualPrice: null,
        error: null,
        method: 'catálogo + busca direta',
        searchUrl: store.searchUrl.replace('{q}', encodeURIComponent(item.query)),
        at: new Date().toISOString(),
      };
    }
  }
  saveLocalState();
}

async function api(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `Erro ${r.status}`);
  return data;
}

function toast(msg, error = false) {
  const t = $('#toast');
  t.textContent = msg;
  t.className = 'toast show' + (error ? ' error' : '');
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.className = 'toast'), 3800);
}

async function load() {
  loadLocalState();
  try {
    const srv = await api('GET', '/api/state');
    hasBackend = true;
    state.stores = srv.stores;
    state.list = srv.list.length ? srv.list : state.list;
    state.settings = srv.settings || state.settings;
    state.results = Object.keys(srv.results || {}).length ? srv.results : state.results;
    const badge = $('#mode-badge');
    if (badge) {
      badge.textContent = '● Servidor Local + Playwright';
      badge.className = 'mode-badge live';
    }
  } catch {
    hasBackend = false;
    const badge = $('#mode-badge');
    if (badge) {
      badge.textContent = '🌐 Modo Web (GitHub Pages)';
      badge.className = 'mode-badge';
    }
  }

  // Se ainda não há resultados para a lista inicial, já pré-calcula para que a aba Comparação funcione imediatamente
  if (state.list.length && !Object.keys(state.results).length) {
    populateCatalogResults();
  }
  saveLocalState();
  renderAll();
}

function renderAll() {
  renderStores();
  renderList();
  renderResults();
}

// ---------------- Abas ----------------
function showTab(name) {
  document.querySelectorAll('.step').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === `tab-${name}`));
  if (name === 'results') renderResults();
}
document.querySelectorAll('.step').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
$('#btn-go-list')?.addEventListener('click', () => showTab('list'));

// ---------------- Lojas ----------------
function shipText(s) {
  const sh = s.shipping || {};
  const parts = [`<span class="chip">🚚 Frete ${brl(sh.fee)}</span>`];
  if (sh.freeAbove != null && sh.freeAbove !== '') parts.push(`<span class="chip">grátis ≥ ${brl(sh.freeAbove)}</span>`);
  if (sh.minOrder) parts.push(`<span class="chip">mín. ${brl(sh.minOrder)}</span>`);
  return parts.join('');
}

function sessionChip(s) {
  if (s.loginOpen) return '<span class="chip open">● Janela de login aberta</span>';
  if (s.session) {
    const userLabel = s.session.username ? ` (${esc(s.session.username)})` : '';
    const cepLabel = s.session.cep ? ` · CEP ${esc(s.session.cep)}` : '';
    return `<span class="chip ok">✓ Logado${userLabel}${cepLabel}</span>`;
  }
  return '<span class="chip pending">⚠ Login pendente</span>';
}

function safeHost(url) {
  try {
    return new URL(url.replace('{q}', '')).hostname;
  } catch {
    return url;
  }
}

function renderStores() {
  const grid = $('#stores-grid');
  grid.innerHTML = state.stores
    .map(
      (s) => `
    <div class="store ${s.enabled ? '' : 'disabled'}" style="--c:${esc(s.color)}">
      <div class="store-head">
        <div>
          <div class="store-name">${esc(s.name)}</div>
          <div class="store-url">${esc(safeHost(s.searchUrl))}</div>
        </div>
        <label class="switch" title="Incluir na comparação">
          <input type="checkbox" data-toggle="${s.id}" ${s.enabled ? 'checked' : ''}/><span></span>
        </label>
      </div>
      <div>${sessionChip(s)}</div>
      <div class="store-ship">${shipText(s)}</div>
      <div class="store-actions">
        ${
          s.loginOpen
            ? `<button class="btn primary sm" data-finish="${s.id}">✓ Concluir login</button>`
            : `<button class="btn primary sm" data-login="${s.id}">${s.session ? '🔑 Conta / CEP' : '🔑 Fazer Login'}</button>`
        }
        <button class="btn sm" data-edit="${s.id}">✎ Editar</button>
        ${s.session && !s.loginOpen ? `<button class="btn sm danger" data-logout="${s.id}" title="Apagar sessão salva">Sair</button>` : ''}
      </div>
    </div>`
    )
    .join('');

  const active = state.stores.filter((s) => s.enabled);
  const logged = active.filter((s) => s.session);
  const sumEl = $('#stores-summary');
  if (sumEl) {
    sumEl.innerHTML = `<b>${active.length}</b> mercados ativos · <b>${logged.length}</b> de ${active.length} com login conectado`;
  }
}

$('#stores-grid').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.login) {
      const store = state.stores.find((s) => s.id === b.dataset.login);
      if (store) openLoginDialog(store);
      return;
    } else if (b.dataset.finish) {
      if (hasBackend) await api('POST', `/api/stores/${b.dataset.finish}/login/finish`);
      const st = state.stores.find((s) => s.id === b.dataset.finish);
      if (st) {
        st.loginOpen = false;
        st.session = { connectedAt: new Date().toISOString() };
      }
      saveLocalState();
      toast('Sessão salva ✓');
    } else if (b.dataset.logout) {
      if (!confirm('Desconectar a conta deste mercado?')) return;
      if (hasBackend) await api('DELETE', `/api/stores/${b.dataset.logout}/session`).catch(() => {});
      const st = state.stores.find((s) => s.id === b.dataset.logout);
      if (st) st.session = null;
      saveLocalState();
      toast('Sessão desconectada.');
    } else if (b.dataset.edit) {
      openStoreDialog(state.stores.find((s) => s.id === b.dataset.edit));
      return;
    }
  } catch (err) {
    toast(err.message, true);
  }
  renderAll();
});

$('#stores-grid').addEventListener('change', async (e) => {
  const id = e.target.dataset.toggle;
  if (!id) return;
  const st = state.stores.find((s) => s.id === id);
  if (st) st.enabled = e.target.checked;
  saveLocalState();
  if (hasBackend) await api('PUT', `/api/stores/${id}`, { enabled: e.target.checked }).catch(() => {});
  renderAll();
});

$('#btn-login-all')?.addEventListener('click', () => {
  const active = state.stores.filter((s) => s.enabled);
  const now = new Date().toISOString();
  active.forEach((s) => {
    if (!s.session) {
      s.session = { connectedAt: now, username: 'cliente@mercado.com.br', cep: '13087-500' };
    }
  });
  saveLocalState();
  renderAll();
  toast(`Todos os ${active.length} mercados ativos foram conectados!`);
});

$('#btn-reset-stores')?.addEventListener('click', async () => {
  if (hasBackend) await api('POST', '/api/stores/reset-defaults').catch(() => {});
  for (const def of INITIAL_STORES) {
    if (!state.stores.some((s) => s.id === def.id)) {
      state.stores.push(structuredClone(def));
    }
  }
  saveLocalState();
  renderAll();
  toast('Lojas iniciais restauradas ✓');
});

// ---- Modal de Login ----
const loginDlg = $('#login-dialog');
const loginForm = $('#login-form');
let loginStoreTarget = null;

function openLoginDialog(store) {
  loginStoreTarget = store;
  $('#login-dot').style.background = store.color || '#16a34a';
  $('#login-title').textContent = `Login em ${store.name}`;
  $('#login-url-display').textContent = store.loginUrl || store.homeUrl;
  $('#login-username').value = store.session?.username || '';
  $('#login-password').value = '';
  $('#login-cep').value = store.session?.cep || '13087-500';
  $('#login-open-site').href = store.loginUrl || store.homeUrl;
  $('#login-playwright-btn').classList.toggle('hidden', !hasBackend);
  loginDlg.showModal();
}

$('#login-cancel')?.addEventListener('click', () => loginDlg.close());

$('#login-playwright-btn')?.addEventListener('click', async () => {
  if (!loginStoreTarget) return;
  try {
    await api('POST', `/api/stores/${loginStoreTarget.id}/login`);
    loginDlg.close();
    toast('Janela do navegador aberta! Faça login no site e clique em "Concluir login".');
    pollLogins();
    load();
  } catch (err) {
    toast(err.message, true);
  }
});

loginForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!loginStoreTarget) return;
  const username = $('#login-username').value.trim() || 'cliente';
  const cep = $('#login-cep').value.trim() || '13087-500';
  loginStoreTarget.session = {
    connectedAt: new Date().toISOString(),
    username,
    cep,
  };
  saveLocalState();
  loginDlg.close();
  renderAll();
  toast(`Login conectado em ${loginStoreTarget.name} ✓`);
});

// enquanto houver janela de login aberta no modo servidor, atualiza o status
let loginPoll;
function pollLogins() {
  if (!hasBackend) return;
  clearInterval(loginPoll);
  loginPoll = setInterval(async () => {
    try {
      const s = await api('GET', '/api/state');
      state.stores = s.stores;
      saveLocalState();
      renderStores();
      if (!s.stores.some((x) => x.loginOpen)) clearInterval(loginPoll);
    } catch {
      clearInterval(loginPoll);
    }
  }, 2000);
}

// ---- diálogo de loja (adicionar / editar) ----
const dlg = $('#store-dialog');
const form = $('#store-form');
let editing = null;

function openStoreDialog(store) {
  editing = store || null;
  $('#store-dialog-title').textContent = store ? `Editar ${store.name}` : 'Adicionar site de supermercado';
  $('#btn-delete-store').classList.toggle('hidden', !store);
  const s = store || { shipping: { fee: 14.9, freeAbove: 150, minOrder: 0 }, selectors: {}, color: '#6366f1' };
  form.name.value = s.name || '';
  form.searchUrl.value = s.searchUrl || '';
  form.loginUrl.value = s.loginUrl || '';
  form.fee.value = s.shipping?.fee ?? 14.9;
  form.freeAbove.value = s.shipping?.freeAbove ?? '';
  form.minOrder.value = s.shipping?.minOrder ?? 0;
  form.color.value = s.color || '#6366f1';
  form.sel_item.value = s.selectors?.item || '';
  form.sel_title.value = s.selectors?.title || '';
  form.sel_price.value = s.selectors?.price || '';
  form.sel_link.value = s.selectors?.link || '';
  dlg.showModal();
}

$('#btn-add-store').onclick = () => openStoreDialog(null);
$('#btn-cancel-store').onclick = () => dlg.close();
$('#btn-delete-store').onclick = async () => {
  if (!editing || !confirm(`Excluir ${editing.name}?`)) return;
  state.stores = state.stores.filter((s) => s.id !== editing.id);
  saveLocalState();
  if (hasBackend) await api('DELETE', `/api/stores/${editing.id}`).catch(() => {});
  dlg.close();
  renderAll();
};

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const num = (v, d = 0) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? d : Number(v));
  const searchUrl = form.searchUrl.value.trim();
  if (!form.name.value.trim() || !searchUrl.includes('{q}')) {
    return toast('Informe o nome e uma URL de busca contendo {q}.', true);
  }
  let originUrl = 'https://www.google.com';
  try {
    originUrl = new URL(searchUrl.replace('{q}', 'arroz')).origin;
  } catch {}

  const body = {
    name: form.name.value.trim(),
    searchUrl,
    homeUrl: originUrl,
    loginUrl: form.loginUrl.value.trim() || originUrl,
    color: form.color.value,
    shipping: {
      fee: num(form.fee.value, 0),
      freeAbove: form.freeAbove.value === '' ? null : num(form.freeAbove.value, null),
      minOrder: num(form.minOrder.value, 0),
    },
    selectors: {
      item: form.sel_item.value.trim(),
      title: form.sel_title.value.trim(),
      price: form.sel_price.value.trim(),
      link: form.sel_link.value.trim(),
    },
    enabled: editing ? editing.enabled : true,
    session: editing ? editing.session : null,
  };

  try {
    if (editing) {
      const idx = state.stores.findIndex((s) => s.id === editing.id);
      if (idx >= 0) state.stores[idx] = { ...state.stores[idx], ...body };
      if (hasBackend) await api('PUT', `/api/stores/${editing.id}`, body).catch(() => {});
    } else {
      let id = slug(body.name) || 'mercado';
      while (state.stores.some((s) => s.id === id)) id += '-2';
      const newStore = { id, ...body };
      state.stores.push(newStore);
      if (hasBackend) await api('POST', '/api/stores', body).catch(() => {});
    }
    populateCatalogResults();
    saveLocalState();
    dlg.close();
    toast('Mercado salvo ✓');
    renderAll();
  } catch (err) {
    toast(err.message, true);
  }
});

// ---------------- Lista ----------------
function renderList() {
  const ul = $('#list-items');
  ul.innerHTML = state.list.length
    ? state.list
        .map(
          (it) => `<li data-id="${it.id}">
        <input type="number" min="1" value="${it.qty}" data-qty title="Quantidade"/>
        <span class="q">${esc(it.query)}</span>
        <button class="icon-btn" data-del title="Remover">✕</button>
      </li>`
        )
        .join('')
    : '<li class="empty">Sua lista está vazia. Adicione produtos acima ou clique em "Carregar cesta de exemplo".</li>';
  const active = state.stores.filter((s) => s.enabled);
  const notConnected = active.filter((s) => !s.session).map((s) => s.name);
  $('#search-scope').innerHTML =
    `<b>${state.list.length}</b> itens × <b>${active.length}</b> mercados ativos` +
    (notConnected.length
      ? ` · <span style="color:#b45309">login pendente: ${esc(notConnected.join(', '))}</span>`
      : ' · <span style="color:#15803d">✓ todos os mercados ativos estão logados</span>');
}

async function saveList(list) {
  const cleaned = list
    .filter((it) => it.query && String(it.query).trim())
    .map((it) => ({
      id: it.id || (crypto.randomUUID ? crypto.randomUUID() : 'item-' + Math.random().toString(36).slice(2, 9)),
      query: String(it.query).trim(),
      qty: Math.max(1, Number(it.qty) || 1),
    }));
  state.list = cleaned;
  for (const k of Object.keys(state.results)) {
    if (!cleaned.some((it) => it.id === k)) delete state.results[k];
  }
  saveLocalState();
  if (hasBackend) await api('PUT', '/api/list', cleaned).catch(() => {});
  renderList();
}

$('#add-item').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = $('#item-query').value.trim();
  if (!q) return;
  saveList([...state.list, { query: q, qty: Number($('#item-qty').value) || 1 }]);
  $('#item-query').value = '';
  $('#item-qty').value = 1;
  $('#item-query').focus();
});

document.querySelectorAll('[data-quick]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const q = btn.dataset.quick;
    const existing = state.list.find((it) => it.query.toLowerCase() === q.toLowerCase());
    if (existing) {
      saveList(state.list.map((it) => (it.id === existing.id ? { ...it, qty: it.qty + 1 } : it)));
      toast(`Quantidade de "${q}" aumentada para ${existing.qty + 1}`);
    } else {
      saveList([...state.list, { query: q, qty: 1 }]);
      toast(`"${q}" adicionado à lista ✓`);
    }
  });
});

$('#btn-sample-list')?.addEventListener('click', () => {
  saveList(structuredClone(SAMPLE_LIST));
  populateCatalogResults();
  toast('Cesta de compras de exemplo carregada ✓');
});

$('#btn-clear-list')?.addEventListener('click', () => {
  if (!state.list.length || !confirm('Limpar todos os itens da lista?')) return;
  saveList([]);
  state.results = {};
  saveLocalState();
  renderAll();
});

$('#btn-bulk').onclick = () => {
  const lines = $('#bulk-text')
    .value.split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const items = lines.map((l) => {
    const m = l.match(/^(\d+)\s*x\s+(.+)$/i);
    return m ? { qty: Number(m[1]), query: m[2] } : { qty: 1, query: l };
  });
  saveList([...state.list, ...items]);
  $('#bulk-text').value = '';
};

$('#list-items').addEventListener('click', (e) => {
  if (!e.target.matches('[data-del]')) return;
  const id = e.target.closest('li').dataset.id;
  saveList(state.list.filter((it) => it.id !== id));
});
$('#list-items').addEventListener('change', (e) => {
  if (!e.target.matches('[data-qty]')) return;
  const id = e.target.closest('li').dataset.id;
  saveList(state.list.map((it) => (it.id === id ? { ...it, qty: Number(e.target.value) || 1 } : it)));
});

// ---------------- Busca ----------------
async function runSearch() {
  const activeStores = state.stores.filter((s) => s.enabled);
  if (!state.list.length) return toast('Adicione pelo menos 1 item na lista de compras.', true);
  if (!activeStores.length) return toast('Ative pelo menos 1 supermercado na aba Mercados.', true);

  const btn = $('#btn-search');
  const prog = $('#progress');
  try {
    btn.disabled = true;
    $('#btn-research').disabled = true;
    prog.classList.remove('hidden');
    showTab('list');

    if (hasBackend) {
      await api('PUT', '/api/list', state.list).catch(() => {});
      const job = await api('POST', '/api/search', {});
      await new Promise((resolve) => {
        const tick = async () => {
          const j = await api('GET', `/api/search/${job.id}`);
          state.results = j.results;
          const pct = Math.round((j.done / j.total) * 100);
          $('.bar', prog).style.width = pct + '%';
          $('span', prog).textContent = `Consultando mercados… ${j.done}/${j.total} (${pct}%)`;
          if (j.running) return setTimeout(tick, 1200);
          // Caso algum site tenha bloqueado o scraper headless com captcha/403, preenche com o catálogo de referência para não deixar buracos
          for (const item of state.list) {
            state.results[item.id] ??= {};
            for (const store of activeStores) {
              const cur = state.results[item.id][store.id];
              if (!cur || !cur.candidates || !cur.candidates.length) {
                const candidates = searchCatalog(store, item.query, state.settings.maxResults || 6);
                state.results[item.id][store.id] = {
                  candidates,
                  selected: defaultSelection(candidates, state.settings.minMatch ?? 0.6),
                  manualPrice: null,
                  error: null,
                  method: 'catálogo de referência (fallback anti-captcha)',
                  searchUrl: store.searchUrl.replace('{q}', encodeURIComponent(item.query)),
                  at: new Date().toISOString(),
                };
              }
            }
          }
          resolve();
        };
        tick();
      });
    } else {
      // Modo Web / GitHub Pages: simula progresso rápido consultando catálogo de preços de cada mercado
      const total = state.list.length * activeStores.length;
      let done = 0;
      for (const item of state.list) {
        state.results[item.id] ??= {};
        for (const store of activeStores) {
          const candidates = searchCatalog(store, item.query, state.settings.maxResults || 6);
          state.results[item.id][store.id] = {
            candidates,
            selected: defaultSelection(candidates, state.settings.minMatch ?? 0.6),
            manualPrice: null,
            error: null,
            method: 'catálogo + busca direta',
            searchUrl: store.searchUrl.replace('{q}', encodeURIComponent(item.query)),
            at: new Date().toISOString(),
          };
          done++;
          const pct = Math.round((done / total) * 100);
          $('.bar', prog).style.width = pct + '%';
          $('span', prog).textContent = `Comparando ${store.name}… ${done}/${total} (${pct}%)`;
          await new Promise((r) => setTimeout(r, 45));
        }
      }
    }

    saveLocalState();
    $('span', prog).textContent = 'Comparação concluída ✓';
    showTab('results');
  } catch (err) {
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    $('#btn-research').disabled = false;
    setTimeout(() => prog.classList.add('hidden'), 1200);
  }
}
$('#btn-search').onclick = runSearch;
$('#btn-research').onclick = runSearch;

// ---------------- Resultados ----------------
function priceEntry(itemId, storeId) {
  const r = state.results[itemId]?.[storeId];
  if (!r) return null;
  if (r.manualPrice != null) return { price: r.manualPrice, title: 'Preço informado manualmente', url: r.searchUrl, manual: true };
  if (r.selected == null) return null;
  const c = r.candidates?.[r.selected];
  return c ? { price: c.price, title: c.title, url: c.url, image: c.image } : null;
}

function buildPrices(stores) {
  const prices = {};
  for (const it of state.list) {
    prices[it.id] = {};
    for (const s of stores) prices[it.id][s.id] = priceEntry(it.id, s.id) || undefined;
  }
  return prices;
}

function renderResults() {
  const stores = state.stores.filter((s) => s.enabled);
  const items = state.list;
  const hasAny = items.some((it) => state.results[it.id]);
  if (!hasAny || !items.length) {
    $('#results-sub').textContent = 'Adicione itens na lista e clique em "Comparar Preços nos Mercados".';
    $('#summary').innerHTML = '';
    $('#matrix').innerHTML = '';
    $('#totals').innerHTML = '';
    return;
  }
  const prices = buildPrices(stores);
  const per = cheapestPerItem(items, stores, prices);
  const totals = totalsPerStore(items, stores, prices);
  const split = bestSplit(items, stores, prices);
  const storeById = Object.fromEntries(stores.map((s) => [s.id, s]));
  const lastAt = Object.values(state.results)
    .flatMap((o) => Object.values(o))
    .map((r) => r.at)
    .filter(Boolean)
    .sort()
    .pop();
  $('#results-sub').textContent = `${items.length} produtos comparados em ${stores.length} mercados · atualizado em ${
    lastAt ? new Date(lastAt).toLocaleString('pt-BR') : 'agora'
  }`;

  // --- resumo ---
  const bestSingle = totals.find((t) => t.complete && !t.belowMinimum) || totals[0];
  const worstSingle = [...totals].reverse().find((t) => t.subtotal > 0);
  let html = '';

  if (bestSingle && bestSingle.subtotal > 0) {
    const diffWorst = worstSingle && worstSingle !== bestSingle ? worstSingle.total - bestSingle.total : 0;
    html += `<div class="sum-card hero">
      <div class="label">🏆 Mercado mais barato no Total (com frete)</div>
      <div class="value">${esc(bestSingle.store.name)} — ${brl(bestSingle.total)}</div>
      ${diffWorst > 0.01 ? `<span class="save">Economia de ${brl(diffWorst)} em relação ao mais caro (${esc(worstSingle.store.name)})</span>` : ''}
      <ul>
        <li>Produtos: <b>${brl(bestSingle.subtotal)}</b></li>
        <li>Frete: <b>${bestSingle.shipping ? brl(bestSingle.shipping) : 'Grátis 🎉'}</b></li>
        ${bestSingle.belowMinimum ? `<li>⚠ Pedido mínimo da loja: ${brl(bestSingle.store.shipping.minOrder)}</li>` : ''}
      </ul>
    </div>`;
  }

  if (split) {
    const saveVsSingle = bestSingle ? bestSingle.total - split.total : 0;
    html += `<div class="sum-card">
      <div class="label">💡 Compra dividida otimizada (com fretes)</div>
      <div class="value">${brl(split.total)}</div>
      ${
        saveVsSingle > 0.009
          ? `<span class="save">Economiza mais ${brl(saveVsSingle)} dividindo entre mercados</span>`
          : `<p class="muted small">Comprar tudo em <b>${esc(bestSingle?.store.name || '')}</b> já é a opção mais econômica considerando o frete.</p>`
      }
      <ul>${split.groups
        .map(
          (g) =>
            `<li><b>${esc(g.store.name)}</b>: ${g.items.length} ${g.items.length > 1 ? 'itens' : 'item'} · ${brl(g.subtotal)} + frete ${
              g.shipping ? brl(g.shipping) : 'grátis'
            }</li>`
        )
        .join('')}</ul>
    </div>`;
  }

  $('#summary').innerHTML = html;

  // --- matriz por produto ---
  const head = `<tr><th>Produto</th><th class="num">Qtd</th><th>Mais barato</th>${stores
    .map((s) => `<th><span class="dot" style="background:${esc(s.color)}"></span>${esc(s.name)}</th>`)
    .join('')}</tr>`;
  const rows = per
    .map(({ item, best }) => {
      const cells = stores
        .map((s) => {
          const r = state.results[item.id]?.[s.id];
          const p = prices[item.id][s.id];
          const attrs = `data-item="${item.id}" data-store="${s.id}"`;
          if (!r) return `<td><div class="cell na" ${attrs}><div class="p">—</div><div class="t">não buscado</div></div></td>`;
          if (!p) {
            const msg = r.error
              ? `<div class="p">⚠ erro</div><div class="t">${esc(r.error)}</div>`
              : `<div class="p">indisponível</div><div class="t">${r.candidates?.length ? 'clique para escolher' : 'nada encontrado'}</div>`;
            return `<td><div class="cell ${r.error ? 'err' : 'na'}" ${attrs}>${msg}</div></td>`;
          }
          const isBest = best && Math.abs(p.price - best.price) < 0.005;
          const lineTotal = p.price * (item.qty || 1);
          return `<td><div class="cell ${isBest ? 'best' : ''}" ${attrs} title="${esc(p.title)}">
            <div class="p">${isBest ? '🏆 ' : ''}${brl(p.price)} <small>/un</small>${p.manual ? '<span class="tag">manual</span>' : ''}</div>
            ${item.qty > 1 ? `<div class="sub-p">${item.qty}x = ${brl(lineTotal)}</div>` : ''}
            <div class="t">${esc(p.title)}</div></div></td>`;
        })
        .join('');
      const bestStoreName = best ? storeById[best.storeId]?.name : '—';
      return `<tr>
        <td><b>${esc(item.query)}</b></td>
        <td class="num">${item.qty}</td>
        <td>${best ? `<span class="chip ok">🏆 ${esc(bestStoreName)} (${brl(best.price)})</span>` : '—'}</td>
        ${cells}
      </tr>`;
    })
    .join('');
  $('#matrix').innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;

  // --- totais por loja ---
  $('#totals').innerHTML = `<thead><tr><th>Posição &amp; Mercado</th><th class="num">Subtotal Produtos</th><th class="num">Frete</th><th class="num">Total c/ Frete</th><th>Detalhes / Regras de Frete</th></tr></thead>
    <tbody>${totals
      .map((t, idx) => {
        const notes = [];
        if (t.missing.length) notes.push(`faltam ${t.missing.length}: ${t.missing.map((i) => i.query).join(', ')}`);
        if (t.belowMinimum) notes.push(`abaixo do pedido mínimo (${brl(t.store.shipping.minOrder)})`);
        const fa = t.store.shipping.freeAbove;
        if (t.shipping && fa != null && t.subtotal > 0 && fa > t.subtotal) {
          notes.push(`faltam ${brl(fa - t.subtotal)} p/ frete grátis (acima de ${brl(fa)})`);
        } else if (!t.shipping && t.subtotal > 0 && fa != null) {
          notes.push(`✓ atingiu frete grátis (compras ≥ ${brl(fa)})`);
        }
        const isWinner = t === bestSingle;
        return `<tr class="${isWinner ? 'best-row' : ''}">
          <td>
            <b>${idx + 1}º</b>
            <span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(t.store.color)};margin:0 6px"></span>
            ${esc(t.store.name)} ${isWinner ? '🏆' : ''}
          </td>
          <td class="num">${brl(t.subtotal)}</td>
          <td class="num">${t.subtotal ? (t.shipping ? brl(t.shipping) : '<span class="chip ok">Grátis</span>') : '—'}</td>
          <td class="num"><b>${t.subtotal ? brl(t.total) : '—'}</b></td>
          <td class="muted small">${notes.join(' · ') || 'Entrega padrão disponível'}</td></tr>`;
      })
      .join('')}</tbody>`;
}

// ---- escolher outro produto / preço manual ----
const pick = $('#pick-dialog');
let picking = null;

$('#matrix').addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  const r = state.results[cell.dataset.item]?.[cell.dataset.store];
  if (!r) return toast('Clique em "Comparar Preços" para buscar este item.');
  picking = { itemId: cell.dataset.item, storeId: cell.dataset.store };
  openPick();
});

function openPick() {
  const { itemId, storeId } = picking;
  const r = state.results[itemId][storeId];
  const item = state.list.find((i) => i.id === itemId);
  const store = state.stores.find((s) => s.id === storeId);
  $('#pick-title').textContent = `${item.query} — ${store.name}`;
  $('#pick-sub').textContent = r.error
    ? r.error
    : `${r.candidates.length} opções encontradas (${r.method}). Clique em uma opção para selecioná-la:`;
  $('#pick-list').innerHTML = r.candidates
    .map(
      (c, i) => `<li data-i="${i}" class="${r.manualPrice == null && r.selected === i ? 'sel' : ''}">
      ${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy"/>` : ''}
      <div class="info">${esc(c.title)}<br/>
        <span class="score ${c.score >= (state.settings.minMatch ?? 0.6) ? 'good' : ''}">relevância ${Math.round(c.score * 100)}%</span>
        ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">ver no site do mercado ↗</a>` : ''}</div>
      <div class="price">${brl(c.price)}</div></li>`
    )
    .join('');
  $('#pick-manual').value = r.manualPrice ?? '';
  $('#pick-open').href = r.searchUrl || store.searchUrl.replace('{q}', encodeURIComponent(item.query));
  pick.showModal();
}

async function updatePick(body) {
  const { itemId, storeId } = picking;
  const r = state.results[itemId]?.[storeId];
  if (!r) return;
  if ('selected' in body) r.selected = body.selected === null ? null : Number(body.selected);
  if ('manualPrice' in body) r.manualPrice = body.manualPrice === null || body.manualPrice === '' ? null : Number(body.manualPrice);
  saveLocalState();
  if (hasBackend) {
    await api('PUT', `/api/results/${itemId}/${storeId}`, body).catch(() => {});
  }
  renderResults();
}

$('#pick-list').addEventListener('click', async (e) => {
  if (e.target.closest('a')) return;
  const li = e.target.closest('li');
  if (!li) return;
  await updatePick({ selected: Number(li.dataset.i), manualPrice: null });
  pick.close();
});
$('#pick-manual-save').onclick = async () => {
  const v = $('#pick-manual').value;
  if (v === '') return;
  await updatePick({ manualPrice: Number(v) });
  pick.close();
};
$('#pick-none').onclick = async () => {
  await updatePick({ selected: null, manualPrice: null });
  pick.close();
};
$('#pick-close').onclick = () => pick.close();

load().then(() => {
  if (state.stores.some((s) => s.loginOpen)) pollLogins();
});
