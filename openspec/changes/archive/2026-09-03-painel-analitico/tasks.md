## 1. Setup

- [x] 1.1 Adicionado `recharts@^3.10.1` ao `package.json`. `npm install`
  rodado no host e sincronizado no container (`docker compose exec app npm
  install`), ambos sem erro.
- [x] 1.2 Skill `dataviz` carregada. Decisões de forma/cor/marca pros 4
  gráficos:
  - **Forma**: itens mais vendidos e clientes com mais consumo = ranking
    → barra horizontal (`choosing-a-form.md`: "compare magnitude, low→high
    → bar"); faturamento por dia = tendência → linha; faturamento por
    forma de pagamento = parte-do-todo em ≤6 categorias, leitura "de
    relance" → rosca (`anti-patterns.md` só reprova rosca/pizza pra
    *comparar valores próximos com precisão*; aqui a legenda carrega os
    valores exatos em texto, então o gráfico fica só com o papel de dar a
    visão geral).
  - **Cor**: itens/clientes/dia = série única → **uma cor só**, sem
    legenda (`marks-and-anatomy.md`: "single series needs no legend
    box") — reaproveita o token de marca `pine-700` (`#284a40`), já usado
    no resto do produto, em vez de importar uma cor nova. Forma de
    pagamento = 4 categorias → paleta categórica **validada** (não
    "achada de olho"): rodado
    `node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100" --mode light --surface "#faf7ef"`
    (superfície = `sand-50`, cor de fundo dos cards do produto) → **PASS**
    em lightness/chroma/CVD/normal-vision; **WARN** de contraste contra a
    superfície em 3 das 4 cores — mitigado com legenda sempre visível
    (rótulo + valor em R$ em texto, não só a cor), conforme a "relief
    rule" do skill. Slots atribuídos em ordem fixa, nunca ciclados:
    Dinheiro=azul, Pix=laranja, Cartão de crédito=aqua, Cartão de
    débito=amarelo.
  - **Marca**: barras ≤24px de espessura, ponta arredondada (4px) só no
    lado do dado, reta na base; linha 2px; grid sólida (nunca tracejada),
    1px, recessiva; rótulo direto só no topo/fim de cada marca (nunca um
    número por ponto — a série de 14 dias não label a cada dia); tooltip
    do Recharts customizado com o valor em destaque e o rótulo secundário.
  - **Escopo deliberadamente não coberto** (fora do que o skill recomenda
    para dashboards de produto maduro, mas consistente com os Non-Goals
    já registrados em `design.md` — "nenhuma interatividade além de
    tooltip"): sem alternância pra "visão em tabela", sem paleta
    específica de dark mode (o produto não tem tema escuro hoje), sem
    canal de textura pra acessibilidade CVD total. Documentado aqui como
    decisão deliberada, não esquecimento.

## 2. Agregações (server-side)

- [x] 2.1 Criado `src/lib/painel-analitico.ts` com
  `itensMaisVendidos(clinicaId)` — top 5 `ItemCatalogo` por quantidade
  total vendida em Comandas finalizadas, empate em ordem alfabética.
  Testes cobrindo ranking/empate, item sem venda não aparece, nenhuma
  venda (vazio), e isolamento (item homônimo de outra clínica não se
  mistura — agrupa por id, não por nome).
- [x] 2.2 Adicionado `clientesComMaisConsumo(clinicaId)` — top 5
  `Cliente` por soma de `total` em Comandas finalizadas, incluindo
  inativos, empate alfabético, comandas avulsas sem `clienteId`
  excluídas. Testes cobrindo ranking, exclusão de avulsa, e isolamento.
- [x] 2.3 Adicionado `faturamentoPorFormaPagamento(clinicaId)` — soma de
  `total` agrupada por `formaPagamento`, só Comandas finalizadas. Testes
  cobrindo agrupamento correto (incluindo comanda avulsa contando aqui,
  diferente do ranking de clientes) e nenhuma venda (vazio).
- [x] 2.4 Adicionado `faturamentoPorDia(clinicaId)` — soma de `total` por
  dia dos últimos 14 dias corridos (incluindo hoje, no fuso da clínica via
  `src/lib/timezone.ts` — nunca ambiente/processo), dias sem venda com
  valor zero. Testes cobrindo: 14 dias sempre presentes, dia "de ontem"
  somado corretamente, nenhuma venda no período (14 dias zerados).
  `npx vitest run src/lib/painel-analitico.test.ts` — 12/12 passando.

## 3. Componentes de gráfico (client-side)

- [x] 3.1 Criado `dashboard/ranking-bar-chart.tsx` — barra horizontal
  reutilizável (itens mais vendidos e clientes com mais consumo), recebe
  `{ label, valor }[]` já pronto, cor única (pine-700), rótulo no topo de
  cada barra, mensagem de estado vazio quando a lista está vazia.
- [x] 3.2 Criado `dashboard/forma-pagamento-chart.tsx` — rosca com a
  paleta categórica validada (4 cores, ordem fixa) + legenda sempre
  visível com rótulo e valor em texto (mitigação do WARN de contraste —
  task 1.2), estado vazio equivalente.
- [x] 3.3 Criado `dashboard/faturamento-por-dia-chart.tsx` — linha
  (decidido na task 1.2), sempre desenha os 14 dias do eixo mesmo todos
  zerados, com nota "Sem vendas nos últimos 14 dias" sobreposta quando é
  o caso; rótulo direto só no último ponto (hoje).
  `npx tsc --noEmit` limpo nos 3 componentes.

## 4. Integração no Painel

- [x] 4.1 `dashboard/page.tsx` atualizado: chama as 4 funções de
  agregação em paralelo (`Promise.all`, junto com a contagem de comandas
  abertas já existente) e renderiza os 4 gráficos em cards, grade
  responsiva (1 coluna no mobile, 2 no desktop), abaixo do aviso de
  comandas em aberto — texto/placeholder do resto do painel intocado.
  `npx tsc --noEmit` limpo.
- [x] 4.2 Verificado manualmente no navegador, logado como Ana (as duas
  clínicas). **Achado durante a verificação**: passar `formatarValor`
  como função via prop do Server Component pro Client Component quebra em
  runtime ("Functions cannot be passed directly to Client Components") —
  RSC não serializa função nenhuma que não seja "use server". Corrigido
  movendo os formatadores pra dentro de cada componente de gráfico
  (`RankingBarChart` passa a receber `unidade: "moeda" | "quantidade"`, uma
  string, em vez da função). Também ajustado o rótulo do último ponto da
  série temporal, que cortava na borda direita (`textAnchor` de `middle`
  pra `end` + mais margem). Clínica Pata Feliz (sem comandas finalizadas
  ainda): os 4 gráficos mostram a mensagem de estado vazio correta.
  Clínica Vida Animal (dados reais, trocando pelo dropdown do rodapé):
  ranking de itens com empate em ordem alfabética correto, ranking de
  clientes, rosca de forma de pagamento com as 3 cores/legenda corretas, e
  série temporal com o pico de faturamento visível — tudo sem erro no
  console.

## 5. Regressão

- [x] 5.1 Suíte completa rodada: **171/171 testes passando** (159
  existentes + 12 novos de `painel-analitico.test.ts`), `npx tsc --noEmit`
  limpo.
