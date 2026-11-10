// Catálogo de preços de supermercado (base de referência + variações reais por loja)
// Usado tanto no modo GitHub Pages / Estático quanto como fallback no servidor local
export const INITIAL_STORES = [
  {
    id: 'mercadolivre',
    name: 'Mercado Livre',
    color: '#ffe600',
    homeUrl: 'https://www.mercadolivre.com.br/',
    loginUrl: 'https://www.mercadolivre.com.br/navigation/login',
    searchUrl: 'https://lista.mercadolivre.com.br/supermercado/{q}',
    selectors: {
      item: 'li.ui-search-layout__item, .poly-card',
      title: '.poly-component__title, .ui-search-item__title',
      price: '.poly-price__current .andes-money-amount, .ui-search-price__second-line .andes-money-amount',
      link: 'a.poly-component__title, a.ui-search-link, a',
    },
    shipping: { fee: 19.9, freeAbove: 79, minOrder: 0 },
    enabled: true,
  },
  {
    id: 'amazon',
    name: 'Amazon',
    color: '#ff9900',
    homeUrl: 'https://www.amazon.com.br/',
    loginUrl: 'https://www.amazon.com.br/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com.br%2F&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=brflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0',
    searchUrl: 'https://www.amazon.com.br/s?k={q}&i=grocery',
    selectors: {
      item: 'div[data-component-type="s-search-result"]',
      title: 'h2',
      price: '.a-price:not(.a-text-price) .a-offscreen',
      link: 'a:has(h2), h2 a, a.a-link-normal[href*="/dp/"]',
    },
    shipping: { fee: 15.9, freeAbove: 100, minOrder: 0 },
    enabled: true,
  },
  {
    id: 'magalu',
    name: 'Magalu',
    color: '#0086ff',
    homeUrl: 'https://www.magazineluiza.com.br/',
    loginUrl: 'https://sacola.magazineluiza.com.br/#/cliente/login',
    searchUrl: 'https://www.magazineluiza.com.br/busca/{q}/',
    selectors: {
      item: '[data-testid="product-card-container"]',
      title: '[data-testid="product-title"]',
      price: '[data-testid="price-value"]',
      link: 'a',
    },
    shipping: { fee: 14.9, freeAbove: 99, minOrder: 0 },
    enabled: true,
  },
  {
    id: 'goodbom',
    name: 'GoodBom',
    color: '#e30613',
    homeUrl: 'https://www.goodbom.com.br/',
    loginUrl: 'https://www.goodbom.com.br/',
    searchUrl: 'https://www.goodbom.com.br/campinas-sp-parque-taquaral/busca?q={q}',
    selectors: {},
    shipping: { fee: 12.9, freeAbove: 250, minOrder: 80 },
    enabled: true,
  },
  {
    id: 'arena',
    name: 'Arena Atacado',
    color: '#f58220',
    homeUrl: 'https://www.arenaatacado.com.br/',
    loginUrl: 'https://www.arenaatacado.com.br/',
    searchUrl: 'https://www.arenaatacado.com.br/on/demandware.store/Sites-Arena-Site/pt_BR/Search-Show?q={q}',
    selectors: {
      item: '.product-tile, .product',
      title: '.pdp-link a, .product-name, .link',
      price: '.price .sales .value, .price .value, .sales',
      link: '.pdp-link a, a',
    },
    shipping: { fee: 14.9, freeAbove: 300, minOrder: 100 },
    enabled: true,
  },
];

export const SAMPLE_LIST = [
  { id: 'item-arroz', query: 'Arroz Tio João 5kg', qty: 1 },
  { id: 'item-feijao', query: 'Feijão Carioca Camil 1kg', qty: 2 },
  { id: 'item-cafe', query: 'Café Pilão Tradicional 500g', qty: 2 },
  { id: 'item-leite', query: 'Leite Integral Italac 1L', qty: 6 },
  { id: 'item-oleo', query: 'Óleo de Soja Liza 900ml', qty: 2 },
  { id: 'item-acucar', query: 'Açúcar Refinado União 1kg', qty: 2 },
  { id: 'item-azeite', query: 'Azeite Extra Virgem Gallo 500ml', qty: 1 },
  { id: 'item-sabao', query: 'Lava Roupas Líquido Omo 3L', qty: 1 },
];

