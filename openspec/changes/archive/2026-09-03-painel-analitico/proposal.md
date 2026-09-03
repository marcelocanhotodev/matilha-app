## Why

O Painel (`/dashboard`) hoje só mostra o aviso de comandas em aberto — o
resto é um placeholder ("a implementar"). O protótipo de referência
(`#dashboard`) já desenha cards de estatística e listas (consultas de
hoje, próximos atendimentos, aniversariantes), mas **nenhuma visualização
gráfica** — nada que agregue o histórico de vendas já acumulado em
`Comanda`/`ComandaItem` desde que `atendimento-comanda` foi implementada.
A clínica não tem hoje nenhuma forma visual de responder perguntas como
"qual serviço mais vende?" ou "quem são meus clientes mais fiéis?" sem
abrir o banco na mão.

## What Changes

- Nova capability `painel-analitico`: um conjunto de 4 gráficos no Painel,
  cada um respondendo uma pergunta de negócio concreta sobre o histórico
  já finalizado de comandas. Ideias de gráfico levantadas (as 4 marcadas
  **[v1]** entram nesta change; as demais ficam registradas como
  candidatas futuras, fora de escopo):
  - **[v1] Itens mais vendidos** — ranking (barra horizontal) dos 5
    itens de catálogo (serviço ou produto, combinados) com maior
    quantidade vendida em comandas finalizadas.
  - **[v1] Clientes com mais consumo** — ranking (barra horizontal) dos 5
    clientes com maior valor total gasto em comandas finalizadas.
  - **[v1] Faturamento por forma de pagamento** — distribuição (rosca) do
    valor total faturado entre Dinheiro/Pix/Cartão de crédito/Cartão de
    débito, em comandas finalizadas.
  - **[v1] Faturamento por dia** — série temporal (linha ou barra) do
    valor faturado por dia nos últimos 14 dias, em comandas finalizadas.
  - *(candidatas futuras, não implementadas nesta change)*: distribuição
    de pacientes por espécie; atendimentos por veterinário; comparação
    serviço vs. produto no faturamento; novos clientes por mês.
- Adiciona a biblioteca **Recharts** como dependência nova (ver
  `design.md` para a justificativa e alternativas consideradas) — os 4
  gráficos são a primeira e única visualização gráfica do produto até
  aqui.
- Os 4 gráficos somam-se ao aviso de comandas em aberto já existente no
  Painel; não tocam nem substituem o restante do placeholder do
  protótipo (stat cards de agenda, próximos atendimentos, "matilha de
  hoje", aniversariantes) — isso continua fora de escopo, listado como
  Non-Goal em `design.md`.

## Capabilities

### New Capabilities
- `painel-analitico`: define os 4 gráficos do Painel — o que cada um
  mostra, de onde vêm os dados (só comandas finalizadas, respeitando
  `clinicaId`), e o comportamento quando não há dado suficiente.

### Modified Capabilities

(nenhuma — os gráficos são uma capability nova; não alteram nenhum
requirement de `atendimento-comanda`, `historico-financeiro` ou
`catalogo-produtos-servicos`, só leem dados que essas capabilities já
produzem)

## Impact

- `src/app/(dashboard)/dashboard/page.tsx` — passa a buscar os dados
  agregados dos 4 gráficos (Server Component) e renderizar os
  componentes de gráfico.
- Novos componentes de gráfico (Client Components — Recharts precisa de
  medição no browser) e função(ões) de agregação server-side; nomes e
  organização exatos definidos em `design.md`.
- `package.json` — nova dependência `recharts`.
- Sem migração de schema — os 4 gráficos leem dados já existentes em
  `Comanda`/`ComandaItem`/`ItemCatalogo`/`Cliente`.
