// Motor de correspondência semântica (tipo de produto + medida/quantidade + classificação Exato vs Similar)
// IMPORTANTE: Este módulo NÃO contém nem gera preços fictícios. Todos os preços vêm exclusivamente das lojas reais.

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
    loginUrl:
      'https://www.amazon.com.br/ap/signin?openid.pape.max_auth_age=0&openid.return_to=https%3A%2F%2Fwww.amazon.com.br%2F&openid.identity=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.assoc_handle=brflex&openid.mode=checkid_setup&openid.claimed_id=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0%2Fidentifier_select&openid.ns=http%3A%2F%2Fspecs.openid.net%2Fauth%2F2.0',
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

// ---------------- Normalização, Tokenização e Medidas ----------------

export function norm(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/,/g, '.')
    .replace(/[^a-z0-9.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stemToken(w) {
  if (!w || w.length <= 3 || /^\d/.test(w)) return w;
  if (w === 'paes') return 'pao';
  if (w.endsWith('oes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('aes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('ais') && w.length > 4) return w.slice(0, -3) + 'al';
  if (w.endsWith('eis') && w.length > 4) return w.slice(0, -3) + 'el';
  if (w.endsWith('is') && w.length > 4 && !w.endsWith('bis')) return w.slice(0, -2) + 'l';
  if (w.endsWith('ns') && w.length > 4) return w.slice(0, -2) + 'm';
  if (w.endsWith('res') && w.length > 4) return w.slice(0, -2);
  if (w.endsWith('s') && !/(lapis|pires|virus|onibus|status|mais|menos|tres|dois|seis)$/.test(w)) {
    return w.slice(0, -1);
  }
  return w;
}

const STOP = new Set([
  'de', 'da', 'do', 'das', 'dos', 'e', 'com', 'sem', 'para', 'por', 'o', 'a', 'os', 'as',
  'em', 'no', 'na', 'nos', 'nas', 'um', 'uma', 'tipo', 'pacote', 'pct', 'pet', 'bdj',
  'kit', 'leve', 'pague', 'un', 'und', 'unid', 'unidade', 'unidades', 'kg', 'quilo',
  'quilos', 'g', 'gr', 'grama', 'gramas', 'mg', 'l', 'lt', 'lts', 'litro', 'litros',
  'ml', 'rolo', 'rolos', 'folha', 'folhas', 'longa', 'vida', 'uht', 'agulhinha',
  'almofada', 'pouch', 'vacuo', 'vidro', 'sache', 'caixa', 'garrafa', 'lata', 'pote',
]);

export function parseLeadingQty(rawText) {
  let txt = String(rawText || '').trim();
  if (!txt) return { qty: null, query: '' };

  let m = txt.match(/^(\d+)\s*x\s+(.+)$/i);
  if (m) return { qty: Math.max(1, Number(m[1])), query: m[2].trim() };

  m = txt.match(/^(.+?)\s*(?:\(\s*(\d+)\s*x\s*\)|\s+x\s*(\d+))$/i);
  if (m) return { qty: Math.max(1, Number(m[2] || m[3])), query: m[1].trim() };

  m = txt.match(
    /^(\d+)\s+(?:un|und|unid|unidades?|pacotes?|pct|caixas?|cx|latas?|garrafas?|potes?|bandejas?|saches?|fardos?)\s+(?:de\s+)?(.+)$/i
  );
  if (m) return { qty: Math.max(1, Number(m[1])), query: m[2].trim() };

  m = txt.match(/^(\d+)\s+([a-zA-ZÀ-ÿ]+.*)$/);
  if (m) {
    const num = Number(m[1]);
    const rest = m[2].trim();
    const firstWord = norm(rest).split(' ')[0];
    const isMeasureOrBrand = /^(kg|quilo|g|gr|grama|mg|l|lt|litro|ml|rolo|ovo|folha|coracoe|coracao|queijo)$/.test(firstWord);
    if (!isMeasureOrBrand && num >= 1 && num <= 99) {
      return { qty: num, query: rest };
    }
  }

  return { qty: null, query: txt };
}

export function extractMeasures(text) {
  const s = ' ' + norm(text) + ' ';
  const measures = [];

  if (/\bmeio\s+quilo\b/.test(s)) {
    measures.push({ dim: 'weight', value: 500, label: '500g' });
  }
  if (/\buma?\s+duzia\b|\b1\s+duzia\b/.test(s)) {
    measures.push({ dim: 'count', value: 12, label: '12 un' });
  }
  if (/\bmeia\s+duzia\b/.test(s)) {
    measures.push({ dim: 'count', value: 6, label: '6 un' });
  }

  const re = /\b(\d+(?:\.\d+)?)\s*(kg|quilos?|g|gr|gramas?|mg|l|lt|lts|litros?|ml|rolos?|ovos?|un|und|uni|unid|unidades?|capsulas?|saches?|tabletes?|folhas?)\b/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const num = parseFloat(m[1]);
    if (!(num > 0)) continue;
    const u = m[2];
    if (u === 'kg' || u.startsWith('quilo')) {
      measures.push({ dim: 'weight', value: Math.round(num * 1000), label: `${m[1].replace('.', ',')}kg` });
    } else if (u === 'g' || u === 'gr' || u.startsWith('grama')) {
      measures.push({ dim: 'weight', value: Math.round(num), label: `${Math.round(num)}g` });
    } else if (u === 'mg') {
      measures.push({ dim: 'weight', value: num / 1000, label: `${Math.round(num)}mg` });
    } else if (u === 'l' || u === 'lt' || u === 'lts' || u.startsWith('litro')) {
      measures.push({ dim: 'volume', value: Math.round(num * 1000), label: `${m[1].replace('.', ',')}L` });
    } else if (u === 'ml') {
      measures.push({ dim: 'volume', value: Math.round(num), label: `${Math.round(num)}ml` });
    } else if (u.startsWith('rolo')) {
      measures.push({ dim: 'count', value: Math.round(num), label: `${Math.round(num)} rolos` });
    } else if (u.startsWith('ovo')) {
      measures.push({ dim: 'count', value: Math.round(num), label: `${Math.round(num)} ovos` });
    } else if (u.startsWith('folha')) {
      if (num >= 10) measures.push({ dim: 'sheets', value: Math.round(num), label: `${Math.round(num)} folhas` });
    } else {
      measures.push({ dim: 'count', value: Math.round(num), label: `${Math.round(num)} un` });
    }
  }

  const lp = s.match(/\bleve\s+(\d+)\s+pague\s+\d+\b/);
  if (lp && !measures.some((x) => x.dim === 'count')) {
    measures.push({ dim: 'count', value: parseInt(lp[1], 10), label: `${lp[1]} un` });
  }

  const mp = s.match(/\b(?:kit|pack|fardo|caixa|cx|combo)(?:\s+(?:com|fechada|c\s*\/))?\s*(\d+)\b/);
  if (mp && !measures.some((x) => x.dim === 'count')) {
    const cnt = parseInt(mp[1], 10);
    if (cnt > 1 && cnt <= 100) {
      measures.push({ dim: 'count', value: cnt, label: `${cnt} un` });
    }
  }

  return measures;
}

const SYNONYM_MAP = {
  bolacha: 'biscoito',
  candida: 'sanitaria',
  qboa: 'sanitaria',
  cloro: 'sanitaria',
  catchup: 'ketchup',
  macaxeira: 'mandioca',
  aipim: 'mandioca',
  mexerica: 'tangerina',
  bergamota: 'tangerina',
  ponkan: 'tangerina',
  jerimum: 'abobora',
  mussarela: 'mucarela',
  mozarela: 'mucarela',
  extravirgem: 'virgem',
};

function canonicalToken(t) {
  return SYNONYM_MAP[t] || t;
}

export function extractProductTokens(text) {
  const cleaned = norm(text).replace(
    /\b\d+(?:\.\d+)?\s*(kg|quilos?|g|gr|gramas?|mg|l|lt|lts|litros?|ml|rolos?|ovos?|un|und|uni|unid|unidades?|capsulas?|saches?|tabletes?|folhas?|m|metros?)\b/g,
    ' '
  );
  return cleaned
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w && !STOP.has(w) && !/^\d+(?:\.\d+)?$/.test(w))
    .map(stemToken)
    .map(canonicalToken);
}

// Derivados que são OUTRO produto completamente diferente (nunca devem ser sugeridos nem como "similar")
const TRUE_DERIVATIVE_CONFLICTS = [
  { base: 'leite', modifiers: ['creme', 'condensado', 'coco', 'doce', 'fermentado', 'sabonete', 'hidratante', 'chocolate', 'achocolatado', 'biscoito', 'farinha', 'composto', 'formula'] },
  { base: 'arroz', modifiers: ['biscoito', 'farinha', 'flocao', 'vinagre', 'bebida', 'papel', 'macarrao'] },
  { base: 'tomate', modifiers: ['molho', 'extrato', 'polpa', 'passata', 'seco', 'ketchup', 'sardinha', 'atum'] },
  { base: 'batata', modifiers: ['palha', 'chips', 'ondulada', 'pringles', 'ruffles', 'flocos', 'pure'] },
  { base: 'milho', modifiers: ['flocao', 'farinha', 'fuba', 'amido', 'oleo', 'pipoca', 'salgadinho', 'xarope'] },
  { base: 'feijao', modifiers: ['caldo', 'biscoito', 'macarrao'] },
  { base: 'cafe', modifiers: ['biscoito', 'bala', 'filtro', 'coador', 'garrafa', 'cafeteira', 'xicara', 'colher', 'leite'] },
  { base: 'acucar', modifiers: ['biscoito', 'bala', 'chiclete'] },
  { base: 'sal', modifiers: ['biscoito', 'salgadinho', 'amendoim', 'pipoca', 'manteiga', 'margarina', 'queijo'] },
  { base: 'agua', modifiers: ['sanitaria', 'coco', 'micelar', 'oxigenada', 'colonia', 'perfume'] },
  { base: 'coco', modifiers: ['agua', 'leite', 'oleo', 'sabao', 'sabonete', 'detergente', 'biscoito', 'ralado'] },
  { base: 'frango', modifiers: ['caldo', 'tempero', 'miojo', 'macarrao', 'lasanha', 'pate', 'racao', 'petisco', 'biscoito'] },
  { base: 'carne', modifiers: ['caldo', 'tempero', 'miojo', 'macarrao', 'lasanha', 'racao', 'petisco'] },
  { base: 'queijo', modifiers: ['pao', 'biscoito', 'salgadinho', 'pipoca', 'macarrao', 'miojo', 'molho', 'lasanha', 'pastel'] },
  { base: 'chocolate', modifiers: ['biscoito', 'bolo', 'mistura', 'sorvete', 'leite', 'wafer', 'pao'] },
  { base: 'laranja', modifiers: ['refrigerante', 'fanta', 'refresco', 'tang', 'bolo', 'gelatina', 'sabonete', 'detergente', 'desinfetante'] },
  { base: 'limao', modifiers: ['refrigerante', 'sprite', 'refresco', 'tang', 'gelatina', 'detergente', 'desinfetante', 'sabao'] },
  { base: 'uva', modifiers: ['refrigerante', 'fanta', 'refresco', 'tang', 'gelatina', 'passa'] },
  { base: 'maca', modifiers: ['vinagre', 'cha', 'detergente', 'desinfetante', 'suco', 'papinha'] },
  { base: 'alho', modifiers: ['pao', 'pasta', 'tempero', 'molho', 'biscoito', 'farofa', 'torrada'] },
  { base: 'cebola', modifiers: ['salgadinho', 'biscoito', 'creme', 'sopa', 'farofa', 'anel', 'palha'] },
  { base: 'pao', modifiers: ['queijo', 'mel', 'alho', 'farinha', 'rosca', 'torrada'] },
  { base: 'papel', modifiers: ['toalha', 'aluminio', 'manteiga', 'filtro', 'coador', 'guardanapo', 'filme', 'presente', 'sulfite'] },
];

// Subtipos do mesmo produto (se diferirem, o item não é "exato", mas pode ser uma opção "similar" caso a loja não tenha o exato)
const SUBTYPE_OPPOSITES = [
  ['carioca', 'preto', 'fradinho', 'branco', 'vermelho'],
  ['integral', 'desnatado', 'semidesnatado'],
  ['branco', 'integral', 'parboilizado', 'negro', 'arboreo', 'japones', 'oriental'],
  ['refinado', 'cristal', 'mascavo', 'demerara', 'confeiteiro'],
  ['liquido', 'po', 'barra', 'pedra', 'capsula'],
  ['espaguete', 'parafuso', 'penne', 'gravatinha', 'ninho', 'lasanha', 'instantaneo', 'miojo'],
  ['soja', 'milho', 'girassol', 'canola', 'algodao', 'coco', 'oliva'],
  ['tradicional', 'extraforte', 'descafeinado', 'soluvel'],
];

// Vocabulário de termos que identificam o produto/subtipo (não são marcas)
const CORE_PRODUCT_WORDS = new Set([
  'arroz', 'feijao', 'cafe', 'leite', 'oleo', 'acucar', 'azeite', 'sal', 'farinha', 'trigo',
  'mandioca', 'fuba', 'flocao', 'amido', 'macarrao', 'espaguete', 'parafuso', 'penne', 'lasanha',
  'miojo', 'lamen', 'molho', 'extrato', 'tomate', 'maionese', 'ketchup', 'mostarda', 'atum',
  'sardinha', 'milho', 'ervilha', 'azeitona', 'pipoca', 'creme', 'manteiga', 'margarina',
  'requeijao', 'iogurte', 'queijo', 'mucarela', 'prato', 'parmesao', 'presunto', 'mortadela',
  'pao', 'forma', 'torrada', 'biscoito', 'wafer', 'achocolatado', 'aveia', 'granola', 'chocolate',
  'ovo', 'frango', 'peito', 'coxa', 'sobrecoxa', 'file', 'carne', 'patinho', 'acem', 'alcatra',
  'picanha', 'linguca', 'salsicha', 'bacon', 'hamburguer', 'batata', 'cebola', 'alho', 'banana',
  'maca', 'laranja', 'limao', 'mamao', 'melancia', 'abacaxi', 'uva', 'agua', 'mineral', 'gas',
  'refrigerante', 'suco', 'cerveja', 'vinho', 'lava', 'roupa', 'sabao', 'liquido', 'po', 'barra',
  'amaciante', 'detergente', 'agua', 'sanitaria', 'desinfetante', 'esponja', 'papel', 'higienico',
  'toalha', 'guardanapo', 'sabonete', 'shampoo', 'condicionador', 'creme', 'dental', 'desodorante',
  'fralda', 'racao', 'carioca', 'preto', 'branco', 'integral', 'desnatado', 'semidesnatado',
  'parboilizado', 'refinado', 'cristal', 'mascavo', 'demerara', 'soja', 'girassol', 'canola',
  'oliva', 'extra', 'virgem', 'tradicional', 'extraforte', 'soluvel', 'condensado', 'coco',
]);

export function hasTrueDerivativeConflict(qTokens, tTokens) {
  const qSet = new Set(qTokens);
  const tSet = new Set(tTokens);

  for (const rule of TRUE_DERIVATIVE_CONFLICTS) {
    const base = canonicalToken(stemToken(rule.base));
    if (qSet.has(base) || tSet.has(base)) {
      for (const mod of rule.modifiers) {
        const mStem = canonicalToken(stemToken(mod));
        const inQ = qSet.has(mStem);
        const inT = tSet.has(mStem);
        if (qSet.has(base) && inT && !inQ) return true;
        if (tSet.has(base) && inQ && !inT) return true;
      }
    }
  }
  return false;
}

export function hasSubtypeConflict(qTokens, tTokens) {
  const qSet = new Set(qTokens);
  const tSet = new Set(tTokens);

  for (const group of SUBTYPE_OPPOSITES) {
    const stems = group.map((w) => canonicalToken(stemToken(w)));
    const requested = stems.filter((s) => qSet.has(s));
    if (requested.length > 0) {
      const presentInTitle = stems.filter((s) => tSet.has(s));
      if (presentInTitle.length > 0 && !requested.some((r) => presentInTitle.includes(r))) {
        return true;
      }
    } else {
      if (qSet.has('arroz') && ['integral', 'parboilizado', 'negro', 'arboreo', 'japones', 'oriental'].some((s) => tSet.has(s))) {
        return true;
      }
      if (qSet.has('leite') && !qSet.has('po') && tSet.has('po')) {
        return true;
      }
    }
  }
  return false;
}

function matchesHeadProduct(qTokens, tSet) {
  const head = qTokens[0];
  if (tSet.has(head)) return true;
  if ((head === 'lava' || head === 'sabao') && (tSet.has('lava') || (tSet.has('sabao') && (tSet.has('liquido') || tSet.has('roupa') || tSet.has('po'))))) {
    return true;
  }
  return false;
}

// Classifica cada produto real da loja em:
// - matchType: 'exact' (mesmo produto, unidade avulsa, mesma marca se informada, mesmo subtipo e mesma medida)
// - matchType: 'similar' (mesmo tipo de produto na loja, mas outra marca, outra embalagem/medida, kit ou variação similar)
// - valid: false (produto sem conexão ou derivado conflitante)
export function classifyCandidate(query, title) {
  const qTokens = extractProductTokens(query);
  const tTokens = extractProductTokens(title);
  if (!qTokens.length || !tTokens.length) return { valid: false, score: 0 };

  const tSet = new Set(tTokens);

  if (!matchesHeadProduct(qTokens, tSet)) {
    return { valid: false, score: 0 };
  }

  if (hasTrueDerivativeConflict(qTokens, tTokens)) {
    return { valid: false, score: 0 };
  }

  const coreTokens = qTokens.filter((t) => CORE_PRODUCT_WORDS.has(t));
  const brandTokens = qTokens.filter((t) => !CORE_PRODUCT_WORDS.has(t));

  let coreHits = 0;
  for (const ct of coreTokens) {
    if (tSet.has(ct) || (ct === 'lava' && tSet.has('sabao')) || (ct === 'roupa' && tSet.has('sabao'))) coreHits++;
  }
  const coreRatio = coreTokens.length ? coreHits / coreTokens.length : 1;

  let brandHits = 0;
  for (const bt of brandTokens) {
    if (tSet.has(bt)) brandHits++;
  }
  const brandMatched = brandTokens.length === 0 || brandHits === brandTokens.length;

  const subtypeConflict = hasSubtypeConflict(qTokens, tTokens);

  // Verifica medida/embalagem (ex: 5kg, 1kg, 500g, 1L, 900ml, 3L) e se é Kit/Caixa com múltiplas unidades
  const qMeasures = extractMeasures(query);
  const tMeasures = extractMeasures(title);
  let measureMatch = true;
  let measureMissing = false;

  const qCountMeasure = qMeasures.find((m) => m.dim === 'count');
  const tCountMeasure = tMeasures.find((m) => m.dim === 'count');
  const unrequestedMultipack = !qCountMeasure && tCountMeasure && tCountMeasure.value > 1 ? tCountMeasure.value : 0;

  if (qMeasures.length > 0) {
    for (const qm of qMeasures) {
      const sameDim = tMeasures.find((tm) => tm.dim === qm.dim);
      if (sameDim) {
        const ratio = sameDim.value / qm.value;
        if (ratio < 0.85 || ratio > 1.15) {
          measureMatch = false;
        }
      } else {
        measureMissing = true;
      }
    }
  }

  // Caso A: Correspondência EXATA (unidade avulsa, mesmo produto, mesmo subtipo, mesma marca se pedida, mesma medida)
  if (!subtypeConflict && !unrequestedMultipack && measureMatch && !measureMissing && brandMatched && coreRatio >= 0.75) {
    const exactScore = 0.88 + 0.12 * coreRatio;
    return {
      valid: true,
      matchType: 'exact',
      similarReason: null,
      score: Number(Math.min(1, exactScore).toFixed(3)),
    };
  }

  // Caso B: Opção SIMILAR real disponível na loja
  const reasons = [];
  if (unrequestedMultipack > 1) reasons.push(`kit/caixa c/ ${unrequestedMultipack} un.`);
  if (!brandMatched && brandTokens.length > 0) reasons.push('outra marca');
  if (!measureMatch || measureMissing) reasons.push('outro tamanho/embalagem');
  if (subtypeConflict) reasons.push('variação similar');

  let simScore = 0.50 * coreRatio + (brandMatched ? 0.18 : 0.08);
  if (measureMatch && !measureMissing) simScore += 0.22;
  else if (measureMissing) simScore += 0.08;
  if (!subtypeConflict) simScore += 0.08;
  else simScore -= 0.08;

  // Penaliza kits/fardos quando o usuário pediu apenas 1 unidade avulsa, para priorizar unidades avulsas similares
  if (unrequestedMultipack > 1) {
    simScore = Math.min(0.34, simScore * 0.45);
  }

  simScore = Math.max(0.25, Math.min(0.84, simScore));

  return {
    valid: true,
    matchType: 'similar',
    similarReason: reasons.length ? `Similar (${reasons.join(', ')})` : 'Opção similar',
    score: Number(simScore.toFixed(3)),
  };
}

export function matchScore(query, title) {
  const c = classifyCandidate(query, title);
  return c.valid ? c.score : 0;
}

// Gera termos de busca alternativos (sem a marca ou sem a medida) preservando a grafia original
// quando a loja não possui a marca ou embalagem exata solicitada.
export function buildFallbackQueries(query) {
  const measures = extractMeasures(query);
  const measureStr = measures.map((m) => m.label.replace(',', '.')).join(' ');

  const rawWords = String(query || '')
    .replace(/\b\d+(?:\.\d+)?\s*(kg|quilos?|g|gr|gramas?|mg|l|lt|lts|litros?|ml|rolos?|ovos?|un|und|unid|unidades?|capsulas?|saches?|tabletes?|folhas?|m|metros?)\b/gi, ' ')
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const coreOrigWords = rawWords.filter((w) => {
    const n = norm(w);
    if (!n || STOP.has(n)) return false;
    return CORE_PRODUCT_WORDS.has(canonicalToken(stemToken(n)));
  });

  const qTokens = extractProductTokens(query);
  const fallbacks = [];
  const addFb = (s) => {
    const clean = s.trim().replace(/\s+/g, ' ');
    if (clean && norm(clean) !== norm(query) && !fallbacks.some((f) => norm(f) === norm(clean))) {
      fallbacks.push(clean);
    }
  };

  if (coreOrigWords.length > 0) {
    // 1) Tipo de produto + subtipo + medida (sem a marca) -> ex: "Arroz 5kg", "Feijão Carioca 1kg", "Café Tradicional 500g"
    addFb([coreOrigWords.join(' '), measureStr].filter(Boolean).join(' '));

    // 2) Substantivo principal + medida -> ex: "Arroz 5kg", "Café 500g", "Azeite 500ml", "Leite 1L"
    addFb([coreOrigWords[0], measureStr].filter(Boolean).join(' '));

    // 3) Equivalente para Lava Roupas <-> Sabão Líquido
    if (qTokens[0] === 'lava' || qTokens[0] === 'sabao') {
      addFb('Lava Roupas');
      addFb('Sabão Líquido');
    }

    // 4) Tipo de produto sem a medida (caso a loja só tenha embalagem de outro tamanho, ex: 1kg ou 2L)
    addFb(coreOrigWords.slice(0, 2).join(' '));
  }

  return fallbacks.slice(0, 4);
}

// Filtra, classifica e ordena os resultados reais extraídos da loja
export function rankAndFilterCandidates(query, rawResults, maxLimit = 8) {
  if (!Array.isArray(rawResults) || !rawResults.length) return [];

  const seen = new Set();
  const classified = [];

  for (const r of rawResults) {
    if (!r || !r.title || !(r.price > 0)) continue;
    const key = `${norm(r.title)}|${Number(r.price).toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const info = classifyCandidate(query, r.title);
    if (!info.valid) continue;

    classified.push({
      title: r.title,
      price: Number(r.price),
      url: r.url || null,
      image: r.image || null,
      score: info.score,
      matchType: info.matchType,
      similarReason: info.similarReason,
    });
  }

  classified.sort((a, b) => {
    // Prioriza sempre correspondências exatas antes de opções similares
    if (a.matchType !== b.matchType) {
      return a.matchType === 'exact' ? -1 : 1;
    }
    const tierA = Math.floor(a.score / 0.08);
    const tierB = Math.floor(b.score / 0.08);
    if (tierA !== tierB) return tierB - tierA;
    return a.price - b.price;
  });

  return classified.slice(0, maxLimit);
}

// Seleciona automaticamente o melhor produto:
// - Se houver produto EXATO na loja, escolhe o mais barato entre os exatos.
// - Se NÃO houver o produto exato na loja, escolhe a opção SIMILAR mais próxima/barata da loja.
export function selectBestCandidate(candidates) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const valid = candidates.map((c, idx) => ({ ...c, idx })).filter((c) => c.price > 0);
  if (!valid.length) return null;

  const exacts = valid.filter((c) => c.matchType === 'exact');
  const pool = exacts.length > 0 ? exacts : valid;

  const maxScore = Math.max(...pool.map((c) => c.score ?? 0));
  const topTier = pool.filter((c) => (c.score ?? 0) >= maxScore - 0.08);
  topTier.sort((a, b) => a.price - b.price);
  return topTier[0].idx;
}
