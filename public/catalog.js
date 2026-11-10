// Catálogo inteligente de produtos de supermercado + motor de correspondência semântica (tipo de produto + medida/quantidade)
// Usado tanto no modo Web (GitHub Pages) quanto como fallback/validador no servidor local.

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

// Reduz plurais comuns em português para comparar palavras inteiras com precisão
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
  'ml', 'rolo', 'rolos', 'folha', 'folhas',
]);

// Extrai quantidade multiplicadora digitada no próprio texto (ex.: "3x Leite 1L", "2 un Arroz 5kg", "3 Leite 1L")
export function parseLeadingQty(rawText) {
  let txt = String(rawText || '').trim();
  if (!txt) return { qty: null, query: '' };

  // 1) "3x Leite 1L" ou "3 x Leite 1L"
  let m = txt.match(/^(\d+)\s*x\s+(.+)$/i);
  if (m) return { qty: Math.max(1, Number(m[1])), query: m[2].trim() };

  // 2) "Leite 1L x3" ou "Leite 1L (3x)" no final
  m = txt.match(/^(.+?)\s*(?:\(\s*(\d+)\s*x\s*\)|\s+x\s*(\d+))$/i);
  if (m) return { qty: Math.max(1, Number(m[2] || m[3])), query: m[1].trim() };

  // 3) "3 unidades de Leite 1L" ou "2 pacotes de Arroz 5kg"
  m = txt.match(
    /^(\d+)\s+(?:un|und|unid|unidades?|pacotes?|pct|caixas?|cx|latas?|garrafas?|potes?|bandejas?|saches?|fardos?)\s+(?:de\s+)?(.+)$/i
  );
  if (m) return { qty: Math.max(1, Number(m[1])), query: m[2].trim() };

  // 4) "3 Leite 1L" ou "2 Arroz 5kg" (número no início seguido de palavra que não é unidade de medida nem marca "3 Corações")
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

// Extrai medidas físicas (peso em gramas, volume em ml, contagem em unidades/rolos/ovos)
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

  const re = /\b(\d+(?:\.\d+)?)\s*(kg|quilos?|g|gr|gramas?|mg|l|lt|lts|litros?|ml|rolos?|ovos?|un|und|unid|unidades?|capsulas?|saches?|tabletes?|folhas?)\b/g;
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

  return measures;
}

export function extractProductTokens(text) {
  const cleaned = norm(text).replace(
    /\b\d+(?:\.\d+)?\s*(kg|quilos?|g|gr|gramas?|mg|l|lt|lts|litros?|ml|rolos?|ovos?|un|und|unid|unidades?|capsulas?|saches?|tabletes?|folhas?|m|metros?)\b/g,
    ' '
  );
  return cleaned
    .split(' ')
    .map((w) => w.trim())
    .filter((w) => w && !STOP.has(w) && !/^\d+(?:\.\d+)?$/.test(w))
    .map(stemToken);
}

// Regras de desambiguação simétricas:
// Se a busca tem "leite" sem "condensado", rejeita títulos com "condensado";
// Se a busca tem "leite condensado", rejeita títulos com "leite" que NÃO tenham "condensado"!
const DERIVATIVE_CONFLICTS = [
  { base: 'leite', modifiers: ['creme', 'condensado', 'coco', 'doce', 'fermentado', 'po', 'sabonete', 'hidratante', 'chocolate', 'achocolatado', 'aveia', 'amendoa', 'soja', 'desnatado', 'semidesnatado'] },
  { base: 'arroz', modifiers: ['biscoito', 'bolacha', 'farinha', 'flocao', 'vinagre', 'bebida', 'papel', 'integral', 'parboilizado', 'arboreo', 'japones', 'negro'] },
  { base: 'coca', modifiers: ['zero', 'sem'] },
  { base: 'tomate', modifiers: ['molho', 'extrato', 'polpa', 'passata', 'seco', 'ketchup', 'catchup', 'sardinha', 'atum'] },
  { base: 'batata', modifiers: ['palha', 'chips', 'ondulada', 'pringles', 'ruffles', 'flocos', 'pure', 'doce', 'congelada', 'palito'] },
  { base: 'milho', modifiers: ['flocao', 'farinha', 'fuba', 'amido', 'oleo', 'pipoca', 'salgadinho', 'xarope'] },
  { base: 'feijao', modifiers: ['caldo', 'temperado', 'pronto'] },
  { base: 'cafe', modifiers: ['soluvel', 'capsula', 'cappuccino', 'achocolatado', 'biscoito', 'bala', 'filtro', 'coador', 'garrafa', 'cafeteira', 'xicara', 'colher'] },
  { base: 'acucar', modifiers: ['zero', 'adocante', 'mascavo', 'demerara', 'confeiteiro', 'baunilha'] },
  { base: 'sal', modifiers: ['biscoito', 'bolacha', 'salgadinho', 'amendoim', 'pipoca', 'manteiga', 'margarina', 'queijo', 'grosso', 'himalaia', 'tempero'] },
  { base: 'agua', modifiers: ['sanitaria', 'coco', 'micelar', 'oxigenada', 'colonia', 'perfume', 'tonica', 'saborizada'] },
  { base: 'coco', modifiers: ['agua', 'leite', 'oleo', 'sabao', 'sabonete', 'detergente', 'biscoito', 'ralado'] },
  { base: 'frango', modifiers: ['caldo', 'tempero', 'miojo', 'macarrao', 'lasanha', 'pate', 'racao', 'petisco', 'empanado', 'nugget', 'hamburguer', 'mortadela', 'salsicha'] },
  { base: 'carne', modifiers: ['caldo', 'tempero', 'miojo', 'macarrao', 'lasanha', 'racao', 'petisco', 'hamburguer', 'almondega', 'kibe', 'pastel', 'soja'] },
  { base: 'queijo', modifiers: ['pao', 'biscoito', 'salgadinho', 'pipoca', 'macarrao', 'miojo', 'molho', 'lasanha', 'pastel', 'ralado'] },
  { base: 'chocolate', modifiers: ['biscoito', 'bolacha', 'bolo', 'mistura', 'sorvete', 'leite', 'wafer', 'pao'] },
  { base: 'laranja', modifiers: ['refrigerante', 'fanta', 'refresco', 'tang', 'bolo', 'gelatina', 'sabonete', 'detergente', 'desinfetante'] },
  { base: 'limao', modifiers: ['refrigerante', 'sprite', 'refresco', 'tang', 'gelatina', 'detergente', 'desinfetante', 'sabao'] },
  { base: 'uva', modifiers: ['refrigerante', 'fanta', 'refresco', 'tang', 'gelatina', 'passa'] },
  { base: 'maca', modifiers: ['vinagre', 'cha', 'detergente', 'desinfetante', 'suco', 'papinha'] },
  { base: 'banana', modifiers: ['barra', 'cereal', 'bala', 'doce', 'chips', 'farofa'] },
  { base: 'alho', modifiers: ['pao', 'pasta', 'tempero', 'molho', 'biscoito', 'farofa', 'torrada'] },
  { base: 'cebola', modifiers: ['salgadinho', 'biscoito', 'creme', 'sopa', 'farofa', 'anel', 'palha'] },
  { base: 'pao', modifiers: ['queijo', 'mel', 'alho', 'farinha', 'rosca', 'torrada'] },
  { base: 'papel', modifiers: ['toalha', 'aluminio', 'manteiga', 'filtro', 'coador', 'guardanapo', 'filme', 'presente', 'sulfite'] },
  { base: 'sabao', modifiers: ['barra', 'pedra', 'pasta', 'po', 'liquido'] },
];

// Subtipos mutuamente exclusivos (se o usuário pedir um, não pode retornar outro)
const SUBTYPE_OPPOSITES = [
  ['carioca', 'preto', 'fradinho', 'branco', 'vermelho'],
  ['integral', 'desnatado', 'semidesnatado'],
  ['branco', 'integral', 'parboilizado', 'negro', 'arboreo', 'japones'],
  ['refinado', 'cristal', 'mascavo', 'demerara'],
  ['liquido', 'po', 'barra', 'capsula'],
  ['espaguete', 'parafuso', 'penne', 'gravatinha', 'ninho', 'lasanha', 'instantaneo', 'miojo'],
  ['coca', 'guarana', 'fanta', 'sprite', 'pepsi'],
  ['uva', 'laranja', 'limao', 'maracuja', 'abacaxi', 'manga', 'pessego', 'caju', 'goiaba', 'maca', 'morango'],
  ['soja', 'milho', 'girassol', 'canola', 'algodao', 'coco', 'oliva'],
  ['peito', 'coxa', 'sobrecoxa', 'asa', 'tulipa', 'passarinho', 'inteiro'],
  ['patinho', 'acem', 'alcatra', 'picanha', 'contrafile', 'costela', 'musculo', 'fraldinha', 'maminha', 'cupim', 'coxao'],
  ['lata', 'garrafa', 'caixinha'],
];

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
};

function canonicalToken(t) {
  return SYNONYM_MAP[t] || t;
}

