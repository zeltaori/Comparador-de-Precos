// Automação de navegador (Playwright).
// - login(): abre uma janela VISÍVEL para o próprio usuário entrar na conta.
//   Não digitamos nem guardamos senhas; apenas o perfil do navegador (cookies)
//   fica salvo em data/profiles/<loja>, igual a um navegador comum.
// - searchStore(): reutiliza esse perfil para pesquisar os itens da lista.
const { chromium } = require('playwright');
const { profileDir } = require('./storage');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const openLogins = new Map(); // storeId -> context

function launchOptions(headless) {
  return {
    headless,
    channel: process.env.BROWSER_CHANNEL || undefined, // ex.: "chrome" para usar o Chrome instalado
    viewport: headless ? { width: 1366, height: 900 } : null,
    userAgent: headless ? UA : undefined,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    args: headless ? [] : ['--start-maximized'],
  };
}

async function login(store, onDone) {
  if (openLogins.has(store.id)) return { alreadyOpen: true };
  const ctx = await chromium.launchPersistentContext(profileDir(store.id), launchOptions(false));
  openLogins.set(store.id, ctx);
  const page = ctx.pages()[0] || (await ctx.newPage());
  ctx.on('close', () => {
    openLogins.delete(store.id);
    onDone?.();
  });
  await page.goto(store.loginUrl || store.homeUrl, { waitUntil: 'domcontentloaded' }).catch(() => {});
  return { opened: true };
}

async function finishLogin(storeId) {
  const ctx = openLogins.get(storeId);
  if (ctx) await ctx.close(); // fecha e persiste o perfil
  return { closed: !!ctx };
}

function isLoginOpen(storeId) {
  return openLogins.has(storeId);
}

// ---------- utilidades de texto ----------
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.,\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'para', 'o', 'a', 'em', 'tipo']);

// Fração das palavras da busca que aparecem no título (0..1)
function matchScore(query, title) {
  const t = ' ' + normalize(title).replace(/,/g, '.') + ' ';
  const words = normalize(query)
    .replace(/,/g, '.')
    .split(' ')
    .filter((w) => w && !STOP.has(w));
  if (!words.length) return 0;
  let hit = 0;
  for (const w of words) {
    // "5kg" também casa com "5 kg"
    const m = w.match(/^(\d+(?:\.\d+)?)([a-z]+)$/);
    if (t.includes(w) || (m && t.includes(`${m[1]} ${m[2]}`))) hit++;
  }
  return hit / words.length;
}

