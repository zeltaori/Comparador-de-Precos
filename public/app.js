import { cheapestPerItem, totalsPerStore, bestSplit } from './compare.js';
import {
  INITIAL_STORES,
  SAMPLE_LIST,
  selectBestCandidate,
  rankAndFilterCandidates,
  buildFallbackQueries,
  parseLeadingQty,
  extractMeasures,
  norm,
} from './catalog.js';

const $ = (s, el = document) => el.querySelector(s);
const brl = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORAGE_KEY = 'comparador_precos_real_v3';

let hasBackend = false;
let apiBase = '';
let realSnapshot = {};

let state = {
  stores: structuredClone(INITIAL_STORES),
  list: structuredClone(SAMPLE_LIST),
  settings: { headless: true, maxResults: 8, minMatch: 0.55, delayMs: 600 },
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

async function loadRealSnapshot() {
  try {
    const r = await fetch('./real-snapshot.json');
    if (r.ok) {
      realSnapshot = await r.json();
    }
  } catch {}
}

// Vincula resultados reais já extraídos (por ID ou mesma query normalizada) sem NUNCA inventar preços fictícios
function syncSnapshotResults(items = state.list, stores = state.stores.filter((s) => s.enabled)) {
  const snapByQuery = {};
  for (const [, byStore] of Object.entries(realSnapshot)) {
    const firstStore = Object.values(byStore || {})[0];
    if (firstStore?.querySnapshot) {
      snapByQuery[norm(firstStore.querySnapshot)] = byStore;
    }
  }

  for (const item of items) {
    state.results[item.id] ??= {};
    const matchedSnap = realSnapshot[item.id] || snapByQuery[norm(item.query)];
    for (const store of stores) {
      const existing = state.results[item.id][store.id];
      if (existing && existing.querySnapshot === item.query && (existing.candidates?.length || existing.error)) {
        continue;
      }
      if (matchedSnap && matchedSnap[store.id] && norm(matchedSnap[store.id].querySnapshot) === norm(item.query)) {
        const snapEntry = structuredClone(matchedSnap[store.id]);
        snapEntry.selected = selectBestCandidate(snapEntry.candidates);
        state.results[item.id][store.id] = snapEntry;
      }
    }
  }
}

async function api(method, url, body) {
  const r = await fetch(apiBase + url, {
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
  t._h = setTimeout(() => (t.className = 'toast'), 4200);
}

async function detectBackend() {
  for (const base of ['', 'http://localhost:3000']) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch(base + '/api/state', { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok) {
        apiBase = base;
        return await r.json();
      }
    } catch {}
  }
  return null;
}

async function load() {
  loadLocalState();
  await loadRealSnapshot();

  const srv = await detectBackend();
  const badge = $('#mode-badge');
  if (srv) {
    hasBackend = true;
    state.stores = srv.stores;
    state.list = srv.list.length ? srv.list : state.list;
    state.settings = srv.settings || state.settings;
    if (Object.keys(srv.results || {}).length) {
      state.results = srv.results;
    }
    if (badge) {
      badge.textContent = '● Preços Reais ao Vivo (Servidor + Playwright)';
      badge.className = 'mode-badge live';
    }
  } else {
    hasBackend = false;
    if (badge) {
      badge.textContent = '🌐 GitHub Pages (Apenas Preços Reais — Sem Fictícios)';
      badge.className = 'mode-badge';
    }
  }

  syncSnapshotResults(state.list, state.stores.filter((s) => s.enabled));
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
  if (name === 'results') {
    renderResults();
  }
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
  if (s.loginOpen) return '<span class="chip open">● Janela Playwright aberta</span>';
  if (s.awaitingOfficialConfirm && !s.session) {
    return '<span class="chip open">↗ Página oficial aberta — clique em "Avisar que está logado" após entrar</span>';
  }
  if (s.session) {
    const viaLabel = s.session.method === 'playwright-oficial' ? ' (Playwright)' : ' (Página Oficial)';
    const userLabel = s.session.username ? ` · ${esc(s.session.username)}` : '';
    const cepLabel = s.session.cep ? ` · CEP ${esc(s.session.cep)}` : '';
    return `<span class="chip ok">✓ Logado${viaLabel}${userLabel}${cepLabel}</span>`;
  }
  return '<span class="chip pending">⚠ Não logado — faça login na página oficial</span>';
}

function safeHost(url) {
  try {
    return new URL(url.replace('{q}', '')).hostname;
  } catch {
    return url;
  }
}

async function markStoreLoggedIn(store, opts = {}) {
  if (!store) return;
  const sessionData = {
    connectedAt: new Date().toISOString(),
    method: opts.method || 'pagina-oficial',
    username: opts.username !== undefined ? opts.username : store.session?.username || null,
    cep: opts.cep !== undefined ? opts.cep : store.session?.cep || '13087-500',
  };
  store.session = sessionData;
  store.awaitingOfficialConfirm = false;
  saveLocalState();
  if (hasBackend) {
    await api('POST', `/api/stores/${store.id}/session`, {
      ...sessionData,
      cookieString: opts.cookieString || undefined,
    }).catch(() => {});
  }
  renderAll();
  toast(`✓ Comparador avisado: ${store.name} está marcado como LOGADO na página oficial!`);
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
            ? `<button class="btn primary sm" data-finish="${s.id}">✓ Concluir login no navegador</button>`
            : `
              <button class="btn ${s.session ? '' : 'primary'} sm" data-open-official="${s.id}" title="Abre a página oficial de login deste mercado em uma nova aba">
                ↗ ${s.session ? 'Abrir Site Oficial' : '1. Login na Página Oficial'}
              </button>
              ${
                !s.session
                  ? `<button class="btn sm ${s.awaitingOfficialConfirm ? 'confirm-highlight' : ''}" data-confirm-logged="${s.id}" title="Avise ao comparador que você já fez login na página oficial deste mercado">
                      ✓ 2. Avisar que está logado
                    </button>`
                  : ''
              }
              <button class="btn sm" data-login="${s.id}" title="Configurar CEP, apelido da conta ou abrir Playwright">${
                s.session ? '🔑 CEP / Conta' : '⚙ Opções'
              }</button>
            `
        }
        <button class="btn sm" data-edit="${s.id}">✎ Editar</button>
        ${s.session && !s.loginOpen ? `<button class="btn sm danger" data-logout="${s.id}" title="Desmarcar login deste mercado">Sair</button>` : ''}
      </div>
    </div>`
    )
    .join('');

  const active = state.stores.filter((s) => s.enabled);
  const logged = active.filter((s) => s.session);
  const sumEl = $('#stores-summary');
  if (sumEl) {
    sumEl.innerHTML = `<b>${active.length}</b> mercados ativos · <b>${logged.length}</b> de ${active.length} com login confirmado pelo usuário`;
  }
}

$('#stores-grid').addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  try {
    if (b.dataset.openOfficial) {
      const store = state.stores.find((s) => s.id === b.dataset.openOfficial);
      if (store) {
        window.open(store.loginUrl || store.homeUrl, '_blank', 'noopener');
        if (!store.session) {
          store.awaitingOfficialConfirm = true;
          saveLocalState();
          renderStores();
          toast(`Página oficial de ${store.name} aberta! Após fazer login lá, clique em "✓ 2. Avisar que está logado".`);
        }
      }
      return;
    } else if (b.dataset.confirmLogged) {
      const store = state.stores.find((s) => s.id === b.dataset.confirmLogged);
      if (store) await markStoreLoggedIn(store, { method: 'pagina-oficial' });
      return;
    } else if (b.dataset.login) {
      const store = state.stores.find((s) => s.id === b.dataset.login);
      if (store) openLoginDialog(store);
      return;
    } else if (b.dataset.finish) {
      if (hasBackend) await api('POST', `/api/stores/${b.dataset.finish}/login/finish`);
      const st = state.stores.find((s) => s.id === b.dataset.finish);
      if (st) {
        st.loginOpen = false;
        st.session = { connectedAt: new Date().toISOString(), method: 'playwright-oficial' };
      }
      saveLocalState();
      toast('Sessão salva ✓');
    } else if (b.dataset.logout) {
      if (!confirm('Desmarcar o login deste mercado no comparador?')) return;
      if (hasBackend) await api('DELETE', `/api/stores/${b.dataset.logout}/session`).catch(() => {});
      const st = state.stores.find((s) => s.id === b.dataset.logout);
      if (st) {
        st.session = null;
        st.awaitingOfficialConfirm = false;
      }
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
  syncSnapshotResults(state.list, state.stores.filter((s) => s.enabled));
  saveLocalState();
  if (hasBackend) await api('PUT', `/api/stores/${id}`, { enabled: e.target.checked }).catch(() => {});
  renderAll();
});

$('#btn-login-all')?.addEventListener('click', async () => {
  const active = state.stores.filter((s) => s.enabled);
  for (const s of active) {
    if (!s.session) {
      await markStoreLoggedIn(s, { method: 'pagina-oficial' });
    }
  }
  toast(`✓ Todos os ${active.length} mercados ativos foram marcados como logados no comparador!`);
});

$('#btn-reset-stores')?.addEventListener('click', async () => {
  if (hasBackend) await api('POST', '/api/stores/reset-defaults').catch(() => {});
  for (const def of INITIAL_STORES) {
    if (!state.stores.some((s) => s.id === def.id)) {
      state.stores.push(structuredClone(def));
    }
  }
  syncSnapshotResults(state.list, state.stores.filter((s) => s.enabled));
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
  $('#login-title').textContent = `Login Oficial — ${store.name}`;
  $('#login-url-display').textContent = store.loginUrl || store.homeUrl;
  $('#login-username').value = store.session?.username || '';
  $('#login-cep').value = store.session?.cep || '13087-500';
  if ($('#login-cookies')) $('#login-cookies').value = '';
  $('#login-open-site').href = store.loginUrl || store.homeUrl;
  $('#step-confirm-box')?.classList.toggle('highlight', !!store.awaitingOfficialConfirm);
  $('#login-playwright-btn').classList.toggle('hidden', !hasBackend);
  loginDlg.showModal();
}

$('#login-open-site')?.addEventListener('click', () => {
  if (loginStoreTarget) {
    loginStoreTarget.awaitingOfficialConfirm = true;
    $('#step-confirm-box')?.classList.add('highlight');
    saveLocalState();
    renderStores();
  }
});

$('#btn-confirm-official-login')?.addEventListener('click', async () => {
  if (!loginStoreTarget) return;
  const username = $('#login-username')?.value.trim() || null;
  const cep = $('#login-cep')?.value.trim() || '13087-500';
  const cookieString = $('#login-cookies')?.value.trim() || '';
  await markStoreLoggedIn(loginStoreTarget, { method: 'pagina-oficial', username, cep, cookieString });
  loginDlg.close();
});

$('#login-cancel')?.addEventListener('click', () => loginDlg.close());

$('#login-playwright-btn')?.addEventListener('click', async () => {
  if (!loginStoreTarget) return;
  try {
    await api('POST', `/api/stores/${loginStoreTarget.id}/login`);
    loginDlg.close();
    toast('Janela do navegador aberta! Faça login no site oficial e depois clique em "Concluir login".');
    pollLogins();
    load();
  } catch (err) {
    toast(err.message, true);
  }
});

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!loginStoreTarget) return;
  const username = $('#login-username')?.value.trim() || null;
  const cep = $('#login-cep')?.value.trim() || '13087-500';
  const cookieString = $('#login-cookies')?.value.trim() || '';
  await markStoreLoggedIn(loginStoreTarget, { method: 'pagina-oficial', username, cep, cookieString });
  loginDlg.close();
});

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
        .map((it) => {
          const measures = extractMeasures(it.query);
          const measureBadge = measures.length
            ? `<span class="chip ok" title="Medida/embalagem identificada na busca">📦 ${esc(measures.map((m) => m.label).join(' · '))}</span>`
            : `<span class="chip" title="Sem medida específica na busca">📦 Qualquer tamanho</span>`;
          return `<li data-id="${it.id}">
            <input type="number" min="1" value="${it.qty}" data-qty title="Quantidade de unidades para comprar"/>
            <span class="q">${esc(it.query)}</span>
            ${measureBadge}
            <span class="chip" title="Quantidade na lista">${it.qty} ${it.qty > 1 ? 'unidades' : 'unidade'}</span>
            <button class="icon-btn" data-del title="Remover">✕</button>
          </li>`;
        })
        .join('')
    : '<li class="empty">Sua lista está vazia. Adicione produtos acima ou clique em "Carregar cesta de exemplo".</li>';
  const active = state.stores.filter((s) => s.enabled);
  const totalUnits = state.list.reduce((s, it) => s + (Number(it.qty) || 1), 0);
  $('#search-scope').innerHTML =
    `<b>${state.list.length}</b> produtos (${totalUnits} un. no total) × <b>${active.length}</b> mercados ativos · ` +
    `<span style="color:#15803d">✓ Somente preços reais das lojas (sem preços fictícios)</span>`;
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
  syncSnapshotResults(state.list, state.stores.filter((s) => s.enabled));
  saveLocalState();
  if (hasBackend) await api('PUT', '/api/list', cleaned).catch(() => {});
  renderAll();
}

$('#add-item').addEventListener('submit', (e) => {
  e.preventDefault();
  const rawInput = $('#item-query').value.trim();
  if (!rawInput) return;
  const parsed = parseLeadingQty(rawInput);
  const q = parsed.query;
  const inputQty = Number($('#item-qty').value) || 1;
  const finalQty = parsed.qty != null && inputQty === 1 ? parsed.qty : inputQty;

  const existing = state.list.find((it) => norm(it.query) === norm(q));
  if (existing) {
    saveList(state.list.map((it) => (it.id === existing.id ? { ...it, qty: it.qty + finalQty } : it)));
    toast(`Quantidade de "${existing.query}" atualizada para ${existing.qty + finalQty} un.`);
  } else {
    saveList([...state.list, { query: q, qty: finalQty }]);
    toast(`"${q}" (${finalQty} un.) adicionado à lista ✓`);
  }
  $('#item-query').value = '';
  $('#item-qty').value = 1;
  $('#item-query').focus();
});

document.querySelectorAll('[data-quick]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const q = btn.dataset.quick;
    const existing = state.list.find((it) => norm(it.query) === norm(q));
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
  state.results = {};
  saveList(structuredClone(SAMPLE_LIST));
  toast('Cesta de compras de exemplo carregada com preços reais verificados ✓');
});

$('#btn-clear-list')?.addEventListener('click', () => {
  if (!state.list.length || !confirm('Limpar todos os itens da lista?')) return;
  state.results = {};
  saveList([]);
});

$('#btn-bulk').onclick = () => {
  const lines = $('#bulk-text')
    .value.split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const newItems = [...state.list];
  for (const l of lines) {
    const parsed = parseLeadingQty(l);
    if (!parsed.query) continue;
    const qty = parsed.qty || 1;
    const existing = newItems.find((it) => norm(it.query) === norm(parsed.query));
    if (existing) existing.qty += qty;
    else newItems.push({ qty, query: parsed.query });
  }
  saveList(newItems);
  $('#bulk-text').value = '';
  toast('Itens adicionados à lista ✓');
};

$('#list-items').addEventListener('click', (e) => {
  if (!e.target.matches('[data-del]')) return;
  const id = e.target.closest('li').dataset.id;
  saveList(state.list.filter((it) => it.id !== id));
});
$('#list-items').addEventListener('change', (e) => {
  if (!e.target.matches('[data-qty]')) return;
  const id = e.target.closest('li').dataset.id;
  saveList(state.list.map((it) => (it.id === id ? { ...it, qty: Math.max(1, Number(e.target.value) || 1) } : it)));
});

// ---------------- Busca no modo estático (sem servidor local) ----------------
async function tryBrowserArenaFetch(query, maxLimit = 8) {
  const fetchOne = async (q) => {
    const target =
      'https://www.arenaatacado.com.br/on/demandware.store/Sites-Arena-Site/pt_BR/SearchServices-GetSuggestionsJson?q=' +
      encodeURIComponent(q);
    for (const proxy of [
      `https://api.allorigins.win/raw?url=${encodeURIComponent(target)}`,
      `https://corsproxy.io/?${encodeURIComponent(target)}`,
    ]) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const r = await fetch(proxy, { signal: ctrl.signal });
        clearTimeout(t);
        if (!r.ok) continue;
        const data = await r.json();
        const products = data?.suggestions?.product?.products || [];
        return products
          .map((p) => p.productTileModel)
          .filter((m) => m && m.available !== false && m.price?.defaultPrice?.sales?.value > 0)
          .map((m) => ({
            title: (m.productName || '').trim(),
            price: Number(m.price.defaultPrice.sales.value),
            url: m.productShowFullUrl?.startsWith('http')
              ? m.productShowFullUrl
              : `https://www.arenaatacado.com.br${m.productShowFullUrl || ''}`,
            image: m.images?.large?.[0]?.absURL || null,
          }));
      } catch {}
    }
    return null;
  };

  let raw = await fetchOne(query);
  if (!raw) return null;
  let ranked = rankAndFilterCandidates(query, raw, maxLimit);
  if (!ranked.some((c) => c.matchType === 'exact') || ranked.length < 3) {
    for (const fb of buildFallbackQueries(query)) {
      const fbRaw = await fetchOne(fb);
      if (fbRaw) {
        raw = raw.concat(fbRaw);
        ranked = rankAndFilterCandidates(query, raw, maxLimit);
      }
      if (ranked.length >= 4) break;
    }
  }
  return ranked;
}

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

    // Tenta reconectar ao backend local caso o usuário tenha acabado de iniciar o servidor
    if (!hasBackend) {
      const srv = await detectBackend();
      if (srv) hasBackend = true;
    }

    if (hasBackend) {
      await api('PUT', '/api/list', state.list).catch(() => {});
      const job = await api('POST', '/api/search', {});
      await new Promise((resolve) => {
        const tick = async () => {
          const j = await api('GET', `/api/search/${job.id}`);
          state.results = j.results;
          const pct = Math.round((j.done / j.total) * 100);
          $('.bar', prog).style.width = pct + '%';
          $('span', prog).textContent = `Extraindo preços reais nas lojas… ${j.done}/${j.total} (${pct}%)`;
          if (j.running) return setTimeout(tick, 1200);
          resolve();
        };
        tick();
      });
    } else {
      // Modo Web Estático (GitHub Pages sem localhost:3000 rodando):
      // NUNCA inventa preços. Usa snapshot real verificado ou consulta via proxy quando possível, e informa bloqueio CORS quando não disponível.
      syncSnapshotResults(state.list, activeStores);
      const total = state.list.length * activeStores.length;
      let done = 0;

      for (const item of state.list) {
        state.results[item.id] ??= {};
        for (const store of activeStores) {
          done++;
          const pct = Math.round((done / total) * 100);
          $('.bar', prog).style.width = pct + '%';
          $('span', prog).textContent = `Verificando preços reais de "${item.query}" em ${store.name}… ${done}/${total} (${pct}%)`;

          const cur = state.results[item.id][store.id];
          if (cur && norm(cur.querySnapshot) === norm(item.query) && (cur.candidates?.length || cur.error)) {
            continue;
          }

          if (store.id === 'arena') {
            const arenaCandidates = await tryBrowserArenaFetch(item.query, state.settings.maxResults || 8);
            if (arenaCandidates && arenaCandidates.length > 0) {
              state.results[item.id][store.id] = {
                querySnapshot: item.query,
                candidates: arenaCandidates,
                selected: selectBestCandidate(arenaCandidates),
                manualPrice: cur?.manualPrice ?? null,
                error: null,
                method: 'API oficial Arena Atacado (preço real)',
                searchUrl: store.searchUrl.replace('{q}', encodeURIComponent(item.query)),
                at: new Date().toISOString(),
              };
              continue;
            }
          }

          state.results[item.id][store.id] = {
            querySnapshot: item.query,
            candidates: [],
            selected: null,
            manualPrice: cur?.manualPrice ?? null,
            error:
              'Para buscar novos itens ao vivo sem preços fictícios, inicie o Servidor Local (npm start) devido ao bloqueio CORS dos sites no navegador, ou clique para abrir a busca real na loja.',
            method: 'bloqueio CORS (navegador estático)',
            searchUrl: store.searchUrl.replace('{q}', encodeURIComponent(item.query)),
            at: new Date().toISOString(),
          };
        }
      }
    }

    saveLocalState();
    $('span', prog).textContent = 'Comparação com preços reais concluída ✓';
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
  if (r.manualPrice != null) {
    return {
      price: r.manualPrice,
      title: 'Preço real informado manualmente pelo usuário',
      url: r.searchUrl,
      manual: true,
      matchType: 'exact',
    };
  }
  if (r.selected == null) return null;
  const c = r.candidates?.[r.selected];
  return c
    ? {
        price: c.price,
        title: c.title,
        url: c.url,
        image: c.image,
        score: c.score,
        matchType: c.matchType || 'exact',
        similarReason: c.similarReason || null,
      }
    : null;
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
  const totalUnits = items.reduce((s, it) => s + (Number(it.qty) || 1), 0);
  $('#results-sub').textContent = `${items.length} produtos (${totalUnits} unidades) comparados com preços 100% reais das lojas · atualizado em ${
    lastAt ? new Date(lastAt).toLocaleString('pt-BR') : 'agora'
  }`;

  // --- Diagnóstico de limitações reais das lojas (transparência) ---
  const storeDiagnostics = [];
  for (const s of stores) {
    const storeRes = items.map((it) => state.results[it.id]?.[s.id]).filter(Boolean);
    const errors = storeRes.filter((r) => r.error && (!r.candidates || !r.candidates.length));
    const similars = items.filter((it) => prices[it.id]?.[s.id]?.matchType === 'similar');
    if (errors.length === items.length && errors[0]?.error) {
      storeDiagnostics.push(`<li><b>${esc(s.name)}:</b> ${esc(errors[0].error)}</li>`);
    } else if (similars.length > 0) {
      storeDiagnostics.push(
        `<li><b>${esc(s.name)}:</b> ${items.length - errors.length - similars.length} produto(s) exato(s) e <b>${
          similars.length
        } opção(ões) similar(es) real(is)</b> (marcadas com <span class="tag sim">≈ Similar</span> quando a loja não possui a marca/embalagem exata).</li>`
      );
    }
  }

  const diagHtml = storeDiagnostics.length
    ? `<div class="diag-banner">
        <b>ℹ️ Transparência de Preços Reais &amp; Opções Similares:</b> Nenhum preço fictício é exibido.
        <ul>${storeDiagnostics.join('')}</ul>
      </div>`
    : '';

  // --- resumo ---
  const bestSingle =
    totals.find((t) => t.complete && !t.belowMinimum) ||
    totals.filter((t) => t.subtotal > 0).sort((a, b) => b.missing.length - a.missing.length || a.total - b.total)[0] ||
    totals[0];
  const worstSingle = [...totals].reverse().find((t) => t.subtotal > 0 && t.missing.length === bestSingle?.missing.length);
  let html = '';

  if (bestSingle && bestSingle.subtotal > 0) {
    const diffWorst = worstSingle && worstSingle !== bestSingle ? worstSingle.total - bestSingle.total : 0;
    const foundCount = items.length - bestSingle.missing.length;
    html += `<div class="sum-card hero">
      <div class="label">🏆 Mercado mais barato no Total (${foundCount}/${items.length} itens encontrados c/ frete)</div>
      <div class="value">${esc(bestSingle.store.name)} — ${brl(bestSingle.total)}</div>
      ${diffWorst > 0.01 ? `<span class="save">Economia de ${brl(diffWorst)} em relação a ${esc(worstSingle.store.name)}</span>` : ''}
      <ul>
        <li>Subtotal dos itens encontrados (${foundCount}/${items.length}): <b>${brl(bestSingle.subtotal)}</b></li>
        <li>Frete (${esc(bestSingle.store.name)}): <b>${bestSingle.shipping ? brl(bestSingle.shipping) : 'Grátis 🎉'}</b></li>
        ${bestSingle.belowMinimum ? `<li>⚠ Pedido mínimo da loja: ${brl(bestSingle.store.shipping.minOrder)}</li>` : ''}
      </ul>
    </div>`;
  }

  if (split) {
    const saveVsSingle = bestSingle && bestSingle.complete ? bestSingle.total - split.total : 0;
    html += `<div class="sum-card">
      <div class="label">💡 Compra dividida otimizada (preços reais + fretes)</div>
      <div class="value">${brl(split.total)}</div>
      ${
        saveVsSingle > 0.009
          ? `<span class="save">Economiza mais ${brl(saveVsSingle)} dividindo entre os mercados</span>`
          : `<p class="muted small">Combinação mais barata somando os preços reais e fretes de cada loja.</p>`
      }
      <ul>${split.groups
        .map(
          (g) =>
            `<li><b>${esc(g.store.name)}</b> (${brl(g.subtotal)} + frete ${g.shipping ? brl(g.shipping) : 'grátis'}):
              <div class="muted small">${g.items.map((it) => `${it.qty}x ${esc(it.query)}`).join(', ')}</div>
            </li>`
        )
        .join('')}</ul>
    </div>`;
  }

  $('#summary').innerHTML = diagHtml + html;

  // --- matriz por produto ---
  const head = `<tr><th>Produto na Lista</th><th class="num">Qtd</th><th>Mais Barato (p/ Qtd)</th>${stores
    .map((s) => `<th><span class="dot" style="background:${esc(s.color)}"></span>${esc(s.name)}</th>`)
    .join('')}</tr>`;
  const rows = per
    .map(({ item, best }) => {
      const qty = Math.max(1, Number(item.qty) || 1);
      const cells = stores
        .map((s) => {
          const r = state.results[item.id]?.[s.id];
          const p = prices[item.id][s.id];
          const attrs = `data-item="${item.id}" data-store="${s.id}"`;
          if (!r) return `<td><div class="cell na" ${attrs}><div class="p">—</div><div class="t">não buscado</div></div></td>`;
          if (!p) {
            const msg = r.error
              ? `<div class="p">⚠ Indisponível / Bloqueado</div><div class="t" title="${esc(r.error)}">${esc(r.error)}</div>`
              : `<div class="p">indisponível</div><div class="t">${r.candidates?.length ? 'clique para escolher opção' : 'nada encontrado'}</div>`;
            return `<td><div class="cell ${r.error ? 'err' : 'na'}" ${attrs}>${msg}</div></td>`;
          }
          const isBest = best && Math.abs(p.price - best.price) < 0.005;
          const isSim = p.matchType === 'similar';
          const lineTotal = p.price * qty;
          let badge = '';
          if (p.manual) {
            badge = '<span class="tag">manual</span>';
          } else if (isSim) {
            badge = `<span class="tag sim" title="${esc(p.similarReason || 'A loja não tem o produto exato; exibindo opção similar real da loja')}">≈ Similar</span>`;
          } else {
            badge = `<span class="tag exact" title="Produto exato encontrado na loja">✓ Exato</span>`;
          }
          return `<td><div class="cell ${isBest ? 'best' : ''} ${isSim ? 'sim-cell' : ''}" ${attrs} title="Clique para ver todas as opções reais da loja ou abrir o produto no site (${esc(
            p.title
          )})">
            <div class="p">${isBest ? '🏆 ' : ''}${brl(lineTotal)}${badge}</div>
            <div class="sub-p">${qty > 1 ? `${qty} un × ${brl(p.price)} /un` : `${brl(p.price)} /un`}</div>
            <div class="t">${esc(p.title)}</div></div></td>`;
        })
        .join('');
      const bestStoreName = best ? storeById[best.storeId]?.name : '—';
      const bestTotal = best ? best.price * qty : 0;
      const bestIsSim = best?.matchType === 'similar';
      return `<tr>
        <td><b>${esc(item.query)}</b></td>
        <td class="num"><input type="number" min="1" value="${qty}" data-matrix-qty="${item.id}" style="width:64px;padding:4px 6px;text-align:center" title="Alterar quantidade atualiza os preços na hora"/></td>
        <td>${
          best
            ? `<span class="chip ok">🏆 ${esc(bestStoreName)}: <b>${brl(bestTotal)}</b>${
                qty > 1 ? ` <small>(${qty}× ${brl(best.price)})</small>` : ''
              }${bestIsSim ? ' <small>(similar)</small>' : ''}</span>`
            : '—'
        }</td>
        ${cells}
      </tr>`;
    })
    .join('');
  $('#matrix').innerHTML = `<thead>${head}</thead><tbody>${rows}</tbody>`;

  // --- totais por loja ---
  $('#totals').innerHTML = `<thead><tr><th>Posição &amp; Mercado</th><th class="num">Subtotal</th><th class="num">Frete</th><th class="num">Total c/ Frete</th><th>Status dos Produtos &amp; Regras de Frete</th></tr></thead>
    <tbody>${totals
      .map((t, idx) => {
        const notes = [];
        if (t.missing.length) {
          notes.push(`sem preço em ${t.missing.length} item(ns): ${t.missing.map((i) => i.query).join(', ')}`);
        }
        if (t.belowMinimum && t.subtotal > 0) notes.push(`abaixo do pedido mínimo (${brl(t.store.shipping.minOrder)})`);
        const fa = t.store.shipping.freeAbove;
        if (t.shipping && fa != null && t.subtotal > 0 && fa > t.subtotal) {
          notes.push(`faltam ${brl(fa - t.subtotal)} p/ frete grátis (acima de ${brl(fa)})`);
        } else if (!t.shipping && t.subtotal > 0 && fa != null) {
          notes.push(`✓ atingiu frete grátis (compras ≥ ${brl(fa)})`);
        }
        const isWinner = t === bestSingle && t.subtotal > 0;
        return `<tr class="${isWinner ? 'best-row' : ''}">
          <td>
            <b>${idx + 1}º</b>
            <span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${esc(t.store.color)};margin:0 6px"></span>
            ${esc(t.store.name)} ${isWinner ? '🏆' : ''}
          </td>
          <td class="num">${t.subtotal ? brl(t.subtotal) : '—'}</td>
          <td class="num">${t.subtotal ? (t.shipping ? brl(t.shipping) : '<span class="chip ok">Grátis</span>') : '—'}</td>
          <td class="num"><b>${t.subtotal ? brl(t.total) : '—'}</b></td>
          <td class="muted small">${notes.join(' · ') || 'Todos os itens disponíveis'}</td></tr>`;
      })
      .join('')}</tbody>`;
}