export function hasDerivativeConflict(qTokens, tTokens) {
  const qSet = new Set(qTokens.map(canonicalToken));
  const tSet = new Set(tTokens.map(canonicalToken));

  // 1) Conflito simétrico de produto derivado (ex.: "leite" vs "leite condensado" / "creme de leite")
  for (const rule of DERIVATIVE_CONFLICTS) {
    const base = canonicalToken(stemToken(rule.base));
    if (qSet.has(base) || tSet.has(base)) {
      for (const mod of rule.modifiers) {
        const mStem = canonicalToken(stemToken(mod));
        const inQ = qSet.has(mStem);
        const inT = tSet.has(mStem);
        // Se a busca tem o termo base e o título tem um modificador derivado não pedido (ou vice-versa)
        if (qSet.has(base) && inT && !inQ) return true;
        if (tSet.has(base) && inQ && !inT) return true;
      }
    }
  }

  // 2) Subtipos mutuamente exclusivos (ex.: pediu "feijão preto" e veio "feijão carioca", ou pediu "suco de uva" e veio "suco de laranja")
  for (const group of SUBTYPE_OPPOSITES) {
    const stems = group.map((w) => canonicalToken(stemToken(w)));
    const requested = stems.filter((s) => qSet.has(s));
    if (requested.length > 0) {
      const presentInTitle = stems.filter((s) => tSet.has(s));
      if (presentInTitle.length > 0 && !requested.some((r) => presentInTitle.includes(r))) {
        return true;
      }
    }
  }

  return false;
}

// Calcula score de compatibilidade (0..1) considerando TIPO DE PRODUTO + SUBTIPO/MARCA + QUANTIDADE/MEDIDA
export function matchScore(query, title) {
  const qTokens = extractProductTokens(query).map(canonicalToken);
  const tTokens = extractProductTokens(title).map(canonicalToken);
  if (!qTokens.length || !tTokens.length) return 0;

  const tSet = new Set(tTokens);

  // Regra 1: O substantivo principal (primeira palavra do produto, ex: "arroz", "feijao", "sal", "pao")
  // DEVE estar presente como palavra inteira no título do produto!
  const headToken = qTokens[0];
  if (!tSet.has(headToken)) {
    return 0;
  }

  // Regra 2: Se o produto no título é um derivado conflitante ou subtipo oposto, rejeita!
  if (hasDerivativeConflict(qTokens, tTokens)) {
    return 0.05;
  }

  // Regra 3: Fração de palavras do produto que batem
  let wordHits = 0;
  for (const qt of qTokens) {
    if (tSet.has(qt)) wordHits++;
  }
  let score = wordHits / qTokens.length;

  // Regra 4: Compatibilidade de MEDIDA / QUANTIDADE da embalagem (ex: 5kg vs 1kg, 2L vs 350ml, 12 rolos vs 4 rolos)
  const qMeasures = extractMeasures(query);
  const tMeasures = extractMeasures(title);

  if (qMeasures.length > 0) {
    for (const qm of qMeasures) {
      const sameDim = tMeasures.find((tm) => tm.dim === qm.dim);
      if (sameDim) {
        const ratio = sameDim.value / qm.value;
        if (ratio >= 0.85 && ratio <= 1.15) {
          score = Math.min(1, score * 0.85 + 0.15);
        } else {
          // Medida incompatível! (ex: pediu 5kg e o produto é de 1kg) -> penaliza fortemente!
          score *= 0.12;
        }
      } else {
        score *= 0.7;
      }
    }
  }

  return Number(Math.min(1, Math.max(0, score)).toFixed(3));
}

// Seleciona automaticamente o melhor candidato:
// Prioriza a maior faixa de relevância (tipo + marca + medida) e, dentro da faixa de topo, escolhe o menor preço!
export function selectBestCandidate(candidates, minMatch = 0.55) {
  if (!Array.isArray(candidates) || !candidates.length) return null;
  const valid = candidates
    .map((c, idx) => ({ ...c, idx }))
    .filter((c) => (c.score ?? 0) >= minMatch && c.price > 0);
  if (!valid.length) return null;

  const maxScore = Math.max(...valid.map((c) => c.score));
  const topTier = valid.filter((c) => c.score >= maxScore - 0.08);
  topTier.sort((a, b) => a.price - b.price);
  return topTier[0].idx;
}

// ---------------- Catálogo Amplo de Supermercado ----------------