// ---------- extração na página ----------
// Roda dentro do navegador. Usa seletores da loja e, se não achar nada,
// um extrator genérico (JSON-LD + heurística "card com R$ e link").
function extractInPage({ selectors, max }) {
  const parsePrice = (txt) => {
    if (!txt) return null;
    const m = String(txt).replace(/\s/g, '').match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/);
    if (!m) return null;
    return parseFloat(m[1].replace(/\./g, '') + '.' + (m[2] || '0').padEnd(2, '0'));
  };
  const priceOf = (el) => {
    if (!el) return null;
    // Mercado Livre divide inteiro e centavos em elementos separados
    const frac = el.querySelector?.('.andes-money-amount__fraction');
    if (frac) {
      const cents = el.querySelector('.andes-money-amount__cents');
      return parseFloat(frac.textContent.replace(/\./g, '') + '.' + (cents ? cents.textContent : '00'));
    }
    const content = el.getAttribute?.('content');
    if (content && !isNaN(parseFloat(content))) return parseFloat(content);
    return parsePrice(el.textContent);
  };
  const abs = (href) => {
    try { return new URL(href, location.href).href; } catch { return null; }
  };
  const imgOf = (el) => {
    const img = el.querySelector('img');
    return img ? abs(img.currentSrc || img.src || img.getAttribute('data-src')) : null;
  };

  const out = [];
  const push = (r) => {
    if (r.title && r.price > 0 && !out.some((o) => o.title === r.title && o.price === r.price)) out.push(r);
  };

  // 1) Seletores configurados
  if (selectors && selectors.item) {
    for (const card of document.querySelectorAll(selectors.item)) {
      if (out.length >= max) break;
      const tEl = selectors.title ? card.querySelector(selectors.title) : null;
      const pEl = selectors.price ? card.querySelector(selectors.price) : null;
      let lEl = selectors.link ? card.querySelector(selectors.link) : null;
      if (!lEl && card.tagName === 'A') lEl = card;
      push({
        title: (tEl?.textContent || '').trim().replace(/\s+/g, ' '),
        price: priceOf(pEl),
        url: lEl ? abs(lEl.getAttribute('href')) : location.href,
        image: imgOf(card),
      });
    }
  }
  if (out.length) return { results: out, method: 'seletores' };

  // 2) JSON-LD (schema.org Product / ItemList)
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(walk);
    const type = [].concat(node['@type'] || []);
    if (type.includes('Product')) {
      const offer = [].concat(node.offers || [])[0] || {};
      push({
        title: node.name,
        price: parseFloat(offer.price || offer.lowPrice),
        url: abs(node.url || offer.url || location.href),
        image: [].concat(node.image || [])[0] || null,
      });
    }
    Object.values(node).forEach(walk);
  };
  document.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try { walk(JSON.parse(s.textContent)); } catch {}
  });
  if (out.length) return { results: out.slice(0, max), method: 'json-ld' };

  // 3) Heurística genérica
  const isOldPrice = (e) => {
    for (let c = e, i = 0; c && i < 3; c = c.parentElement, i++) {
      if (c.tagName === 'DEL' || c.tagName === 'S') return true;
      if (/old|line-?through|riscad|list-?price|from|before|anterior/i.test(c.className?.toString() || '')) return true;
      if (getComputedStyle(c).textDecorationLine.includes('line-through')) return true;
    }
    return false;
  };
  const priceNodes = [...document.querySelectorAll('body *')].filter(
    (e) =>
      e.children.length <= 3 &&
      /^\s*R\$\s*[\d.,\s]+(\/\s*[a-z]{1,4}\.?)?\s*$/i.test(e.textContent) &&
      !isOldPrice(e)
  );
  const hasLink = (c) => c.matches('a[href]') || c.querySelector('a[href]');
  const seen = new Set();
  for (const pn of priceNodes) {
    if (out.length >= max) break;
    let card = pn;
    for (let i = 0; i < 8 && card; i++) {
      card = card.parentElement;
      if (card && hasLink(card) && card.querySelector('img') && card.textContent.length > 20) break;
    }
    if (!card || seen.has(card)) continue;
    seen.add(card);
    const links = card.matches('a[href]') ? [card] : [...card.querySelectorAll('a[href]')];
    const titleEl =
      card.querySelector('h2, h3, h4, [class*="title" i], [class*="name" i], [class*="nome" i], span[title], div[title]') ||
      [...links].sort((a, b) => b.textContent.length - a.textContent.length)[0];
    let title = (titleEl?.getAttribute?.('title') || titleEl?.textContent || '').trim().replace(/\s+/g, ' ');
    if (title.length < 4 || /R\$/.test(title)) title = card.querySelector('img[alt]')?.alt?.trim() || '';
    if (title.length < 4 || /R\$/.test(title)) continue;
    push({
      title: title.slice(0, 200),
      price: priceOf(pn),
      url: abs(links[0]?.getAttribute('href')),
      image: imgOf(card),
    });
  }
  return { results: out, method: 'generico' };
}

function buildUrl(store, query) {
  return store.searchUrl.replace('{q}', encodeURIComponent(query));
}

// Pesquisa todos os itens em UMA loja (sequencialmente, com intervalo).
async function searchStore(store, items, settings, onItem) {
  const ctx = await chromium.launchPersistentContext(profileDir(store.id), launchOptions(settings.headless !== false));
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());
    for (const item of items) {
      const res = { storeId: store.id, itemId: item.id, candidates: [], error: null };
      try {
        await page.goto(buildUrl(store, item.query), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
        // rola um pouco para disparar carregamento preguiçoso
        await page.mouse.wheel(0, 1500).catch(() => {});
        await page.waitForTimeout(800);

        const { results, method } = await page.evaluate(extractInPage, {
          selectors: store.selectors || {},
          max: settings.maxResults || 8,
        });
        res.method = method;
        res.searchUrl = page.url();
        res.candidates = results
          .map((r) => ({ ...r, score: matchScore(item.query, r.title) }))
          .sort((a, b) => b.score - a.score || a.price - b.price);
        if (!results.length) {
          const blocked = await page.evaluate(() =>
            /captcha|robot|rob[oô]|verifique|access denied|acesso negado/i.test(document.body.innerText.slice(0, 3000))
          );
          res.error = blocked
            ? 'O site pediu verificação (captcha). Abra a loja em "Conectar", resolva manualmente e tente de novo.'
            : 'Nenhum produto encontrado (confira a URL de busca/seletores da loja).';
        }
      } catch (e) {
        res.error = e.message.split('\n')[0];
      }
      onItem(res);
      await page.waitForTimeout(settings.delayMs ?? 1200);
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

module.exports = { login, finishLogin, isLoginOpen, searchStore, matchScore, extractInPage };
