// Script executado pelo GitHub Actions (na nuvem) ou localmente para atualizar o banco de produtos reais (real-store-pool.json)
const { chromium } = require('playwright');
const fs = require('fs');
const scraper = require('../src/scraper');
const { read, write } = require('../src/storage');
const defaultStores = require('../src/defaultStores');

const QUERIES = [
  'Arroz 5kg', 'Arroz 1kg', 'Feijão Carioca 1kg', 'Feijão Preto 1kg',
  'Café Tradicional 500g', 'Leite Integral 1L', 'Leite Desnatado 1L', 'Leite em Pó 400g',
  'Leite Condensado 395g', 'Creme de Leite 200g', 'Manteiga 200g', 'Margarina Qualy 500g',
  'Queijo Mussarela', 'Presunto Sadia', 'Pão de Forma', 'Ovos Brancos',
  'Óleo de Soja 900ml', 'Azeite Extra Virgem 500ml', 'Açúcar Refinado 1kg', 'Açúcar Cristal 5kg',
  'Sal Refinado 1kg', 'Farinha de Trigo 1kg', 'Macarrão Espaguete 500g', 'Macarrão Parafuso 500g',
  'Molho de Tomate 300g', 'Maionese Hellmanns 500g', 'Ketchup Heinz', 'Milho Verde Lata',
  'Atum Gomes da Costa', 'Biscoito Maisena', 'Achocolatado Nescau', 'Chocolate Barra',
  'Filé de Peito de Frango 1kg', 'Carne Moída', 'Refrigerante Coca Cola 2L', 'Guaraná Antarctica 2L',
  'Suco Integral 1L', 'Água Mineral 1,5L', 'Cerveja Lata 350ml', 'Lava Roupas Líquido Omo 3L',
  'Sabão em Pó Omo', 'Amaciante Downy', 'Detergente Ypê 500ml', 'Água Sanitária 2L',
  'Desinfetante 2L', 'Papel Higiênico 12 rolos', 'Sabonete Dove', 'Creme Dental Colgate', 'Shampoo'
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

(async () => {
  let existingPool = { stores: {} };
  try {
    existingPool = JSON.parse(fs.readFileSync('./public/real-store-pool.json', 'utf8'));
  } catch {}

  const catalogPool = {
    arena: existingPool.stores?.arena || [],
    goodbom: existingPool.stores?.goodbom || [],
    amazon: existingPool.stores?.amazon || [],
    mercadolivre: existingPool.stores?.mercadolivre || [],
    magalu: existingPool.stores?.magalu || [],
  };

  const addUnique = (storeId, items) => {
    catalogPool[storeId] ??= [];
    for (const it of items) {
      if (!it || !it.title || !(it.price > 0)) continue;
      const idx = catalogPool[storeId].findIndex((x) => x.title === it.title);
      if (idx >= 0) {
        catalogPool[storeId][idx] = it;
      } else {
        catalogPool[storeId].push(it);
      }
    }
  };

  for (const q of QUERIES) {
    try {
      const r = await fetch(
        'https://www.arenaatacado.com.br/on/demandware.store/Sites-Arena-Site/pt_BR/SearchServices-GetSuggestionsJson?q=' +
          encodeURIComponent(q),
        { headers: { 'User-Agent': UA, Accept: 'application/json' } }
      );
      if (r.ok) {
        const j = await r.json();
        const prods = (j?.suggestions?.product?.products || [])
          .map((p) => p.productTileModel)
          .filter((m) => m && m.available !== false && m.price?.defaultPrice?.sales?.value > 0)
          .map((m) => ({
            title: (m.productName || '').trim(),
            price: Number(m.price.defaultPrice.sales.value),
            url: (m.productShowFullUrl || '').startsWith('http')
              ? m.productShowFullUrl
              : 'https://www.arenaatacado.com.br' + (m.productShowFullUrl || ''),
            image: m.images?.large?.[0]?.absURL || null,
          }));
        addUnique('arena', prods);
      }
    } catch {}
  }

  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true, userAgent: UA, locale: 'pt-BR' });
  const page = await ctx.newPage();
  await page.goto('https://www.goodbom.com.br/campinas-sp-parque-taquaral/busca?q=arroz', {
    waitUntil: 'domcontentloaded',
    timeout: 25000,
  }).catch(() => {});
  await page.waitForTimeout(1500);

  for (const q of QUERIES) {
    try {
      const prods = await page.evaluate(async (search) => {
        const query = `query ProductsSearch($storeId: String!, $search: String!, $pageSize: Int!, $page: Int!) {
          ecommerceProducts(storeId: $storeId, search: $search, pageSize: $pageSize, page: $page) {
            products { name slug image price priceWithDiscount stock }
          }
        }`;
        const r = await fetch('/api/new-web/graphql', {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-custom-origin': 'goodbom.com.br', 'x-request-source': 'client' },
          body: JSON.stringify({ operationName: 'ProductsSearch', variables: { storeId: '9', pageSize: 16, search, page: 1 }, query }),
        });
        if (!r.ok) return [];
        const j = await r.json();
        return (j?.data?.ecommerceProducts?.products || [])
          .filter((p) => (p.stock == null || p.stock > 0) && (p.priceWithDiscount > 0 || p.price > 0))
          .map((p) => ({
            title: (p.name || '').trim(),
            price: Number(p.priceWithDiscount > 0 ? p.priceWithDiscount : p.price),
            url: p.slug ? 'https://www.goodbom.com.br/campinas-sp-parque-taquaral/produto/' + p.slug : location.href,
            image: p.image || null,
          }));
      }, q);
      addUnique('goodbom', prods);
    } catch {}
  }
  await browser.close();

  fs.writeFileSync(
    './public/real-store-pool.json',
    JSON.stringify({ updatedAt: new Date().toISOString(), stores: catalogPool }, null, 2)
  );
  console.log('Updated real-store-pool.json');
})();
