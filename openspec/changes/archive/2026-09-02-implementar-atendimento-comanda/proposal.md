## Why

`atendimento-comanda` é a próxima capability sem UI própria na ordem sugerida
em `project.md`, e é a única, dentre as ainda não implementadas, que fica
totalmente utilizável sozinha (o fluxo "avulso" não depende de `agendamento`
existir). Ao explorar como ela seria construída, ficou claro que a spec
original (`openspec/specs/atendimento-comanda/spec.md`) só descreve o caminho
feliz — montar e finalizar uma comanda — e não diz nada sobre o que acontece
quando uma comanda começa a ser montada e nunca é finalizada (navegador
travou, recepção foi interrompida). Sem tratar isso, um atendimento realizado
mas nunca cobrado fica indistinguível, para sempre, de um paciente que nunca
apareceu — tanto no financeiro quanto na agenda.

## What Changes

- `Comanda` deixa de nascer só no momento da finalização: passa a existir no
  banco (`status: ABERTA`) a partir do primeiro item adicionado ao carrinho,
  com escrita imediata nesse primeiro item e autosave com debounce (~10s) nas
  mudanças seguintes (quantidade, desconto), enquanto o carrinho não está
  vazio. "Finalizar" continua sempre gravando de forma síncrona.
- `Agendamento.status` passa a transicionar para `EM_ATENDIMENTO` no momento
  em que a recepção seleciona esse agendamento na fila da tela de
  atendimento — antes de qualquer item ser adicionado à comanda. Isso
  preenche uma transição hoje órfã no ciclo de status.
- Descartar uma comanda `ABERTA` marca `status: CANCELADA` com um motivo
  obrigatório (nunca apaga a linha) — se vinculada a um agendamento, o
  agendamento também transiciona para `CANCELADO`, preenchendo a segunda
  transição órfã do ciclo de status (nem a spec nem o protótipo definiam
  quem acionava `CANCELADO`).
- Uma seção "Comandas em aberto" (visível só quando existe pelo menos uma)
  passa a existir na própria tela de atendimento-comanda, cobrindo o que a
  fila de hoje não alcança: agendamentos de outros dias e comandas avulsas.
  Cada linha permite retomar (carrega o carrinho salvo) ou descartar.
- O Painel (`/dashboard`, ainda "a implementar") ganha um primeiro widget
  real: um contador de comandas em aberto, consumindo uma query exposta por
  `atendimento-comanda`, sem que o Painel vire uma capability própria.
- Combinados, os pontos acima dão rastreabilidade de abandono nos dois
  sentidos: operacional (um agendamento parado em `EM_ATENDIMENTO` além do
  esperado é o sinal de que algo foi iniciado e não finalizado) e financeiro
  (uma `Comanda` em `ABERTA` — ou depois `CANCELADA`, com motivo — é uma
  tentativa de venda que não fechou).
- Retomar um agendamento cuja `Comanda` já está `ABERTA` reaproveita a mesma
  linha (`Comanda.agendamentoId` já é `@unique` no schema — nunca cria uma
  segunda comanda para o mesmo agendamento), seja no mesmo dia (via fila) ou
  dias depois (via "Comandas em aberto"). Comandas avulsas abandonadas não
  têm essa mesma trava (`agendamentoId: null` não é único) — cada tentativa
  avulsa fica solta, sem agrupamento; aceito como comportamento correto, já
  que um avulso não tem um compromisso prévio na agenda para retomar contra.

Esta change captura a exploração até aqui, incluindo a UX completa de
retomar/descartar comandas abertas. **`specs/` e `tasks.md` ficam para uma
passada seguinte** — falta redigir os requirements formais (incluindo os dois
que `agendamento` ganha) e quebrar o trabalho em tasks.

## Capabilities

### New Capabilities
(nenhuma — `atendimento-comanda` e `agendamento` já têm spec própria,
seedada antes de qualquer implementação)

### Modified Capabilities
- `atendimento-comanda`: novo requirement sobre o ciclo de vida de uma
  comanda antes da finalização — nasce `ABERTA` no primeiro item, autosave,
  pode ser descartada (`CANCELADA`, com motivo obrigatório) ou retomada via
  a seção "Comandas em aberto" — ainda não redigido como delta spec nesta
  change.
- `agendamento`: o Requirement "Ciclo de status do agendamento" ganha as
  transições para `EM_ATENDIMENTO` (seleção na fila) e `CANCELADO`
  (descarte de comanda vinculada) — as duas hoje indefinidas — ainda não
  redigido como delta spec nesta change.

## Impact

- **Schema**: `Comanda` ganha `status: StatusComanda @default(ABERTA)` (novo
  enum `ABERTA | FINALIZADA | CANCELADA`), `motivoCancelamento: String?` e
  `formaPagamento` vira opcional — migration nova. Nenhuma mudança em
  `Agendamento` (o enum `StatusAgendamento` já tem `EM_ATENDIMENTO` e
  `CANCELADO`, só nunca eram usados).
- **Código**: ainda não iniciado — esta change está em fase de design.
  `src/app/(dashboard)/dashboard/page.tsx` (hoje stub) é onde o widget do
  Painel entra, citado aqui por ser código afetado mesmo sem uma capability
  própria dona dele.
- **Capabilities relacionadas não afetadas**: `historico-financeiro`
  continua consultando só comandas `FINALIZADA` (spec já é explícita
  nisso), sem mudança de requirement.
