# 🛒 Comparador de Preços de Supermercado Online

Aplicação web para comparar preços de listas de compras entre supermercados online, com suporte a login nos sites dos mercados, adição de novos sites e cálculo automático do menor preço **por produto** e **no total da compra com frete** (loja única ou compra dividida otimizada).

🌐 **Acesse online (GitHub Pages):** [https://zeltaori.github.io/Comparador-de-Precos/](https://zeltaori.github.io/Comparador-de-Precos/)

## Funcionalidades

1. **Sites de Supermercado Pré-configurados + Adição Livre**:
   - Já inclui nos parâmetros iniciais: **Mercado Livre**, **Amazon**, **Magalu**, **GoodBom** e **Arena Supermercado (Arena Atacado)**.
   - Permite adicionar qualquer outro supermercado online informando nome, URL de busca (`{q}`), URL de login e regras de frete (taxa, valor para frete grátis e pedido mínimo).
2. **Login nos Mercados**:
   - Permite registrar sua sessão/CEP em cada mercado ou abrir a janela oficial de login (e, quando executado localmente com Node.js, abre uma janela do Chromium via Playwright mantendo os cookies salvos em `data/profiles/`).
3. **Lista de Compras Inteligente**:
   - Adicione itens com quantidade individualmente, por botões de sugestão rápida ou colando uma lista inteira de uma vez (`2x Leite Integral 1L`).
4. **Comparação Completa (Por Produto e Total com Frete)**:
   - Destaca em qual site cada produto está mais barato (unitário e subtotal multiplicado pela quantidade).
   - Calcula o **total da compra em cada mercado** somando o frete configurado ou aplicando **frete grátis** automaticamente quando o subtotal atinge o mínimo da loja.
   - Calcula também a **melhor combinação dividindo a compra** entre mercados quando a economia supera o custo de mais de um frete.

## Como rodar localmente (com automação Playwright)

```bash
npm install
npx playwright install chromium
npm start
```

Depois acesse `http://localhost:3000`.
