// Automação de navegador (Playwright) e extração 100% REAL das lojas.
// REGRA ESTRITA: Nunca geramos nem usamos preços fictícios.
// - Se a loja tiver o produto exato -> retorna com matchType: 'exact' e o preço real da loja.
// - Se a loja não tiver o produto/marca exata -> busca e retorna opções similares reais da loja (matchType: 'similar').
// - Se a loja bloquear por falta de login (ex: Mercado Livre) ou anti-bot WAF 403 (ex: Magalu) -> informa o erro real com transparência.

const { chromium } = require('playwright');
const { profileDir } = require('./storage');

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const openLogins = new Map(); // storeId -> context

function launchOptions(headless) {
  return {
    headless,
    ignoreHTTPSErrors: true,
    channel: process.env.BROWSER_CHANNEL || undefined,
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
  if (ctx) await ctx.close();
  return { closed: !!ctx };
}

function isLoginOpen(storeId) {
  return openLogins.has(storeId);
}

let catalogModulePromise = null;
function getCatalogModule() {
  if (!catalogModulePromise) {
    catalogModulePromise = import('../public/catalog.js');
  }
  return catalogModulePromise;
}

// ---------- extração no DOM da página ----------
function extractInPage({ selectors, max }) {
  const parsePrice = (txt) => {
    if (!txt) return null;
    const m = String(txt).replace(/\s/g, '').match(/(\d{1,3}(?:\.\d{3})*|\d+)(?:,(\d{1,2}))?/);
    if (!m) return null;
    return parseFloat(m[1].replace(/\./g, '') + '.' + (m[2] || '0').padEnd(2, '0'));
  };
  const priceOf = (el) => {
    if (!el) return null;
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

  // Verifica bloqueios conhecidos na página (WAF 403, Captcha, Verificação de Conta)
  const pageTitle = (document.title || '').trim();
  const bodySnippet = (document.body?.innerText || '').slice(0, 1200);
  if (
    location.href.includes('account-verification') ||
    location.href.includes('/navigation/login') ||
    location.href.includes('/ap/signin')
  ) {
    return {
      results: [],
      method: 'bloqueado-login',
      blockReason: 'Esta loja exige login na conta para exibir os preços da busca. Conecte sua conta na Etapa 1.',
    };
  }
  if (
    /N[aã]o [eé] poss[ií]vel acessar a p[aá]gina|Access Denied|Erro 403|403 Forbidden/i.test(pageTitle) ||
    /Erro 403|sua conex[aã]o n[aã]o [eé] segura ou foi bloqueada/i.test(bodySnippet)
  ) {
    return {
      results: [],
      method: 'bloqueado-waf',
      blockReason: 'Busca automatizada bloqueada pelo firewall anti-bot (Erro 403) da loja. Clique para abrir a busca direta no navegador.',
    };
  }
  if (/digite os caracteres que voc[eê] v[eê]|validateCaptcha|Robot Check/i.test(bodySnippet)) {
    return {
      results: [],
      method: 'bloqueado-captcha',
      blockReason: 'A loja solicitou verificação anti-robô (CAPTCHA). Faça login na Etapa 1 ou abra a busca no site.',
    };
  }

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
  if (out.length) return { results: out, method: 'seletores da loja' };

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
  if (out.length) return { results: out.slice(0, max), method: 'json-ld da loja' };

  // 3) Heurística genérica de cards de produto com preço R$
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
  return { results: out, method: 'extração direta na página' };
}

function buildUrl(store, query) {
  return store.searchUrl.replace('{q}', encodeURIComponent(query));
}

// ---------- Extração rápida API JSON oficial do Arena Atacado ----------
async function fetchArenaJson(query) {
  const url =
    'https://www.arenaatacado.com.br/on/demandware.store/Sites-Arena-Site/pt_BR/SearchServices-GetSuggestionsJson?q=' +
    encodeURIComponent(query);
  const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  const products = data?.suggestions?.product?.products || [];
  const out = [];
  for (const p of products) {
    const m = p.productTileModel;
    if (!m || m.available === false) continue;
    const price = m.price?.defaultPrice?.sales?.value;
    if (!(price > 0)) continue;
    const relUrl = m.productShowFullUrl || '';
    const fullUrl = relUrl.startsWith('http') ? relUrl : `https://www.arenaatacado.com.br${relUrl}`;
    const img = m.images?.large?.[0]?.absURL || m.images?.small?.[0]?.absURL || null;
    out.push({
      title: (m.productName || '').trim(),
      price: Number(price),
      url: fullUrl,
      image: img,
    });
  }
  return out;
}

// ---------- Extração via GraphQL oficial da loja GoodBom (dentro do contexto da página) ----------
async function fetchGoodBomInPage(page, searchQuery) {
  return page.evaluate(async (q) => {
    const query = `query ProductsSearch($storeId: String!, $search: String!, $pageSize: Int!, $page: Int!) {
      ecommerceProducts(storeId: $storeId, search: $search, pageSize: $pageSize, page: $page) {
        products {
          id
          name
          slug
          image
          price
          priceWithDiscount
          brand
          stock
        }
      }
    }`;
    const r = await fetch('/api/new-web/graphql', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-custom-origin': 'goodbom.com.br',
        'x-request-source': 'client',
      },
      body: JSON.stringify({
        operationName: 'ProductsSearch',
        variables: { storeId: '9', pageSize: 24, search: q, page: 1 },
        query,
      }),
    });
    if (!r.ok) return [];
    const j = await r.json();
    const prods = j?.data?.ecommerceProducts?.products || [];
    return prods
      .filter((p) => (p.stock == null || p.stock > 0) && (p.priceWithDiscount > 0 || p.price > 0))
      .map((p) => ({
        title: (p.name || '').trim(),
        price: Number(p.priceWithDiscount > 0 ? p.priceWithDiscount : p.price),
        url: p.slug
          ? `https://www.goodbom.com.br/campinas-sp-parque-taquaral/produto/${p.slug}`
          : location.href,
        image: p.image || null,
      }));
  }, searchQuery);
}

