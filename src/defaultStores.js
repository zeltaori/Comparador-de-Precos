// Lojas que vêm configuradas na primeira execução.
// Tudo aqui pode ser editado pela interface (aba "Lojas").
//
// searchUrl: use {q} onde entra o termo pesquisado (já codificado para URL).
// selectors: seletores CSS opcionais. Se falharem, o extrator genérico é usado.
// shipping: fee = valor do frete; freeAbove = frete grátis a partir deste subtotal
//           (null = nunca grátis); minOrder = pedido mínimo (0 = sem mínimo).
//           Valores de frete são ESTIMATIVAS – ajuste conforme seu CEP/conta.

module.exports = [
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
    // A GoodBom separa o site por loja física (ex.: /campinas-sp-parque-taquaral).
    // Troque o trecho da loja pela unidade que atende o seu CEP.
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
