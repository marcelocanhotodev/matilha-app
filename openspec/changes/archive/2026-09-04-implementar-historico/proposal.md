## Why

`historico-financeiro` já tem spec escrita mas nunca foi implementada — a
rota `/historico` hoje é um stub ("a implementar"). A spec original só
cobria uma listagem simples + totais agregados, sem nenhuma forma de ver o
detalhe de um atendimento específico. Esta change implementa a capability e
amplia o escopo original com uma tela de detalhes por atendimento, algo que
nem a spec nem o protótipo de referência previam.

## What Changes

- Implementa `/historico`: listagem de comandas `FINALIZADA` da clínica
  ativa (mais recentes primeiro), paginada, com 4 cards de totais agregados
  (arrecadado, quantidade, ticket médio, forma de pagamento mais frequente)
  calculados sobre o histórico inteiro, não só a página visível.
- **BREAKING** (spec, não código em produção — capability nunca foi
  implementada): a linha da listagem não mostra mais os itens vendidos
  (Requirement "Listagem de comandas finalizadas" previa isso) — itens
  passam a aparecer só na tela de detalhes.
- Nova tela `/historico/[id]` — primeira rota dinâmica do projeto —
  mostrando o detalhe completo e somente-leitura de uma comanda finalizada
  (itens, subtotal/desconto/total, pet/tutor/veterinário, origem
  agendamento-ou-avulso, forma de pagamento).
- Paginação com tamanho configurável por clínica: novo campo
  `Clinica.itensPorPaginaHistorico` (`Int`, default `10`) — sem tela de
  configuração; muda só editando a linha no banco (ex.: via pgAdmin).

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `historico-financeiro`: substitui a Requirement "Listagem de comandas
  finalizadas" (linha da tabela não mostra mais itens vendidos) e adiciona
  duas novas: tela de detalhes por atendimento (`/historico/[id]`, com
  isolamento por clínica via 404) e paginação configurável por clínica.
  "Filtro por período" continua fora de escopo (a própria spec já a
  documenta como evolução futura, em change separada).

## Impact

- `src/app/(dashboard)/historico/page.tsx`: deixa de ser stub — Server
  Component com listagem paginada + cards agregados.
- `src/app/(dashboard)/historico/[id]/page.tsx` (novo): Server Component da
  tela de detalhes, seguindo o mesmo padrão de isolamento multi-clínica já
  usado no resto do projeto (`findFirst({ where: { id, clinicaId } })` +
  `notFound()` — nunca 403).
- `prisma/schema.prisma`: novo campo `Clinica.itensPorPaginaHistorico Int
  @default(10)` — precisa de migration.
- Reaproveita padrões já existentes no projeto: paginação via `?page=`
  (mesmo estilo de query string de `clientes/page.tsx`/`pacientes/page.tsx`),
  agregações sobre `Comanda` `FINALIZADA` no mesmo estilo de
  `src/lib/painel-analitico.ts`.
- Nenhuma mudança em `atendimento-comanda` (a comanda finalizada continua
  imutável; esta tela é só leitura) nem em outras capabilities.