// Pesquisa todos os itens em UMA loja (100% preços reais da loja + busca de similares reais quando não houver o exato).
async function searchStore(store, items, settings, onItem) {
  const { rankAndFilterCandidates, buildFallbackQueries } = await getCatalogModule();
  const maxLimit = settings.maxResults || 8;

  // Caso 1: Arena Atacado possui endpoint JSON oficial rápido; usamos ele + fallback de similares reais
  if (store.id === 'arena' && store.searchUrl.includes('arenaatacado.com.br')) {
    try {
      for (const item of items) {
        const res = {
          storeId: store.id,
          itemId: item.id,
          candidates: [],
          error: null,
          method: 'API oficial Arena Atacado (preço real)',
          searchUrl: buildUrl(store, item.query),
        };
        try {
          let raw = await fetchArenaJson(item.query);
          let ranked = rankAndFilterCandidates(item.query, raw, maxLimit);

          // Se não encontrou produto exato (ou vieram poucas opções), busca opções similares reais na loja
          const hasExact = ranked.some((c) => c.matchType === 'exact');
          if (!hasExact || ranked.length < 3) {
            const fallbacks = buildFallbackQueries(item.query);
            for (const fb of fallbacks) {
              const fbRaw = await fetchArenaJson(fb).catch(() => []);
              raw = raw.concat(fbRaw);
              ranked = rankAndFilterCandidates(item.query, raw, maxLimit);
              if (ranked.length >= 4) break;
            }
          }

          res.candidates = ranked;
          if (!ranked.length) {
            res.error = 'Produto ou similar não encontrado em estoque no Arena Atacado.';
          }
        } catch (err) {
          res.error = `Erro ao consultar Arena Atacado: ${err.message}`;
        }
        onItem(res);
      }
      return;
    } catch {
      // Se falhar, continua para o navegador Playwright abaixo
    }
  }

  const ctx = await chromium.launchPersistentContext(profileDir(store.id), launchOptions(settings.headless !== false));
  try {
    const page = ctx.pages()[0] || (await ctx.newPage());

    // Caso 2: GoodBom (abre a sessão na loja e consulta a API GraphQL real + DOM da loja)
    if (store.id === 'goodbom' && store.searchUrl.includes('goodbom.com.br')) {
      try {
        await page.goto(store.homeUrl || 'https://www.goodbom.com.br/campinas-sp-parque-taquaral/busca?q=arroz', {
          waitUntil: 'domcontentloaded',
          timeout: 30000,
        });
        await page.waitForTimeout(1200);

        for (const item of items) {
          const res = {
            storeId: store.id,
            itemId: item.id,
            candidates: [],
            error: null,
            method: 'Catálogo em tempo real GoodBom (preço real)',
            searchUrl: buildUrl(store, item.query),
          };
          try {
            let raw = await fetchGoodBomInPage(page, item.query).catch(() => []);
            let ranked = rankAndFilterCandidates(item.query, raw, maxLimit);

            const hasExact = ranked.some((c) => c.matchType === 'exact');
            if (!hasExact || ranked.length < 3) {
              const fallbacks = buildFallbackQueries(item.query);
              for (const fb of fallbacks) {
                const fbRaw = await fetchGoodBomInPage(page, fb).catch(() => []);
                raw = raw.concat(fbRaw);
                ranked = rankAndFilterCandidates(item.query, raw, maxLimit);
                if (ranked.length >= 4) break;
              }
            }

            res.candidates = ranked;
            if (!ranked.length) {
              res.error = 'Produto ou similar não encontrado em estoque no GoodBom.';
            }
          } catch (err) {
            res.error = `Erro ao consultar GoodBom: ${err.message}`;
          }
          onItem(res);
        }
        return;
      } catch {
        // Se falhar o atalho GraphQL, segue o fluxo padrão por página abaixo
      }
    }

    // Caso 3: Extração direta na página da loja via Playwright (Amazon, Mercado Livre, Magalu e lojas adicionadas)
    for (const item of items) {
      const res = {
        storeId: store.id,
        itemId: item.id,
        candidates: [],
        error: null,
        method: 'extração na loja',
        searchUrl: buildUrl(store, item.query),
      };
      try {
        await page.goto(buildUrl(store, item.query), { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
        await page.mouse.wheel(0, 1400).catch(() => {});
        await page.waitForTimeout(800);

        const extracted = await page.evaluate(extractInPage, {
          selectors: store.selectors || {},
          max: Math.max(30, maxLimit * 4),
        });
        res.method = extracted.method;
        res.searchUrl = page.url();

        if (extracted.blockReason) {
          res.error = extracted.blockReason;
          res.candidates = [];
          onItem(res);
          continue;
        }

        let raw = extracted.results || [];
        let ranked = rankAndFilterCandidates(item.query, raw, maxLimit);

        // Se a loja não retornou o produto exato (ou só retornou kits/multipacks), busca pelo termo genérico na mesma loja para trazer similares avulsos reais
        const hasGoodSingle = ranked.some((c) => c.matchType === 'exact' || (c.score ?? 0) >= 0.72);
        if (!hasGoodSingle) {
          const fallbacks = buildFallbackQueries(item.query);
          if (fallbacks.length > 0) {
            await page.goto(buildUrl(store, fallbacks[0]), { waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {});
            await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(600);
            const fbExtracted = await page.evaluate(extractInPage, {
              selectors: store.selectors || {},
              max: Math.max(30, maxLimit * 4),
            }).catch(() => ({ results: [] }));
            if (fbExtracted.results?.length) {
              raw = raw.concat(fbExtracted.results);
              ranked = rankAndFilterCandidates(item.query, raw, maxLimit);
            }
          }
        }

        res.candidates = ranked;
        if (!ranked.length) {
          res.error = 'Nenhum produto correspondente ou similar encontrado nesta loja.';
        }
      } catch (e) {
        res.error = `Falha ao acessar a loja: ${e.message.split('\n')[0]}`;
        res.candidates = [];
      }
      onItem(res);
      await page.waitForTimeout(settings.delayMs ?? 600);
    }
  } finally {
    await ctx.close().catch(() => {});
  }
}

module.exports = { login, finishLogin, isLoginOpen, searchStore, extractInPage, getCatalogModule };