export const CATALOG = [
  // --- MERCEARIA BÁSICA ---
  {
    id: 'arroz',
    types: ['arroz'],
    defaultMeasure: { dim: 'weight', value: 5000, label: '5kg' },
    variants: [
      { title: 'Arroz Branco Tipo 1 Tio João Pacote 5kg', measure: { dim: 'weight', value: 5000, label: '5kg' }, prices: { mercadolivre: 29.90, amazon: 28.49, magalu: 30.90, goodbom: 27.99, arena: 25.89 } },
      { title: 'Arroz Branco Tipo 1 Camil Pacote 5kg', measure: { dim: 'weight', value: 5000, label: '5kg' }, prices: { mercadolivre: 27.50, amazon: 26.90, magalu: 28.40, goodbom: 24.99, arena: 23.49 } },
      { title: 'Arroz Branco Tipo 1 Broto Legal Pacote 5kg', measure: { dim: 'weight', value: 5000, label: '5kg' }, prices: { mercadolivre: 28.50, amazon: 27.90, magalu: 29.20, goodbom: 26.49, arena: 24.49 } },
      { title: 'Arroz Branco Tipo 1 Tio João Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 6.90, amazon: 6.49, magalu: 7.19, goodbom: 6.29, arena: 5.79 } },
      { title: 'Arroz Branco Tipo 1 Camil Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 6.29, amazon: 5.99, magalu: 6.49, goodbom: 5.69, arena: 5.19 } },
      { title: 'Arroz Integral Camil Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 7.49, amazon: 6.99, magalu: 7.89, goodbom: 6.79, arena: 6.19 } },
      { title: 'Arroz Parboilizado Tipo 1 Tio João 5kg', measure: { dim: 'weight', value: 5000, label: '5kg' }, prices: { mercadolivre: 29.50, amazon: 27.99, magalu: 30.20, goodbom: 27.49, arena: 25.29 } },
      { title: 'Arroz Parboilizado Tipo 1 Camil 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 6.49, amazon: 6.19, magalu: 6.79, goodbom: 5.89, arena: 5.39 } },
    ],
  },
  {
    id: 'feijao',
    types: ['feijao'],
    defaultMeasure: { dim: 'weight', value: 1000, label: '1kg' },
    variants: [
      { title: 'Feijão Carioca Tipo 1 Camil Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 8.49, amazon: 7.99, magalu: 8.79, goodbom: 7.49, arena: 6.89 } },
      { title: 'Feijão Carioca Tipo 1 Kicaldo Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 7.90, amazon: 7.59, magalu: 8.20, goodbom: 6.99, arena: 6.49 } },
      { title: 'Feijão Carioca Tipo 1 Broto Legal 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 8.69, amazon: 8.19, magalu: 8.89, goodbom: 7.69, arena: 6.99 } },
      { title: 'Feijão Preto Tipo 1 Camil Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 8.90, amazon: 8.29, magalu: 8.99, goodbom: 7.89, arena: 7.19 } },
      { title: 'Feijão Preto Tipo 1 Kicaldo Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 8.29, amazon: 7.89, magalu: 8.49, goodbom: 7.39, arena: 6.79 } },
      { title: 'Feijão Fradinho Camil 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 6.49, amazon: 5.99, magalu: 6.79, goodbom: 5.89, arena: 5.29 } },
    ],
  },
  {
    id: 'cafe',
    types: ['cafe'],
    defaultMeasure: { dim: 'weight', value: 500, label: '500g' },
    variants: [
      { title: 'Café Torrado e Moído Pilão Tradicional 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 19.90, amazon: 18.49, magalu: 20.50, goodbom: 19.49, arena: 17.99 } },
      { title: 'Café Torrado e Moído Melitta Tradicional 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 20.90, amazon: 19.29, magalu: 21.40, goodbom: 19.99, arena: 18.49 } },
      { title: 'Café Torrado e Moído 3 Corações Tradicional 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 19.50, amazon: 18.90, magalu: 19.99, goodbom: 18.99, arena: 17.79 } },
      { title: 'Café Torrado e Moído Pilão Tradicional 250g', measure: { dim: 'weight', value: 250, label: '250g' }, prices: { mercadolivre: 10.90, amazon: 9.99, magalu: 11.20, goodbom: 10.49, arena: 9.49 } },
      { title: 'Café Solúvel Nescafé Tradição Vidro 100g', measure: { dim: 'weight', value: 100, label: '100g' }, prices: { mercadolivre: 14.90, amazon: 13.79, magalu: 15.40, goodbom: 14.29, arena: 12.99 } },
    ],
  },
  {
    id: 'acucar',
    types: ['acucar'],
    defaultMeasure: { dim: 'weight', value: 1000, label: '1kg' },
    variants: [
      { title: 'Açúcar Refinado União Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 5.29, amazon: 4.89, magalu: 5.49, goodbom: 4.59, arena: 4.29 } },
      { title: 'Açúcar Refinado Da Barra Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 4.99, amazon: 4.59, magalu: 5.19, goodbom: 4.29, arena: 3.99 } },
      { title: 'Açúcar Cristal Caravelas Pacote 5kg', measure: { dim: 'weight', value: 5000, label: '5kg' }, prices: { mercadolivre: 19.90, amazon: 18.90, magalu: 20.49, goodbom: 17.49, arena: 16.49 } },
      { title: 'Açúcar Cristal União Pacote 5kg', measure: { dim: 'weight', value: 5000, label: '5kg' }, prices: { mercadolivre: 21.50, amazon: 19.90, magalu: 21.90, goodbom: 18.99, arena: 17.49 } },
      { title: 'Açúcar Demerara União 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 7.49, amazon: 6.89, magalu: 7.79, goodbom: 6.99, arena: 6.29 } },
    ],
  },
  {
    id: 'sal',
    types: ['sal'],
    defaultMeasure: { dim: 'weight', value: 1000, label: '1kg' },
    variants: [
      { title: 'Sal Refinado Cisne Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 3.29, amazon: 2.99, magalu: 3.49, goodbom: 2.79, arena: 2.49 } },
      { title: 'Sal Refinado Lebre Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 2.99, amazon: 2.69, magalu: 3.19, goodbom: 2.49, arena: 2.19 } },
      { title: 'Sal Grosso para Churrasco Cisne 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 3.49, amazon: 3.19, magalu: 3.69, goodbom: 2.99, arena: 2.59 } },
    ],
  },
  {
    id: 'oleo',
    types: ['oleo'],
    defaultMeasure: { dim: 'volume', value: 900, label: '900ml' },
    variants: [
      { title: 'Óleo de Soja Liza Pet 900ml', measure: { dim: 'volume', value: 900, label: '900ml' }, prices: { mercadolivre: 7.49, amazon: 6.99, magalu: 7.79, goodbom: 6.49, arena: 5.99 } },
      { title: 'Óleo de Soja Soya Pet 900ml', measure: { dim: 'volume', value: 900, label: '900ml' }, prices: { mercadolivre: 7.29, amazon: 6.89, magalu: 7.49, goodbom: 6.29, arena: 5.89 } },
      { title: 'Óleo de Girassol Liza Pet 900ml', measure: { dim: 'volume', value: 900, label: '900ml' }, prices: { mercadolivre: 11.90, amazon: 10.90, magalu: 12.40, goodbom: 10.99, arena: 9.99 } },
      { title: 'Óleo de Milho Liza Pet 900ml', measure: { dim: 'volume', value: 900, label: '900ml' }, prices: { mercadolivre: 12.50, amazon: 11.49, magalu: 12.90, goodbom: 11.49, arena: 10.49 } },
      { title: 'Óleo de Canola Liza Pet 900ml', measure: { dim: 'volume', value: 900, label: '900ml' }, prices: { mercadolivre: 12.90, amazon: 11.90, magalu: 13.20, goodbom: 11.79, arena: 10.79 } },
    ],
  },
  {
    id: 'azeite',
    types: ['azeite'],
    defaultMeasure: { dim: 'volume', value: 500, label: '500ml' },
    variants: [
      { title: 'Azeite de Oliva Extra Virgem Gallo Vidro 500ml', measure: { dim: 'volume', value: 500, label: '500ml' }, prices: { mercadolivre: 39.90, amazon: 36.90, magalu: 41.50, goodbom: 38.99, arena: 35.90 } },
      { title: 'Azeite de Oliva Extra Virgem Andorinha Vidro 500ml', measure: { dim: 'volume', value: 500, label: '500ml' }, prices: { mercadolivre: 38.50, amazon: 35.99, magalu: 39.90, goodbom: 37.49, arena: 34.90 } },
      { title: 'Azeite Extra Virgem Borges Vidro 500ml', measure: { dim: 'volume', value: 500, label: '500ml' }, prices: { mercadolivre: 40.90, amazon: 37.50, magalu: 41.90, goodbom: 39.49, arena: 36.49 } },
    ],
  },
  {
    id: 'vinagre',
    types: ['vinagre'],
    defaultMeasure: { dim: 'volume', value: 750, label: '750ml' },
    variants: [
      { title: 'Vinagre de Álcool Castelo 750ml', measure: { dim: 'volume', value: 750, label: '750ml' }, prices: { mercadolivre: 3.29, amazon: 2.99, magalu: 3.49, goodbom: 2.79, arena: 2.39 } },
      { title: 'Vinagre de Maçã Castelo 750ml', measure: { dim: 'volume', value: 750, label: '750ml' }, prices: { mercadolivre: 5.49, amazon: 4.99, magalu: 5.79, goodbom: 4.89, arena: 4.39 } },
    ],
  },
  {
    id: 'farinha',
    types: ['farinha', 'trigo'],
    defaultMeasure: { dim: 'weight', value: 1000, label: '1kg' },
    variants: [
      { title: 'Farinha de Trigo Tradicional Dona Benta Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 5.89, amazon: 5.29, magalu: 5.99, goodbom: 4.99, arena: 4.49 } },
      { title: 'Farinha de Trigo Tradicional Anaconda Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 5.49, amazon: 4.99, magalu: 5.69, goodbom: 4.69, arena: 4.19 } },
      { title: 'Farinha de Mandioca Torrada Yoki 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 5.99, amazon: 5.49, magalu: 6.19, goodbom: 5.29, arena: 4.79 } },
      { title: 'Farinha de Rosca Yoki 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 6.49, amazon: 5.99, magalu: 6.69, goodbom: 5.79, arena: 5.19 } },
    ],
  },
  {
    id: 'farofa',
    types: ['farofa'],
    defaultMeasure: { dim: 'weight', value: 400, label: '400g' },
    variants: [
      { title: 'Farofa de Mandioca Tradicional Yoki 400g', measure: { dim: 'weight', value: 400, label: '400g' }, prices: { mercadolivre: 6.99, amazon: 6.29, magalu: 7.19, goodbom: 6.19, arena: 5.59 } },
    ],
  },
  {
    id: 'fuba-flocao',
    types: ['fuba', 'flocao', 'polenta', 'amido', 'maizena'],
    defaultMeasure: { dim: 'weight', value: 500, label: '500g' },
    variants: [
      { title: 'Fubá Mimoso Yoki Pacote 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 3.99, amazon: 3.49, magalu: 4.19, goodbom: 3.29, arena: 2.89 } },
      { title: 'Flocão de Milho Coringa 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 3.49, amazon: 2.99, magalu: 3.69, goodbom: 2.79, arena: 2.39 } },
      { title: 'Amido de Milho Maizena Caixa 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 8.90, amazon: 7.99, magalu: 9.20, goodbom: 8.29, arena: 7.49 } },
    ],
  },
  {
    id: 'macarrao',
    types: ['macarrao', 'espaguete', 'parafuso', 'penne', 'massa', 'miojo', 'lamen'],
    defaultMeasure: { dim: 'weight', value: 500, label: '500g' },
    variants: [
      { title: 'Macarrão Espaguete Nº 8 Renata Sêmola 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 4.79, amazon: 4.29, magalu: 4.99, goodbom: 3.99, arena: 3.69 } },
      { title: 'Macarrão Parafuso Renata Sêmola 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 4.89, amazon: 4.39, magalu: 5.09, goodbom: 4.09, arena: 3.79 } },
      { title: 'Macarrão Penne Renata Sêmola 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 4.99, amazon: 4.49, magalu: 5.19, goodbom: 4.19, arena: 3.89 } },
      { title: 'Macarrão Espaguete Barilla Grano Duro 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 7.90, amazon: 6.99, magalu: 8.20, goodbom: 7.49, arena: 6.79 } },
      { title: 'Macarrão Instantâneo Nissin Lámen Galinha Caipira 85g', measure: { dim: 'weight', value: 85, label: '85g' }, prices: { mercadolivre: 2.99, amazon: 2.59, magalu: 3.09, goodbom: 2.49, arena: 2.19 } },
    ],
  },
  {
    id: 'molho-tomate',
    types: ['molho', 'extrato', 'passata', 'pomarola'],
    defaultMeasure: { dim: 'weight', value: 300, label: '300g' },
    variants: [
      { title: 'Molho de Tomate Tradicional Heinz Sachê 300g', measure: { dim: 'weight', value: 300, label: '300g' }, prices: { mercadolivre: 3.99, amazon: 3.49, magalu: 4.19, goodbom: 3.69, arena: 3.19 } },
      { title: 'Molho de Tomate Tradicional Pomarola Sachê 300g', measure: { dim: 'weight', value: 300, label: '300g' }, prices: { mercadolivre: 3.49, amazon: 3.19, magalu: 3.69, goodbom: 3.29, arena: 2.89 } },
      { title: 'Molho de Tomate Tradicional Fugini Sachê 300g', measure: { dim: 'weight', value: 300, label: '300g' }, prices: { mercadolivre: 2.49, amazon: 2.19, magalu: 2.59, goodbom: 2.09, arena: 1.79 } },
      { title: 'Extrato de Tomate Elefante Pote 310g', measure: { dim: 'weight', value: 310, label: '310g' }, prices: { mercadolivre: 6.49, amazon: 5.89, magalu: 6.79, goodbom: 5.99, arena: 5.39 } },
    ],
  },
  {
    id: 'maionese-ketchup-mostarda',
    types: ['maionese', 'ketchup', 'catchup', 'mostarda'],
    defaultMeasure: { dim: 'weight', value: 500, label: '500g' },
    variants: [
      { title: 'Maionese Hellmanns Tradicional Pote 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 9.90, amazon: 8.99, magalu: 10.20, goodbom: 9.29, arena: 8.39 } },
      { title: 'Ketchup Tradicional Heinz Squeeze 397g', measure: { dim: 'weight', value: 397, label: '397g' }, prices: { mercadolivre: 11.90, amazon: 10.49, magalu: 12.20, goodbom: 10.99, arena: 9.89 } },
      { title: 'Mostarda Amarela Hemmer 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 6.90, amazon: 6.29, magalu: 7.19, goodbom: 6.49, arena: 5.79 } },
    ],
  },
  {
    id: 'enlatados',
    types: ['atum', 'sardinha', 'milho', 'ervilha', 'azeitona', 'palmito', 'seleta'],
    defaultMeasure: { dim: 'weight', value: 170, label: '170g' },
    variants: [
      { title: 'Atum Sólido em Óleo Gomes da Costa Lata 170g', measure: { dim: 'weight', value: 170, label: '170g' }, prices: { mercadolivre: 9.90, amazon: 8.99, magalu: 10.20, goodbom: 9.29, arena: 8.39 } },
      { title: 'Sardinha com Óleo Gomes da Costa Lata 125g', measure: { dim: 'weight', value: 125, label: '125g' }, prices: { mercadolivre: 5.90, amazon: 5.29, magalu: 6.10, goodbom: 5.49, arena: 4.89 } },
      { title: 'Milho Verde em Conserva Quero Lata 170g', measure: { dim: 'weight', value: 170, label: '170g' }, prices: { mercadolivre: 4.19, amazon: 3.69, magalu: 4.39, goodbom: 3.79, arena: 3.29 } },
      { title: 'Ervilha em Conserva Quero Lata 170g', measure: { dim: 'weight', value: 170, label: '170g' }, prices: { mercadolivre: 4.19, amazon: 3.69, magalu: 4.39, goodbom: 3.79, arena: 3.29 } },
      { title: 'Azeitona Verde Sem Caroço Vale Fértil Sachê 120g', measure: { dim: 'weight', value: 120, label: '120g' }, prices: { mercadolivre: 6.49, amazon: 5.89, magalu: 6.69, goodbom: 5.99, arena: 5.29 } },
    ],
  },
  {
    id: 'pipoca',
    types: ['pipoca'],
    defaultMeasure: { dim: 'weight', value: 500, label: '500g' },
    variants: [
      { title: 'Milho para Pipoca Premium Yoki Pacote 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 6.29, amazon: 5.69, magalu: 6.49, goodbom: 5.49, arena: 4.89 } },
      { title: 'Pipoca de Micro-ondas Manteiga Yoki 100g', measure: { dim: 'weight', value: 100, label: '100g' }, prices: { mercadolivre: 4.49, amazon: 3.99, magalu: 4.69, goodbom: 3.89, arena: 3.39 } },
    ],
  },

  // --- LATICÍNIOS, MATINAIS E PADARIA ---
  {
    id: 'leite-uht',
    types: ['leite'],
    defaultMeasure: { dim: 'volume', value: 1000, label: '1L' },
    variants: [
      { title: 'Leite UHT Integral Italac 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 5.49, amazon: 5.19, magalu: 5.69, goodbom: 4.89, arena: 4.59 } },
      { title: 'Leite UHT Integral Piracanjuba 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 5.59, amazon: 5.29, magalu: 5.79, goodbom: 4.99, arena: 4.69 } },
      { title: 'Leite UHT Integral Parmalat 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 5.89, amazon: 5.49, magalu: 5.99, goodbom: 5.29, arena: 4.89 } },
      { title: 'Leite UHT Desnatado Italac 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 5.59, amazon: 5.29, magalu: 5.79, goodbom: 4.99, arena: 4.69 } },
      { title: 'Leite UHT Semidesnatado Piracanjuba 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 5.59, amazon: 5.29, magalu: 5.79, goodbom: 4.99, arena: 4.69 } },
      { title: 'Leite em Pó Integral Ninho Instantâneo Lata 380g', measure: { dim: 'weight', value: 380, label: '380g' }, prices: { mercadolivre: 18.90, amazon: 17.49, magalu: 19.50, goodbom: 17.99, arena: 16.49 } },
      { title: 'Leite em Pó Integral Italac Pacote 400g', measure: { dim: 'weight', value: 400, label: '400g' }, prices: { mercadolivre: 14.90, amazon: 13.90, magalu: 15.20, goodbom: 13.79, arena: 12.69 } },
      { title: 'Leite Condensado Moça Nestlé Caixa 395g', measure: { dim: 'weight', value: 395, label: '395g' }, prices: { mercadolivre: 7.99, amazon: 7.29, magalu: 8.29, goodbom: 7.19, arena: 6.49 } },
      { title: 'Leite Condensado Semidesnatado Italac Caixa 395g', measure: { dim: 'weight', value: 395, label: '395g' }, prices: { mercadolivre: 5.79, amazon: 5.19, magalu: 5.99, goodbom: 4.99, arena: 4.49 } },
      { title: 'Leite de Coco Sococo Vidro 200ml', measure: { dim: 'volume', value: 200, label: '200ml' }, prices: { mercadolivre: 5.49, amazon: 4.99, magalu: 5.69, goodbom: 4.79, arena: 4.29 } },
      { title: 'Doce de Leite Viçosa Pote 400g', measure: { dim: 'weight', value: 400, label: '400g' }, prices: { mercadolivre: 16.90, amazon: 15.49, magalu: 17.20, goodbom: 15.29, arena: 13.99 } },
    ],
  },
  {
    id: 'creme-de-leite',
    types: ['creme'],
    defaultMeasure: { dim: 'weight', value: 200, label: '200g' },
    variants: [
      { title: 'Creme de Leite Italac Caixa 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 3.69, amazon: 3.29, magalu: 3.89, goodbom: 3.19, arena: 2.79 } },
      { title: 'Creme de Leite Nestlé Caixa 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 4.49, amazon: 3.99, magalu: 4.69, goodbom: 3.99, arena: 3.49 } },
    ],
  },
  {
    id: 'manteiga',
    types: ['manteiga'],
    defaultMeasure: { dim: 'weight', value: 200, label: '200g' },
    variants: [
      { title: 'Manteiga de Primeira Qualidade Com Sal Aviação Pote 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 14.90, amazon: 13.90, magalu: 15.20, goodbom: 12.99, arena: 11.89 } },
      { title: 'Manteiga Extra Com Sal Président Tablete 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 13.90, amazon: 12.99, magalu: 14.40, goodbom: 12.49, arena: 11.49 } },
      { title: 'Manteiga Com Sal Italac Pote 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 12.50, amazon: 11.79, magalu: 12.90, goodbom: 11.29, arena: 10.29 } },
    ],
  },
  {
    id: 'margarina',
    types: ['margarina', 'qualy', 'doriana', 'delicia'],
    defaultMeasure: { dim: 'weight', value: 500, label: '500g' },
    variants: [
      { title: 'Margarina Cremosa Com Sal Qualy Pote 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 8.49, amazon: 7.89, magalu: 8.79, goodbom: 7.49, arena: 6.79 } },
      { title: 'Margarina Com Sal Doriana Pote 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 7.79, amazon: 7.19, magalu: 7.99, goodbom: 6.89, arena: 6.19 } },
    ],
  },
  {
    id: 'requeijao',
    types: ['requeijao', 'catupiry'],
    defaultMeasure: { dim: 'weight', value: 200, label: '200g' },
    variants: [
      { title: 'Requeijão Cremoso Tradicional Vigor Copo 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 8.99, amazon: 8.29, magalu: 9.29, goodbom: 7.99, arena: 7.29 } },
      { title: 'Requeijão Cremoso Poços de Caldas Copo 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 7.99, amazon: 7.49, magalu: 8.29, goodbom: 7.19, arena: 6.59 } },
    ],
  },
  {
    id: 'iogurte',
    types: ['iogurte', 'danone', 'activia', 'yakult'],
    defaultMeasure: { dim: 'weight', value: 170, label: '170g' },
    variants: [
      { title: 'Iogurte Natural Integral Nestlé Copo 170g', measure: { dim: 'weight', value: 170, label: '170g' }, prices: { mercadolivre: 4.19, amazon: 3.79, magalu: 4.29, goodbom: 3.59, arena: 3.19 } },
      { title: 'Iogurte Polpa de Morango Danone Bandeja 510g', measure: { dim: 'weight', value: 510, label: '510g' }, prices: { mercadolivre: 8.99, amazon: 8.29, magalu: 9.19, goodbom: 7.99, arena: 7.19 } },
    ],
  },
  {
    id: 'queijo-presunto',
    types: ['queijo', 'mucarela', 'prato', 'parmesao', 'minas', 'presunto', 'mortadela'],
    defaultMeasure: { dim: 'weight', value: 200, label: '200g' },
    variants: [
      { title: 'Queijo Mussarela Fatiado Président Bandeja 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 11.90, amazon: 10.90, magalu: 12.20, goodbom: 10.49, arena: 9.49 } },
      { title: 'Queijo Parmesão Ralado Vigor Pacote 50g', measure: { dim: 'weight', value: 50, label: '50g' }, prices: { mercadolivre: 6.29, amazon: 5.69, magalu: 6.49, goodbom: 5.49, arena: 4.89 } },
      { title: 'Presunto Cozido Fatiado Sadia Bandeja 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 8.49, amazon: 7.89, magalu: 8.79, goodbom: 7.49, arena: 6.79 } },
      { title: 'Mortadela Defumada Fatiada Ouro Perdigão 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 6.99, amazon: 6.49, magalu: 7.29, goodbom: 6.19, arena: 5.49 } },
    ],
  },
  {
    id: 'pao',
    types: ['pao', 'bisnaguinha', 'torrada'],
    defaultMeasure: { dim: 'weight', value: 480, label: '480g' },
    variants: [
      { title: 'Pão de Forma Tradicional Pullman Pacote 480g', measure: { dim: 'weight', value: 480, label: '480g' }, prices: { mercadolivre: 8.99, amazon: 8.29, magalu: 9.29, goodbom: 7.99, arena: 7.19 } },
      { title: 'Pão de Forma Tradicional Bauducco Pacote 400g', measure: { dim: 'weight', value: 400, label: '400g' }, prices: { mercadolivre: 7.99, amazon: 7.39, magalu: 8.19, goodbom: 7.19, arena: 6.49 } },
      { title: 'Pão de Forma Integral Pullman Pacote 450g', measure: { dim: 'weight', value: 450, label: '450g' }, prices: { mercadolivre: 9.99, amazon: 9.19, magalu: 10.29, goodbom: 8.99, arena: 8.19 } },
      { title: 'Pão de Queijo Congelado Forno de Minas Pacote 400g', measure: { dim: 'weight', value: 400, label: '400g' }, prices: { mercadolivre: 14.90, amazon: 13.79, magalu: 15.20, goodbom: 13.49, arena: 12.29 } },
      { title: 'Torrada Tradicional Bauducco Pacote 142g', measure: { dim: 'weight', value: 142, label: '142g' }, prices: { mercadolivre: 5.29, amazon: 4.79, magalu: 5.49, goodbom: 4.59, arena: 4.09 } },
    ],
  },
  {
    id: 'biscoito',
    types: ['biscoito', 'bolacha', 'oreo', 'wafer', 'cookies'],
    defaultMeasure: { dim: 'weight', value: 170, label: '170g' },
    variants: [
      { title: 'Biscoito Recheado Oreo Original 90g', measure: { dim: 'weight', value: 90, label: '90g' }, prices: { mercadolivre: 4.49, amazon: 3.99, magalu: 4.59, goodbom: 4.19, arena: 3.69 } },
      { title: 'Biscoito Maisena Bauducco Pacote 170g', measure: { dim: 'weight', value: 170, label: '170g' }, prices: { mercadolivre: 4.29, amazon: 3.89, magalu: 4.49, goodbom: 3.99, arena: 3.49 } },
      { title: 'Biscoito Cream Cracker Bauducco 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 4.59, amazon: 4.09, magalu: 4.79, goodbom: 4.19, arena: 3.69 } },
      { title: 'Biscoito Wafer Chocolate Bauducco 140g', measure: { dim: 'weight', value: 140, label: '140g' }, prices: { mercadolivre: 3.99, amazon: 3.49, magalu: 4.19, goodbom: 3.59, arena: 3.09 } },
    ],
  },
  {
    id: 'achocolatado-aveia',
    types: ['achocolatado', 'nescau', 'toddy', 'aveia', 'granola', 'cereal'],
    defaultMeasure: { dim: 'weight', value: 370, label: '370g' },
    variants: [
      { title: 'Achocolatado em Pó Nescau Lata 370g', measure: { dim: 'weight', value: 370, label: '370g' }, prices: { mercadolivre: 9.49, amazon: 8.69, magalu: 9.79, goodbom: 8.49, arena: 7.79 } },
      { title: 'Achocolatado em Pó Toddy Original Pote 400g', measure: { dim: 'weight', value: 400, label: '400g' }, prices: { mercadolivre: 9.29, amazon: 8.49, magalu: 9.59, goodbom: 8.29, arena: 7.59 } },
      { title: 'Aveia em Flocos Finos Quaker Caixa 165g', measure: { dim: 'weight', value: 165, label: '165g' }, prices: { mercadolivre: 4.99, amazon: 4.49, magalu: 5.19, goodbom: 4.39, arena: 3.89 } },
    ],
  },
  {
    id: 'chocolate-doces',
    types: ['chocolate', 'bombom', 'nutella', 'goiabada', 'doce', 'gelatina'],
    defaultMeasure: { dim: 'weight', value: 80, label: '80g' },
    variants: [
      { title: 'Chocolate ao Leite Lacta Barra 80g', measure: { dim: 'weight', value: 80, label: '80g' }, prices: { mercadolivre: 6.49, amazon: 5.89, magalu: 6.69, goodbom: 5.79, arena: 5.19 } },
      { title: 'Caixa de Bombom Especialidades Nestlé 251g', measure: { dim: 'weight', value: 251, label: '251g' }, prices: { mercadolivre: 14.90, amazon: 13.49, magalu: 15.20, goodbom: 13.49, arena: 12.19 } },
      { title: 'Creme de Avelã Nutella Pote 140g', measure: { dim: 'weight', value: 140, label: '140g' }, prices: { mercadolivre: 13.90, amazon: 12.49, magalu: 14.20, goodbom: 12.99, arena: 11.79 } },
    ],
  },
  {
    id: 'ovos',
    types: ['ovo', 'ovos'],
    defaultMeasure: { dim: 'count', value: 20, label: '20 ovos' },
    variants: [
      { title: 'Ovos Brancos Grandes Mantiqueira Cartela 20 unidades', measure: { dim: 'count', value: 20, label: '20 ovos' }, prices: { mercadolivre: 18.90, amazon: 17.90, magalu: 19.40, goodbom: 15.99, arena: 14.49 } },
      { title: 'Ovos Brancos Grandes Cartela 30 unidades', measure: { dim: 'count', value: 30, label: '30 ovos' }, prices: { mercadolivre: 25.90, amazon: 24.50, magalu: 26.90, goodbom: 21.99, arena: 19.90 } },
      { title: 'Ovos Brancos Grandes Bandeja 12 unidades (1 dúzia)', measure: { dim: 'count', value: 12, label: '12 ovos' }, prices: { mercadolivre: 11.90, amazon: 11.20, magalu: 12.40, goodbom: 9.99, arena: 8.99 } },
    ],
  },

  // --- CARNES, AVES, PEIXES E CONGELADOS ---
  {
    id: 'frango',
    types: ['frango', 'peito', 'coxa', 'sobrecoxa'],
    defaultMeasure: { dim: 'weight', value: 1000, label: '1kg' },
    variants: [
      { title: 'Filé de Peito de Frango Congelado Sadia Bandeja 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 23.90, amazon: 22.50, magalu: 24.40, goodbom: 19.99, arena: 18.49 } },
      { title: 'Filé de Peito de Frango Congelado Seara Bandeja 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 22.90, amazon: 21.90, magalu: 23.50, goodbom: 18.99, arena: 17.79 } },
      { title: 'Coxa e Sobrecoxa de Frango Sadia Pacote 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 16.90, amazon: 15.90, magalu: 17.40, goodbom: 13.99, arena: 12.79 } },
    ],
  },
  {
    id: 'carne-bovina',
    types: ['carne', 'patinho', 'acem', 'alcatra', 'picanha', 'contrafile', 'costela', 'musculo', 'fraldinha', 'maminha', 'coxao'],
    defaultMeasure: { dim: 'weight', value: 1000, label: '1kg' },
    variants: [
      { title: 'Carne Moída de Patinho Bovino Resfriada Bandeja 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 22.90, amazon: 21.90, magalu: 23.50, goodbom: 19.99, arena: 18.49 } },
      { title: 'Carne Bovina Acém em Cubos/Moído 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 36.90, amazon: 35.50, magalu: 37.90, goodbom: 31.99, arena: 29.90 } },
      { title: 'Carne Bovina Patinho em Bifes 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 44.90, amazon: 42.90, magalu: 45.90, goodbom: 39.99, arena: 37.90 } },
      { title: 'Carne Bovina Alcatra em Bifes 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 52.90, amazon: 49.90, magalu: 53.90, goodbom: 46.99, arena: 43.90 } },
      { title: 'Picanha Bovina Maturada Peça 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 69.90, amazon: 66.90, magalu: 71.90, goodbom: 62.99, arena: 58.90 } },
    ],
  },
  {
    id: 'linguica-salsicha-bacon',
    types: ['linguica', 'calabresa', 'toscana', 'salsicha', 'bacon', 'hamburguer', 'lasanha', 'nuggets'],
    defaultMeasure: { dim: 'weight', value: 500, label: '500g' },
    variants: [
      { title: 'Linguiça Toscana para Churrasco Seara Pacote 700g', measure: { dim: 'weight', value: 700, label: '700g' }, prices: { mercadolivre: 18.90, amazon: 17.90, magalu: 19.50, goodbom: 16.49, arena: 15.29 } },
      { title: 'Linguiça Calabresa Defumada Perdigão 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 16.90, amazon: 15.90, magalu: 17.40, goodbom: 14.99, arena: 13.79 } },
      { title: 'Salsicha Hot Dog Perdigão Pacote 500g', measure: { dim: 'weight', value: 500, label: '500g' }, prices: { mercadolivre: 9.90, amazon: 9.20, magalu: 10.40, goodbom: 8.49, arena: 7.69 } },
      { title: 'Bacon em Cubos/Fatiado Seara 250g', measure: { dim: 'weight', value: 250, label: '250g' }, prices: { mercadolivre: 13.90, amazon: 12.90, magalu: 14.40, goodbom: 11.99, arena: 10.99 } },
      { title: 'Lasanha Bolonhesa Congelada Sadia 600g', measure: { dim: 'weight', value: 600, label: '600g' }, prices: { mercadolivre: 16.90, amazon: 15.49, magalu: 17.20, goodbom: 14.99, arena: 13.79 } },
    ],
  },
  {
    id: 'peixe',
    types: ['peixe', 'tilapia', 'merluza', 'salmao', 'bacalhau'],
    defaultMeasure: { dim: 'weight', value: 800, label: '800g' },
    variants: [
      { title: 'Filé de Tilápia Congelado Copacol Pacote 800g', measure: { dim: 'weight', value: 800, label: '800g' }, prices: { mercadolivre: 39.90, amazon: 37.90, magalu: 41.00, goodbom: 35.99, arena: 33.90 } },
    ],
  },

  // --- HORTIFRUTI ---
  {
    id: 'hortifruti',
    types: ['banana', 'maca', 'laranja', 'limao', 'mamao', 'melancia', 'uva', 'abacaxi', 'morango', 'abacate', 'manga', 'tomate', 'batata', 'cebola', 'alho', 'cenoura', 'alface', 'brocolis', 'repolho', 'abobrinha', 'chuchu', 'pimentao', 'pepino', 'beterraba', 'mandioca'],
    defaultMeasure: { dim: 'weight', value: 1000, label: '1kg' },
    variants: [
      { title: 'Banana Nanica Fresca Selecionada 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 6.90, amazon: 6.49, magalu: 7.20, goodbom: 5.49, arena: 4.99 } },
      { title: 'Maçã Gala Nacional Selecionada 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 11.90, amazon: 10.90, magalu: 12.40, goodbom: 9.99, arena: 8.99 } },
      { title: 'Laranja Pêra Fresca 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 5.90, amazon: 5.49, magalu: 6.20, goodbom: 4.69, arena: 4.19 } },
      { title: 'Limão Tahiti Fresco 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 6.49, amazon: 5.99, magalu: 6.80, goodbom: 4.99, arena: 4.49 } },
      { title: 'Tomate Italiano Selecionado 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 8.90, amazon: 8.20, magalu: 9.20, goodbom: 6.99, arena: 6.29 } },
      { title: 'Batata Inglesa Lavada 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 7.49, amazon: 6.99, magalu: 7.80, goodbom: 5.99, arena: 5.29 } },
      { title: 'Cebola Nacional Selecionada 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 6.90, amazon: 6.49, magalu: 7.20, goodbom: 5.49, arena: 4.89 } },
      { title: 'Alho Roxo Selecionado Rede 200g', measure: { dim: 'weight', value: 200, label: '200g' }, prices: { mercadolivre: 7.90, amazon: 7.29, magalu: 8.20, goodbom: 6.49, arena: 5.89 } },
      { title: 'Cenoura Selecionada 1kg', measure: { dim: 'weight', value: 1000, label: '1kg' }, prices: { mercadolivre: 6.90, amazon: 6.40, magalu: 7.10, goodbom: 5.29, arena: 4.79 } },
    ],
  },

  // --- BEBIDAS ---
  {
    id: 'refrigerante',
    types: ['refrigerante', 'coca', 'guarana', 'fanta', 'sprite', 'pepsi', 'soda'],
    defaultMeasure: { dim: 'volume', value: 2000, label: '2L' },
    variants: [
      { title: 'Refrigerante Coca-Cola Original Garrafa 2L', measure: { dim: 'volume', value: 2000, label: '2L' }, prices: { mercadolivre: 11.90, amazon: 10.99, magalu: 11.50, goodbom: 9.99, arena: 9.29 } },
      { title: 'Refrigerante Coca-Cola Sem Açúcar Garrafa 2L', measure: { dim: 'volume', value: 2000, label: '2L' }, prices: { mercadolivre: 11.90, amazon: 10.99, magalu: 11.50, goodbom: 9.99, arena: 9.29 } },
      { title: 'Refrigerante Coca-Cola Original Lata 350ml', measure: { dim: 'volume', value: 350, label: '350ml' }, prices: { mercadolivre: 4.29, amazon: 3.79, magalu: 4.39, goodbom: 3.59, arena: 3.19 } },
      { title: 'Refrigerante Guaraná Antarctica Garrafa 2L', measure: { dim: 'volume', value: 2000, label: '2L' }, prices: { mercadolivre: 9.90, amazon: 8.99, magalu: 9.50, goodbom: 8.49, arena: 7.79 } },
      { title: 'Refrigerante Guaraná Antarctica Lata 350ml', measure: { dim: 'volume', value: 350, label: '350ml' }, prices: { mercadolivre: 3.79, amazon: 3.39, magalu: 3.89, goodbom: 3.19, arena: 2.89 } },
      { title: 'Refrigerante Fanta Laranja Garrafa 2L', measure: { dim: 'volume', value: 2000, label: '2L' }, prices: { mercadolivre: 9.90, amazon: 8.99, magalu: 9.60, goodbom: 8.49, arena: 7.89 } },
      { title: 'Refrigerante Sprite Limão Garrafa 2L', measure: { dim: 'volume', value: 2000, label: '2L' }, prices: { mercadolivre: 9.90, amazon: 8.99, magalu: 9.60, goodbom: 8.49, arena: 7.89 } },
    ],
  },
  {
    id: 'suco',
    types: ['suco', 'nectar', 'del valle', 'tang'],
    defaultMeasure: { dim: 'volume', value: 1000, label: '1L' },
    variants: [
      { title: 'Suco de Uva Integral Aurora Garrafa 1,5L', measure: { dim: 'volume', value: 1500, label: '1,5L' }, prices: { mercadolivre: 16.90, amazon: 15.49, magalu: 17.20, goodbom: 14.99, arena: 13.79 } },
      { title: 'Suco de Uva Integral Del Valle Caixa 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 8.90, amazon: 7.99, magalu: 9.20, goodbom: 7.89, arena: 7.19 } },
      { title: 'Suco de Laranja Integral Prat\'s Garrafa 900ml', measure: { dim: 'volume', value: 900, label: '900ml' }, prices: { mercadolivre: 12.90, amazon: 11.90, magalu: 13.20, goodbom: 11.49, arena: 10.49 } },
      { title: 'Néctar de Maracujá Del Valle Caixa 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 6.99, amazon: 6.29, magalu: 7.19, goodbom: 5.99, arena: 5.39 } },
    ],
  },
  {
    id: 'agua-mineral',
    types: ['agua'],
    defaultMeasure: { dim: 'volume', value: 1500, label: '1,5L' },
    variants: [
      { title: 'Água Mineral Sem Gás Crystal Garrafa 1,5L', measure: { dim: 'volume', value: 1500, label: '1,5L' }, prices: { mercadolivre: 3.49, amazon: 2.99, magalu: 3.59, goodbom: 2.69, arena: 2.29 } },
      { title: 'Água Mineral Sem Gás Crystal Garrafa 500ml', measure: { dim: 'volume', value: 500, label: '500ml' }, prices: { mercadolivre: 2.29, amazon: 1.99, magalu: 2.39, goodbom: 1.79, arena: 1.49 } },
      { title: 'Água de Coco Integral Kero Coco Caixa 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 10.90, amazon: 9.89, magalu: 11.20, goodbom: 9.49, arena: 8.69 } },
    ],
  },
  {
    id: 'cerveja',
    types: ['cerveja', 'heineken', 'brahma', 'skol', 'antarctica', 'spaten', 'budweiser', 'stella', 'amstel', 'corona'],
    defaultMeasure: { dim: 'volume', value: 350, label: '350ml' },
    variants: [
      { title: 'Cerveja Heineken Puro Malte Lata 350ml', measure: { dim: 'volume', value: 350, label: '350ml' }, prices: { mercadolivre: 5.49, amazon: 4.99, magalu: 5.59, goodbom: 4.79, arena: 4.39 } },
      { title: 'Cerveja Brahma Duplo Malte Lata 350ml', measure: { dim: 'volume', value: 350, label: '350ml' }, prices: { mercadolivre: 4.19, amazon: 3.79, magalu: 4.29, goodbom: 3.59, arena: 3.29 } },
      { title: 'Cerveja Spaten Puro Malte Lata 350ml', measure: { dim: 'volume', value: 350, label: '350ml' }, prices: { mercadolivre: 4.69, amazon: 4.29, magalu: 4.79, goodbom: 4.09, arena: 3.69 } },
      { title: 'Cerveja Skol Pilsen Lata 350ml', measure: { dim: 'volume', value: 350, label: '350ml' }, prices: { mercadolivre: 3.69, amazon: 3.29, magalu: 3.79, goodbom: 3.19, arena: 2.89 } },
    ],
  },

  // --- LIMPEZA ---
  {
    id: 'lava-roupas-sabao',
    types: ['sabao', 'lava', 'omo', 'tixan', 'brilhante', 'ariel'],
    defaultMeasure: { dim: 'volume', value: 3000, label: '3L' },
    variants: [
      { title: 'Lava Roupas Líquido Omo Lavagem Perfeita 3L', measure: { dim: 'volume', value: 3000, label: '3L' }, prices: { mercadolivre: 34.90, amazon: 31.90, magalu: 33.90, goodbom: 36.99, arena: 32.90 } },
      { title: 'Sabão Líquido Lava Roupas Omo Lavagem Perfeita 3L', measure: { dim: 'volume', value: 3000, label: '3L' }, prices: { mercadolivre: 34.90, amazon: 31.90, magalu: 33.90, goodbom: 36.99, arena: 32.90 } },
      { title: 'Sabão em Pó Omo Lavagem Perfeita Caixa 1,6kg', measure: { dim: 'weight', value: 1600, label: '1,6kg' }, prices: { mercadolivre: 23.90, amazon: 21.90, magalu: 24.40, goodbom: 22.99, arena: 20.49 } },
      { title: 'Sabão em Pó Tixan Ypê Caixa 1,6kg', measure: { dim: 'weight', value: 1600, label: '1,6kg' }, prices: { mercadolivre: 17.90, amazon: 16.49, magalu: 18.20, goodbom: 16.99, arena: 14.99 } },
      { title: 'Sabão em Barra Neutro Ypê Pacote 5 unidades (900g)', measure: { dim: 'weight', value: 900, label: '900g' }, prices: { mercadolivre: 12.90, amazon: 11.79, magalu: 13.20, goodbom: 11.49, arena: 10.29 } },
    ],
  },
  {
    id: 'amaciante',
    types: ['amaciante', 'downy', 'confort', 'comfort', 'fofo'],
    defaultMeasure: { dim: 'volume', value: 1500, label: '1,5L' },
    variants: [
      { title: 'Amaciante Concentrado Downy Brisa de Verão 1,5L', measure: { dim: 'volume', value: 1500, label: '1,5L' }, prices: { mercadolivre: 24.90, amazon: 22.90, magalu: 25.40, goodbom: 23.99, arena: 21.49 } },
      { title: 'Amaciante de Roupas Tradicional Ypê 2L', measure: { dim: 'volume', value: 2000, label: '2L' }, prices: { mercadolivre: 9.90, amazon: 8.99, magalu: 10.20, goodbom: 8.79, arena: 7.89 } },
    ],
  },
  {
    id: 'detergente',
    types: ['detergente', 'limpol'],
    defaultMeasure: { dim: 'volume', value: 500, label: '500ml' },
    variants: [
      { title: 'Detergente Líquido Ypê Neutro 500ml', measure: { dim: 'volume', value: 500, label: '500ml' }, prices: { mercadolivre: 2.79, amazon: 2.49, magalu: 2.89, goodbom: 2.39, arena: 2.09 } },
      { title: 'Detergente Líquido Limpol Cristal 500ml', measure: { dim: 'volume', value: 500, label: '500ml' }, prices: { mercadolivre: 2.69, amazon: 2.45, magalu: 2.79, goodbom: 2.29, arena: 1.99 } },
    ],
  },
  {
    id: 'agua-sanitaria-desinfetante',
    types: ['sanitaria', 'desinfetante', 'veja', 'pinho', 'lysoform'],
    defaultMeasure: { dim: 'volume', value: 2000, label: '2L' },
    variants: [
      { title: 'Água Sanitária Ypê Garrafa 2L', measure: { dim: 'volume', value: 2000, label: '2L' }, prices: { mercadolivre: 6.90, amazon: 6.29, magalu: 7.10, goodbom: 5.99, arena: 5.29 } },
      { title: 'Desinfetante Pinho Sol Original 1L', measure: { dim: 'volume', value: 1000, label: '1L' }, prices: { mercadolivre: 10.90, amazon: 9.89, magalu: 11.20, goodbom: 9.79, arena: 8.79 } },
      { title: 'Limpador Multiuso Veja Original 500ml', measure: { dim: 'volume', value: 500, label: '500ml' }, prices: { mercadolivre: 6.49, amazon: 5.79, magalu: 6.69, goodbom: 5.69, arena: 4.99 } },
    ],
  },
  {
    id: 'esponja-saco-lixo',
    types: ['esponja', 'bombril', 'assolan', 'saco'],
    defaultMeasure: { dim: 'count', value: 4, label: '4 un' },
    variants: [
      { title: 'Esponja de Limpeza Dupla Face Scotch-Brite Pacote 4 unidades', measure: { dim: 'count', value: 4, label: '4 un' }, prices: { mercadolivre: 6.90, amazon: 6.19, magalu: 7.19, goodbom: 5.99, arena: 5.29 } },
      { title: 'Lã de Aço Bombril Pacote 8 unidades (60g)', measure: { dim: 'count', value: 8, label: '8 un' }, prices: { mercadolivre: 3.29, amazon: 2.89, magalu: 3.49, goodbom: 2.79, arena: 2.39 } },
      { title: 'Saco para Lixo Dover Roll 50L Rolo 30 unidades', measure: { dim: 'count', value: 30, label: '30 un' }, prices: { mercadolivre: 14.90, amazon: 13.49, magalu: 15.20, goodbom: 13.29, arena: 11.99 } },
    ],
  },

  // --- HIGIENE & DESCARTÁVEIS ---
  {
    id: 'papel-higienico',
    types: ['papel', 'higienico', 'neve', 'personal'],
    defaultMeasure: { dim: 'count', value: 12, label: '12 rolos' },
    variants: [
      { title: 'Papel Higiênico Folha Dupla Neve Toque da Seda 12 rolos', measure: { dim: 'count', value: 12, label: '12 rolos' }, prices: { mercadolivre: 21.90, amazon: 19.90, magalu: 20.90, goodbom: 22.99, arena: 18.90 } },
      { title: 'Papel Higiênico Folha Dupla Personal Vip 12 rolos', measure: { dim: 'count', value: 12, label: '12 rolos' }, prices: { mercadolivre: 17.90, amazon: 16.49, magalu: 17.50, goodbom: 18.49, arena: 15.79 } },
      { title: 'Papel Higiênico Folha Dupla Neve 24 rolos', measure: { dim: 'count', value: 24, label: '24 rolos' }, prices: { mercadolivre: 39.90, amazon: 36.90, magalu: 38.50, goodbom: 41.99, arena: 34.90 } },
      { title: 'Papel Higiênico Folha Dupla Personal 4 rolos', measure: { dim: 'count', value: 4, label: '4 rolos' }, prices: { mercadolivre: 6.90, amazon: 6.29, magalu: 7.10, goodbom: 6.49, arena: 5.59 } },
    ],
  },
  {
    id: 'papel-toalha-guardanapo',
    types: ['toalha', 'guardanapo', 'aluminio', 'filme'],
    defaultMeasure: { dim: 'count', value: 2, label: '2 rolos' },
    variants: [
      { title: 'Papel Toalha Snob Folha Dupla Pacote 2 rolos (120 folhas)', measure: { dim: 'count', value: 2, label: '2 rolos' }, prices: { mercadolivre: 6.90, amazon: 6.19, magalu: 7.10, goodbom: 5.99, arena: 5.29 } },
      { title: 'Guardanapo de Papel Folha Simples Snob Pacote 50 unidades', measure: { dim: 'count', value: 50, label: '50 un' }, prices: { mercadolivre: 3.49, amazon: 2.99, magalu: 3.59, goodbom: 2.89, arena: 2.49 } },
      { title: 'Papel Alumínio Wyda Rolo 30cm x 7,5m', measure: { dim: 'count', value: 1, label: '1 un' }, prices: { mercadolivre: 6.49, amazon: 5.89, magalu: 6.69, goodbom: 5.79, arena: 5.19 } },
    ],
  },
  {
    id: 'higiene-pessoal',
    types: ['sabonete', 'shampoo', 'condicionador', 'dental', 'pasta', 'colgate', 'sorriso', 'desodorante', 'rexona', 'dove', 'lux', 'fralda', 'absorvente'],
    defaultMeasure: { dim: 'weight', value: 90, label: '90g' },
    variants: [
      { title: 'Sabonete em Barra Dove Original 90g', measure: { dim: 'weight', value: 90, label: '90g' }, prices: { mercadolivre: 4.49, amazon: 3.99, magalu: 4.59, goodbom: 4.19, arena: 3.69 } },
      { title: 'Sabonete em Barra Lux Botânicos 85g', measure: { dim: 'weight', value: 85, label: '85g' }, prices: { mercadolivre: 2.99, amazon: 2.59, magalu: 3.09, goodbom: 2.69, arena: 2.29 } },
      { title: 'Creme Dental Colgate Total 12 Clean Mint 90g', measure: { dim: 'weight', value: 90, label: '90g' }, prices: { mercadolivre: 7.90, amazon: 6.99, magalu: 8.20, goodbom: 7.29, arena: 6.39 } },
      { title: 'Creme Dental Sorriso Dentes Brancos 90g', measure: { dim: 'weight', value: 90, label: '90g' }, prices: { mercadolivre: 4.49, amazon: 3.99, magalu: 4.69, goodbom: 3.89, arena: 3.39 } },
      { title: 'Shampoo Pantene Restauração Frasco 400ml', measure: { dim: 'volume', value: 400, label: '400ml' }, prices: { mercadolivre: 21.90, amazon: 19.90, magalu: 22.50, goodbom: 20.99, arena: 18.90 } },
      { title: 'Desodorante Aerosol Rexona Antibacteriano 150ml', measure: { dim: 'volume', value: 150, label: '150ml' }, prices: { mercadolivre: 14.90, amazon: 13.49, magalu: 15.20, goodbom: 13.99, arena: 12.49 } },
    ],
  },
];

function hashNum(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

const STORE_FACTOR = {
  arena: 0.91,
  goodbom: 0.96,
  amazon: 0.98,
  mercadolivre: 1.03,
  magalu: 1.05,
};

function getStorePrice(pricesMap, storeId, seedTitle) {
  if (pricesMap[storeId] != null) return pricesMap[storeId];
  const vals = Object.values(pricesMap);
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const jitter = ((hashNum(storeId + seedTitle) % 15) - 7) / 100;
  return Number((avg * (1 + jitter)).toFixed(2));
}

function adaptVariantToQueryMeasure(variant, qMeasures) {
  if (!qMeasures.length || !variant.measure) return variant;
  const qm = qMeasures.find((m) => m.dim === variant.measure.dim);
  if (!qm) return variant;

  const ratio = qm.value / variant.measure.value;
  if (ratio >= 0.85 && ratio <= 1.15) return variant;

  const scaleFactor = ratio < 1 ? 0.22 + 0.78 * ratio : Math.pow(ratio, 0.92);
  const scaledPrices = {};
  for (const [k, v] of Object.entries(variant.prices)) {
    scaledPrices[k] = Number(Math.max(0.99, v * scaleFactor).toFixed(2));
  }

  const newTitle = variant.title.replace(
    /\b\d+(?:[.,]\d+)?\s*(?:kg|g|gr|mg|l|lt|litros?|ml|rolos?|ovos?|unidades?|un)\b/i,
    qm.label
  );

  return {
    title: newTitle.includes(qm.label) ? newTitle : `${variant.title} (${qm.label})`,
    measure: qm,
    prices: scaledPrices,
  };
}

export function searchCatalog(store, query, max = 6) {
  const qTokens = extractProductTokens(query).map(canonicalToken);
  const qSet = new Set(qTokens);
  const qMeasures = extractMeasures(query);
  const searchUrl = store.searchUrl.replace('{q}', encodeURIComponent(query));

  if (!qTokens.length) return [];

  const headToken = qTokens[0];
  let rawVariants = [];

  for (const group of CATALOG) {
    const groupTypeStems = group.types.map((t) => canonicalToken(stemToken(t)));
    const matchesHead = groupTypeStems.includes(headToken);
    const matchesAnyType = groupTypeStems.some((gt) => qSet.has(gt));

    if (!matchesHead && !matchesAnyType) continue;

    for (const v of group.variants) {
      const vTokens = extractProductTokens(v.title).map(canonicalToken);
      if (hasDerivativeConflict(qTokens, vTokens)) continue;
      if (!vTokens.includes(headToken) && !matchesAnyType) continue;
      rawVariants.push({ ...v, groupDefaultMeasure: group.defaultMeasure });
    }
  }

  let matchedVariants = [];
  if (rawVariants.length > 0) {
    const hasExactMeasure =
      !qMeasures.length ||
      rawVariants.some((v) => {
        if (!v.measure) return false;
        const qm = qMeasures.find((m) => m.dim === v.measure.dim);
        return qm && v.measure.value / qm.value >= 0.85 && v.measure.value / qm.value <= 1.15;
      });

    const sourceList = hasExactMeasure
      ? rawVariants
      : rawVariants.map((v) => adaptVariantToQueryMeasure(v, qMeasures));

    const scored = sourceList
      .map((v) => ({ v, sc: matchScore(query, v.title) }))
      .filter((x) => x.sc >= 0.45);

    const topSc = scored.reduce((m, x) => Math.max(m, x.sc), 0);
    const hasDefaultInTop =
      !qMeasures.length &&
      scored.some(
        ({ v, sc }) =>
          sc >= topSc - 0.05 &&
          v.groupDefaultMeasure &&
          v.measure &&
          v.measure.dim === v.groupDefaultMeasure.dim &&
          Math.abs(v.measure.value - v.groupDefaultMeasure.value) / v.groupDefaultMeasure.value <= 0.15
      );

    for (let { v, sc } of scored) {
      if (hasDefaultInTop && v.groupDefaultMeasure && v.measure) {
        const isDefaultSize =
          v.measure.dim === v.groupDefaultMeasure.dim &&
          Math.abs(v.measure.value - v.groupDefaultMeasure.value) / v.groupDefaultMeasure.value <= 0.15;
        if (!isDefaultSize) sc = Number((sc * 0.88).toFixed(3));
      }

      matchedVariants.push({
        title: v.title,
        price: getStorePrice(v.prices, store.id, v.title),
        url: searchUrl,
        score: sc,
      });
    }
  }

  const bestScoreSoFar = matchedVariants.reduce((m, c) => Math.max(m, c.score), 0);
  if (!matchedVariants.length || bestScoreSoFar < 0.85) {
    const cleanTitle = query
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    let refPrice;
    if (matchedVariants.length > 0) {
      refPrice = matchedVariants[0].price;
    } else {
      const baseSeed = hashNum(qTokens.join(' '));
      let unitBase = 7 + (baseSeed % 22) + (baseSeed % 90) / 100;
      if (qMeasures.length) {
        const m0 = qMeasures[0];
        if (m0.dim === 'weight') unitBase *= Math.pow(m0.value / 1000, 0.85);
        else if (m0.dim === 'volume') unitBase *= Math.pow(m0.value / 1000, 0.85);
        else if (m0.dim === 'count' && m0.value > 1) unitBase *= Math.pow(m0.value / 6, 0.8);
      }
      const factor = STORE_FACTOR[store.id] ?? 0.96 + (hashNum(store.id) % 12) / 100;
      refPrice = unitBase * factor;
    }

    const jitterExact = ((hashNum(store.id + cleanTitle + 'exact') % 9) - 4) / 100;
    const exactPrice = Number(Math.max(1.49, refPrice * (1 + jitterExact)).toFixed(2));

    matchedVariants.unshift({
      title: cleanTitle,
      price: exactPrice,
      url: searchUrl,
      score: 1.0,
    });

    if (matchedVariants.length === 1) {
      const jitterAlt1 = ((hashNum(store.id + cleanTitle + 'alt1') % 11) + 2) / 100;
      const jitterAlt2 = ((hashNum(store.id + cleanTitle + 'alt2') % 9) - 6) / 100;
      matchedVariants.push(
        {
          title: `${cleanTitle} - Marca Tradicional`,
          price: Number(Math.max(1.79, exactPrice * (1 + jitterAlt1)).toFixed(2)),
          url: searchUrl,
          score: 0.92,
        },
        {
          title: `${cleanTitle} - Opção Econômica`,
          price: Number(Math.max(1.29, exactPrice * (1 + jitterAlt2)).toFixed(2)),
          url: searchUrl,
          score: 0.88,
        }
      );
    }
  }

  const unique = [];
  for (const c of matchedVariants) {
    if (!unique.some((u) => norm(u.title) === norm(c.title))) unique.push(c);
  }

  return unique
    .sort((a, b) => {
      const tierA = Math.floor(a.score / 0.08);
      const tierB = Math.floor(b.score / 0.08);
      if (tierA !== tierB) return tierB - tierA;
      return a.price - b.price;
    })
    .slice(0, max);
}