// Permite alterar a quantidade diretamente na tabela de comparação
$('#matrix').addEventListener('change', (e) => {
  const itemId = e.target.dataset.matrixQty;
  if (!itemId) return;
  const newQty = Math.max(1, Number(e.target.value) || 1);
  saveList(state.list.map((it) => (it.id === itemId ? { ...it, qty: newQty } : it)));
});

// ---- escolher outro produto / preço manual ----
const pick = $('#pick-dialog');
let picking = null;

$('#matrix').addEventListener('click', (e) => {
  if (e.target.closest('input')) return;
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
  const qty = Math.max(1, Number(item.qty) || 1);
  $('#pick-title').textContent = `${item.query} (${qty} un.) — ${store.name}`;
  $('#pick-sub').textContent =
    r.candidates?.length > 0
      ? `${r.candidates.length} produto(s) real(is) encontrado(s) em ${store.name} (${r.method}). Clique para escolher qual usar na comparação:`
      : r.error || 'Nenhum produto encontrado nesta loja.';
  $('#pick-list').innerHTML = (r.candidates || [])
    .map((c, i) => {
      const isSim = c.matchType === 'similar';
      const badgeText = isSim ? `≈ ${c.similarReason || 'Opção Similar na loja'}` : '✓ Produto Exato na loja';
      return `<li data-i="${i}" class="${r.manualPrice == null && r.selected === i ? 'sel' : ''}">
      ${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy"/>` : ''}
      <div class="info"><b>${esc(c.title)}</b><br/>
        <span class="score ${isSim ? 'sim' : 'good'}">${esc(badgeText)}</span>
        ${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">ver produto real na loja ↗</a>` : ''}</div>
      <div class="price" style="text-align:right">
        <div>${brl(c.price * qty)}</div>
        ${
          qty > 1
            ? `<div class="muted small" style="font-weight:400">${qty}× ${brl(c.price)} /un</div>`
            : `<div class="muted small" style="font-weight:400">unitário na loja</div>`
        }
      </div></li>`;
    })
    .join('');
  $('#pick-manual').value = r.manualPrice ?? '';
  $('#pick-open').href = r.searchUrl || store.searchUrl.replace('{q}', encodeURIComponent(item.query));
  if ($('#pick-open-login')) {
    $('#pick-open-login').href = store.loginUrl || store.homeUrl;
  }
  if ($('#pick-confirm-logged')) {
    $('#pick-confirm-logged').textContent = store.session ? '✓ Já marcado como logado' : '✓ Avisar que está logado';
    $('#pick-confirm-logged').className = store.session ? 'btn sm confirm-highlight' : 'btn sm';
  }
  pick.showModal();
}

$('#pick-open-login')?.addEventListener('click', () => {
  if (!picking) return;
  const store = state.stores.find((s) => s.id === picking.storeId);
  if (store && !store.session) {
    store.awaitingOfficialConfirm = true;
    saveLocalState();
    renderStores();
  }
});

$('#pick-confirm-logged')?.addEventListener('click', async () => {
  if (!picking) return;
  const store = state.stores.find((s) => s.id === picking.storeId);
  if (!store) return;
  await markStoreLoggedIn(store, { method: 'pagina-oficial' });
  if ($('#pick-confirm-logged')) {
    $('#pick-confirm-logged').textContent = '✓ Já marcado como logado';
    $('#pick-confirm-logged').className = 'btn sm confirm-highlight';
  }
});

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
