## Why

`historico-financeiro` já previa um "Filtro por período" como evolução
futura — a própria Requirement "Totais agregados" já fala em "respeitando
o filtro de período ativo, quando existir", e a paginação hoje só opera
sobre o histórico inteiro. Sem filtro, encontrar o faturamento de uma
semana ou mês específico exige folhear página por página. Esta change
implementa a fatia mínima útil: um filtro por data inicial e data final —
sem atalhos de "hoje"/"semana"/"mês" (fora de escopo deste MVP, ver Non-
Goals em design.md).

## What Changes

- Adiciona filtro por período (data inicial, data final) a `/historico`,
  via query string (`?inicio=&fim=`) — mesmo padrão sem JS de client já
  usado em `clientes` (busca), `pacientes` (espécie) e `agenda`
  (`?semana=`).
- **BREAKING** (spec, alinhando com o que "Totais agregados" já previa):
  tanto a listagem paginada quanto os 4 cards de totais agregados passam a
  refletir o período ativo, quando um estiver selecionado — sem filtro,
  comportamento idêntico ao de hoje (histórico inteiro).
- Paginação recalculada sobre o conjunto filtrado (`totalPaginas` muda
  junto com o filtro); trocar o filtro volta pra página 1; navegar entre
  páginas preserva o filtro ativo na URL.
- Substitui a Requirement "Filtro por período (evolução futura)" (que só
  documentava intenção, sem nenhum Scenario) por uma Requirement real e
  testável.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `historico-financeiro`:
  - Substitui a Requirement "Filtro por período (evolução futura)" por
    "Filtro por período" com comportamento real (aplicar, limpar, período
    sem resultados, intervalo inválido, interação com paginação).
  - Modifica "Totais agregados": remove o "quando existir" condicional
    (o filtro passa a existir de fato) e detalha o comportamento com e
    sem filtro ativo.
  - Modifica "Listagem de comandas finalizadas": a listagem passa a
    respeitar o período ativo.

## Impact

- `src/lib/historico.ts`: `listarHistorico` e `totaisHistorico` ganham um
  parâmetro opcional de período (`{ inicio, fim }` em `Date`, já resolvido
  pelo caller); sem período, comportamento idêntico ao atual.
  `buscarComandaFinalizada` não muda — a tela de detalhe é sobre uma
  comanda específica, não sobre um recorte de tempo.
- `src/app/(dashboard)/historico/page.tsx`: novo formulário `method="get"`
  com dois `<input type="date">` (início/fim) + "Aplicar" + "Limpar
  filtro", lendo/gravando `searchParams.inicio`/`searchParams.fim`;
  parsing e limites do dia via `src/lib/timezone.ts` (nunca `new
  Date(string)` nem `getHours()`/etc. direto — mesma regra do resto do
  projeto).
- `src/lib/timezone.ts`: possível pequeno helper novo pra converter uma
  string `yyyy-mm-dd` (vinda de `<input type="date">`) em `DiaCalendario`
  — detalhado em design.md.
- `src/lib/historico.test.ts`: novos casos cobrindo listagem e totais com
  período aplicado, período sem resultados, e o intervalo inválido
  (início depois do fim).
- Nenhuma mudança em `atendimento-comanda` (comandas finalizadas
  continuam imutáveis) nem na tela de detalhes `/historico/[id]`.