// Catálogo amplo de produtos de supermercado com preços por loja
export const CATALOG = [
  {
    keys: ['arroz', '5kg', 'tio joao', 'camil', 'broto legal', 'agulhinha'],
    variants: [
      {
        title: 'Arroz Branco Tipo 1 Tio João Pacote 5kg',
        prices: { mercadolivre: 29.90, amazon: 28.49, magalu: 30.90, goodbom: 27.99, arena: 25.89 },
      },
      {
        title: 'Arroz Branco Tipo 1 Camil Pacote 5kg',
        prices: { mercadolivre: 27.50, amazon: 26.90, magalu: 28.40, goodbom: 24.99, arena: 23.49 },
      },
      {
        title: 'Arroz Tipo 1 Broto Legal Pacote 5kg',
        prices: { mercadolivre: 28.90, amazon: 28.98, magalu: 29.50, goodbom: 26.99, arena: 24.79 },
      },
    ],
  },
  {
    keys: ['feijao', 'carioca', 'preto', 'camil', 'kicaldo', '1kg'],
    variants: [
      {
        title: 'Feijão Carioca Tipo 1 Camil Pacote 1kg',
        prices: { mercadolivre: 8.49, amazon: 7.99, magalu: 8.79, goodbom: 7.49, arena: 6.89 },
      },
      {
        title: 'Feijão Carioca Tipo 1 Kicaldo 1kg',
        prices: { mercadolivre: 7.90, amazon: 7.69, magalu: 8.20, goodbom: 6.99, arena: 6.49 },
      },
      {
        title: 'Feijão Preto Tipo 1 Camil 1kg',
        prices: { mercadolivre: 8.90, amazon: 8.29, magalu: 8.99, goodbom: 7.89, arena: 7.19 },
      },
    ],
  },
  {
    keys: ['cafe', 'pilao', 'melitta', '3 coracoes', '500g'],
    variants: [
      {
        title: 'Café Torrado e Moído Pilão Tradicional 500g',
        prices: { mercadolivre: 19.90, amazon: 18.49, magalu: 20.50, goodbom: 19.49, arena: 17.99 },
      },
      {
        title: 'Café Torrado e Moído Melitta Tradicional 500g',
        prices: { mercadolivre: 20.90, amazon: 19.29, magalu: 21.40, goodbom: 19.99, arena: 18.49 },
      },
      {
        title: 'Café 3 Corações Tradicional Pacote 500g',
        prices: { mercadolivre: 19.50, amazon: 18.90, magalu: 19.99, goodbom: 18.99, arena: 17.79 },
      },
    ],
  },
  {
    keys: ['leite', 'integral', 'desnatado', 'italac', 'piracanjuba', 'ninho', '1l'],
    variants: [
      {
        title: 'Leite UHT Integral Italac 1 Litro',
        prices: { mercadolivre: 5.49, amazon: 5.19, magalu: 5.69, goodbom: 4.89, arena: 4.59 },
      },
      {
        title: 'Leite UHT Integral Piracanjuba 1 Litro',
        prices: { mercadolivre: 5.59, amazon: 5.29, magalu: 5.79, goodbom: 4.99, arena: 4.69 },
      },
      {
        title: 'Leite UHT Integral Parmalat 1 Litro',
        prices: { mercadolivre: 5.89, amazon: 5.49, magalu: 5.99, goodbom: 5.29, arena: 4.89 },
      },
    ],
  },
  {
    keys: ['oleo', 'soja', 'liza', 'soya', '900ml'],
    variants: [
      {
        title: 'Óleo de Soja Liza Pet 900ml',
        prices: { mercadolivre: 7.49, amazon: 6.99, magalu: 7.79, goodbom: 6.49, arena: 5.99 },
      },
      {
        title: 'Óleo de Soja Soya Pet 900ml',
        prices: { mercadolivre: 7.29, amazon: 6.89, magalu: 7.49, goodbom: 6.29, arena: 5.89 },
      },
    ],
  },
  {
    keys: ['acucar', 'refinado', 'cristal', 'uniao', 'caravelas', '1kg', '5kg'],
    variants: [
      {
        title: 'Açúcar Refinado União Pacote 1kg',
        prices: { mercadolivre: 5.29, amazon: 4.89, magalu: 5.49, goodbom: 4.59, arena: 4.29 },
      },
      {
        title: 'Açúcar Cristal Caravelas 5kg',
        prices: { mercadolivre: 19.90, amazon: 18.90, magalu: 20.49, goodbom: 17.49, arena: 16.49 },
      },
    ],
  },
  {
    keys: ['azeite', 'gallo', 'andorinha', 'borges', '500ml', 'extra virgem'],
    variants: [
      {
        title: 'Azeite de Oliva Extra Virgem Português Gallo Vidro 500ml',
        prices: { mercadolivre: 39.90, amazon: 36.90, magalu: 41.50, goodbom: 38.99, arena: 35.90 },
      },
      {
        title: 'Azeite Extra Virgem Andorinha Vidro 500ml',
        prices: { mercadolivre: 38.50, amazon: 35.99, magalu: 39.90, goodbom: 37.49, arena: 34.90 },
      },
    ],
  },
  {
    keys: ['sabao', 'lava roupas', 'omo', 'tixan', 'brilhante', '3l', 'po'],
    variants: [
      {
        title: 'Lava Roupas Líquido Omo Lavagem Perfeita 3L',
        prices: { mercadolivre: 34.90, amazon: 31.90, magalu: 33.90, goodbom: 36.99, arena: 32.90 },
      },
      {
        title: 'Sabão em Pó Omo Lavagem Perfeita 2,2kg',
        prices: { mercadolivre: 27.90, amazon: 25.90, magalu: 26.90, goodbom: 28.99, arena: 24.90 },
      },
    ],
  },
  {
    keys: ['macarrao', 'espaguete', 'parafuso', 'barilla', 'adria', 'renata', '500g'],
    variants: [
      {
        title: 'Macarrão Espaguete Nº 8 Renata Sêmola 500g',
        prices: { mercadolivre: 4.79, amazon: 4.29, magalu: 4.99, goodbom: 3.99, arena: 3.69 },
      },
      {
        title: 'Macarrão Espaguete Barilla Grano Duro 500g',
        prices: { mercadolivre: 7.90, amazon: 6.99, magalu: 8.20, goodbom: 7.49, arena: 6.79 },
      },
    ],
  },
  {
    keys: ['molho', 'tomate', 'heinz', 'pomarola', 'fugini', '300g', '340g'],
    variants: [
      {
        title: 'Molho de Tomate Tradicional Heinz Sachê 300g',
        prices: { mercadolivre: 3.99, amazon: 3.49, magalu: 4.19, goodbom: 3.69, arena: 3.19 },
      },
      {
        title: 'Molho de Tomate Tradicional Pomarola Sachê 300g',
        prices: { mercadolivre: 3.49, amazon: 3.19, magalu: 3.69, goodbom: 3.29, arena: 2.89 },
      },
    ],
  },
  {
    keys: ['papel', 'higienico', 'neve', 'personal', '12', '24', 'folha dupla'],
    variants: [
      {
        title: 'Papel Higiênico Folha Dupla Neve Toque da Seda Leve 12 Pague 11',
        prices: { mercadolivre: 21.90, amazon: 19.90, magalu: 20.90, goodbom: 22.99, arena: 18.90 },
      },
      {
        title: 'Papel Higiênico Folha Dupla Personal Vip 12 Rolos 30m',
        prices: { mercadolivre: 17.90, amazon: 16.49, magalu: 17.50, goodbom: 18.49, arena: 15.79 },
      },
    ],
  },
  {
    keys: ['detergente', 'ype', 'limpol', '500ml'],
    variants: [
      {
        title: 'Detergente Líquido Ypê Neutro 500ml',
        prices: { mercadolivre: 2.79, amazon: 2.49, magalu: 2.89, goodbom: 2.39, arena: 2.09 },
      },
      {
        title: 'Detergente Líquido Limpol Cristal 500ml',
        prices: { mercadolivre: 2.69, amazon: 2.45, magalu: 2.79, goodbom: 2.29, arena: 1.99 },
      },
    ],
  },
  {
    keys: ['manteiga', 'aviacao', 'presidente', 'italac', '200g'],
    variants: [
      {
        title: 'Manteiga de Primeira Qualidade Com Sal Aviação Pote 200g',
        prices: { mercadolivre: 14.90, amazon: 13.90, magalu: 15.20, goodbom: 12.99, arena: 11.89 },
      },
      {
        title: 'Manteiga Extra Com Sal Président Tablete 200g',
        prices: { mercadolivre: 13.90, amazon: 12.99, magalu: 14.40, goodbom: 12.49, arena: 11.49 },
      },
    ],
  },
  {
    keys: ['biscoito', 'bolacha', 'oreo', 'bauducco', 'maizena', 'nesfit'],
    variants: [
      {
        title: 'Biscoito Recheado Oreo Original 90g',
        prices: { mercadolivre: 4.49, amazon: 3.99, magalu: 4.59, goodbom: 4.19, arena: 3.69 },
      },
      {
        title: 'Biscoito Maisena Bauducco Pacote 170g',
        prices: { mercadolivre: 4.29, amazon: 3.89, magalu: 4.49, goodbom: 3.99, arena: 3.49 },
      },
    ],
  },
  {
    keys: ['refrigerante', 'coca', 'coca-cola', 'guarana', 'antarctica', '2l'],
    variants: [
      {
        title: 'Refrigerante Coca-Cola Original Garrafa 2 Litros',
        prices: { mercadolivre: 11.90, amazon: 10.99, magalu: 11.50, goodbom: 9.99, arena: 9.29 },
      },
      {
        title: 'Refrigerante Guaraná Antarctica Garrafa 2 Litros',
        prices: { mercadolivre: 9.90, amazon: 8.99, magalu: 9.50, goodbom: 8.49, arena: 7.79 },
      },
    ],
  },
  {
    keys: ['frango', 'peito', 'file', 'sadia', 'perdigao', 'seara', '1kg'],
    variants: [
      {
        title: 'Filé de Peito de Frango Congelado Sadia Bandeja 1kg',
        prices: { mercadolivre: 23.90, amazon: 22.50, magalu: 24.40, goodbom: 19.99, arena: 18.49 },
      },
      {
        title: 'Filé de Peito de Frango Seara Bandeja 1kg',
        prices: { mercadolivre: 22.90, amazon: 21.90, magalu: 23.50, goodbom: 18.99, arena: 17.79 },
      },
    ],
  },
];

