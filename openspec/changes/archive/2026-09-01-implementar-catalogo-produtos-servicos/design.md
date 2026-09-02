## Context

Ver `proposal.md` para a motivação. Estado relevante para o design:

- `autenticacao-multi-clinica`, `clientes` e `pacientes` estão implementadas;
  `getClinicaAtual()` (`src/lib/tenant.ts`) é o ponto único de resolução de
  `clinicaId` e deve ser usado por toda query desta capability.
- `prisma/schema.prisma` já tem o model `ItemCatalogo` provisionado desde o
  início do projeto, inclusive `ativo Boolean @default(true)` — diferente de
  `Cliente`/`Paciente`, cujo campo `ativo` foi adicionado por migration
  durante a respectiva change. Aqui não há migration a fazer.
- `Agendamento.itemCatalogoId` é `onDelete: SetNull` e opcional;
  `ComandaItem.itemCatalogoId` também é `onDelete: SetNull` e opcional, com
  `nomeSnapshot`/`precoSnapshot` próprios. Nenhuma das duas capabilities tem
  UI própria ainda, mas as constraints e o snapshot já existem no schema —
  é isso que garante estruturalmente o Requirement "Alteração de preço não
  afeta vendas passadas" sem nenhum código novo nesta change.
- `Cliente` e `Paciente` já resolveram o mesmo tipo de decisão (exclusão
  lógica via `ativo: Boolean`, ver
  `openspec/changes/archive/2026-08-31-implementar-clientes/design.md`,
  Decisão 1, e `openspec/changes/archive/2026-09-01-implementar-pacientes/
  design.md`, Decisão 1) — este design espelha esse precedente para
  `ItemCatalogo`.
- Protótipo de referência: `openspec/reference/prototipo.html`, seção
  `#cadastro` — usa um painel de formulário fixo ao lado da tabela, com
  exclusão física direta (ícone de lixeira, sem confirmação). Layout e
  exclusão física não são replicados (ver Decisões 2 e 3).
- Padrão de listagem já consolidado em `pacientes`: Server Component lê
  filtro (categoria) e `mostrarInativos` da query string, sem exigir client
  JS para filtrar; só a grade em si (modal de cadastro/edição,
  inativar/reativar) é Client Component isolado
  (`src/app/(dashboard)/pacientes/page.tsx` +
  `src/app/(dashboard)/pacientes/pacientes-grid.tsx`).

## Goals / Non-Goals

**Goals:**
- Nenhuma forma de apagar fisicamente um item de catálogo no produto — só
  inativar.
- Inativação sempre permitida, sem checagem condicional de vínculo com
  Agendamento/ComandaItem (mesmo padrão de `inativarPaciente`).
- Interação de cadastro/edição consistente com `clientes`/`pacientes`
  (modal), não o painel inline do protótipo.

**Non-Goals:**
- Implementar os seletores de item de catálogo dentro dos formulários de
  `agendamento`/`atendimento-comanda` — essas capabilities ainda não têm UI
  própria. Esta change garante apenas que a query que uma futura tela de
  agendamento/comanda fizer para popular esse seletor deve filtrar por
  `ativo: true`, mesmo padrão já usado em `pacientes/page.tsx` para o
  seletor de tutor.
- Bloquear inativação de item referenciado por um agendamento futuro
  (`AGUARDANDO`) — não pedido pela spec original nem levantado como
  necessidade; inativação sempre incondicional, mesmo padrão de
  `Cliente`/`Paciente`.
- Reordenar ou paginar a listagem — volume de itens de catálogo por clínica
  é pequeno (mesma justificativa de `clientes`/`pacientes`).

## Decisions

**1. Exclusão lógica (`ItemCatalogo.ativo`, já existente), não física — sem
migration.** Alternativa considerada: aproveitar que
`Agendamento.itemCatalogoId`/`ComandaItem.itemCatalogoId` já são `SetNull` e
implementar exclusão física de verdade (delete real quando não houver
vínculo, e um caminho de erro quando houver). Rejeitada pelos mesmos três
motivos já registrados na Decisão 1 de `implementar-pacientes`: (a) permitir
exclusão física "às vezes" cria o mesmo tipo de lógica condicional de erro
que o precedente de `Cliente` rejeitou; (b) um item vendido uma única vez há
meses e depois apagado deixaria `ComandaItem.itemCatalogoId: null` — o
snapshot (`nomeSnapshot`/`precoSnapshot`) preserva o valor histórico exibido,
mas perde-se o vínculo para agregações futuras por item (ex.: "produtos mais
vendidos"); (c) consistência de produto — mesma tela de cadastro (`Cliente`,
`Paciente`, agora `ItemCatalogo`) não deveria ter três modelos de exclusão
diferentes.

**2. Cadastro/edição em modal, não no painel inline do protótipo.** Decisão
do usuário nesta sessão de exploração. Alternativa considerada: seguir o
protótipo à risca (form fixo ao lado da tabela, sempre visível, vira "editar"
ao clicar numa linha). Rejeitada por priorizar consistência de interação com
`clientes`/`pacientes` — o produto já estabeleceu "grid + botão Novo + modal"
como o padrão de cadastro, e ter uma capability com painel fixo introduziria
um segundo paradigma de interação sem ganho funcional (o protótipo não tem
nenhum comportamento no painel fixo que um modal não reproduza).

**3. Botão de linha é "Inativar"/"Reativar", não "Excluir".** O protótipo tem
um ícone de lixeira com delete físico direto, sem confirmação; não é
replicado — mesma UI de ação (toggle, com `window.confirm` antes de
inativar) já usada em `clientes`/`pacientes`.

**4. Filtro de categoria (Todos/Serviços/Produtos) e "Mostrar inativos" via
query string, no Server Component.** Mesmo padrão de
`src/app/(dashboard)/pacientes/page.tsx`: nenhum JS necessário para filtrar,
o filtro por categoria dos chips do protótipo (`data-cadcat`) vira parâmetro
de busca (`?categoria=SERVICO|PRODUTO`) em vez de estado client-side.

**5. Ícone (emoji) é campo de texto livre opcional, sem limite rígido de
caracteres.** O protótipo usa `maxlength="2"`, que quebra para emojis
multi-codepoint (ex.: 🧑‍⚕️ usa ZWJ). Alternativa considerada: replicar
`maxlength="2"` do protótipo; rejeitada por ser uma trava de UI que corta
emojis válidos no meio, sem nenhum requirement pedindo essa restrição — a
spec original só define nome, categoria e preço como campos obrigatórios.

## Risks / Trade-offs

- [Item inativado por engano fica "escondido" até alguém notar] →
  Mitigação: reativação é ação de um clique, mesmo padrão de
  `Cliente`/`Paciente`.
- [Sem seletor de agendamento/comanda ainda implementado, o filtro
  `ativo: true` da Decisão 4/Non-Goal não tem nenhum teste end-to-end nesta
  change] → Mitigação: coberto apenas pelo teste de isolamento e pela
  listagem própria; quando `agendamento`/`atendimento-comanda` forem
  implementadas, cabe a elas replicar o filtro — documentado aqui para não
  ser esquecido.

## Open Questions

Nenhuma — as decisões acima fecham todos os pontos identificados na
exploração.