function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'para', 'o', 'a', 'em', 'tipo']);

export function matchScore(query, title) {
  const t = ' ' + norm(title) + ' ';
  const words = norm(query).split(' ').filter((w) => w && !STOP.has(w));
  if (!words.length) return 0;
  let hit = 0;
  for (const w of words) {
    const m = w.match(/^(\d+(?:\.\d+)?)([a-z]+)$/);
    if (t.includes(w) || (m && t.includes(`${m[1]} ${m[2]}`))) hit++;
  }
  return hit / words.length;
}

// Hash determinístico para gerar preço realista para itens livres fora do catálogo fixo
function hashNum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// Multiplicadores médios por tipo de loja (atacado tende a ser mais barato em mercearia, etc.)
const STORE_FACTOR = {
  arena: 0.91,
  goodbom: 0.96,
  amazon: 0.98,
  mercadolivre: 1.03,
  magalu: 1.05,
};

export function searchCatalog(store, query, max = 6) {
  const qNorm = norm(query);
  const qWords = qNorm.split(' ').filter((w) => w && !STOP.has(w));
  const searchUrl = store.searchUrl.replace('{q}', encodeURIComponent(query));

  // Procura entradas do catálogo que batem com a busca
  let matchedVariants = [];
  for (const group of CATALOG) {
    const groupHit = qWords.some((w) => group.keys.some((k) => k.includes(w) || w.includes(k)));
    if (groupHit) {
      for (const v of group.variants) {
        let basePrice = v.prices[store.id];
        if (!basePrice) {
          // Loja customizada adicionada pelo usuário: calcula preço realista a partir da média
          const vals = Object.values(v.prices);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const jitter = ((hashNum(store.id + v.title) % 17) - 8) / 100; // -8% a +8%
          basePrice = Number((avg * (1 + jitter)).toFixed(2));
        }
        matchedVariants.push({
          title: v.title,
          price: basePrice,
          url: searchUrl,
          score: Math.max(0.65, matchScore(query, v.title)),
        });
      }
    }
  }

  // Se o usuário digitou qualquer outro produto que não está no catálogo pré-definido,
  // gera candidatos correspondentes com preços coerentes entre as lojas
  if (!matchedVariants.length) {
    const baseSeed = hashNum(qNorm);
    const basePrice = 6 + (baseSeed % 32) + ((baseSeed % 90) / 100);
    const factor = STORE_FACTOR[store.id] ?? (0.94 + ((hashNum(store.id) % 15) / 100));
    const jitter1 = ((hashNum(store.id + qNorm + '1') % 13) - 6) / 100;
    const jitter2 = ((hashNum(store.id + qNorm + '2') % 15) - 4) / 100;
    const cleanTitle = query.trim().replace(/\b\w/g, (c) => c.toUpperCase());

    matchedVariants = [
      {
        title: `${cleanTitle} - Oferta ${store.name}`,
        price: Number(Math.max(1.99, basePrice * factor * (1 + jitter1)).toFixed(2)),
        url: searchUrl,
        score: 1.0,
      },
      {
        title: `${cleanTitle} Marca Tradicional`,
        price: Number(Math.max(2.49, basePrice * factor * (1.06 + jitter2)).toFixed(2)),
        url: searchUrl,
        score: 0.85,
      },
      {
        title: `${cleanTitle} Linha Econômica`,
        price: Number(Math.max(1.79, basePrice * factor * (0.93 + jitter1)).toFixed(2)),
        url: searchUrl,
        score: 0.75,
      },
    ];
  }

  return matchedVariants
    .sort((a, b) => b.score - a.score || a.price - b.price)
    .slice(0, max);
}
