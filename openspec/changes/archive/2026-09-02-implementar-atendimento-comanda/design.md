## Context

Ver `proposal.md` para a motivação. Estado relevante para o design:

- `prisma/schema.prisma` já modela `Agendamento` e `Comanda` por completo,
  inclusive a relação entre os dois (`Comanda.agendamentoId String? @unique`
  — `null` é o caso avulso; `@unique` impede duas comandas para o mesmo
  agendamento). Nenhuma das duas capabilities tem UI própria ainda.
- Hoje `Comanda.subtotal`, `total` e `formaPagamento` são `NOT NULL` — o
  schema, do jeito que já estava antes desta exploração, só sabe representar
  uma comanda **completa**. Não existe, hoje, forma de gravar uma comanda em
  progresso sem mudar o schema.
- `StatusAgendamento` tem dois valores sem gatilho definido em lugar nenhum
  (nem spec, nem protótipo): `EM_ATENDIMENTO` e `CANCELADO`. Só `CONCLUIDO`
  já tinha gatilho claro (finalização de comanda). Confirmado por grep no
  protótipo (`openspec/reference/prototipo.html`): todo "Cancelar" ali é
  botão de fechar modal, nenhum jamais mexeu em status de agendamento.
- Padrão de Server Action já consolidado em `clientes`/`pacientes`/
  `catalogo-produtos-servicos` (ver
  `src/lib/actions/item-catalogo.ts`): `"use server"`, `getClinicaAtual()`
  como primeira linha, `Zod.safeParse` nos dados brutos, `findFirst`/
  `updateMany` sempre filtrando por `{ id, clinicaId }` juntos (nunca
  distingue "não existe" de "é de outra clínica"), retorno `{ ok, erro?
  }`, sem `revalidatePath` (client chama `router.refresh()`).
- `src/lib/isolamento-clinica.test.ts` já cita `atendimento-comanda`
  nominalmente como uma das capabilities que deve repetir o teste de
  isolamento entre clínicas para seu próprio recurso.
- `historico-financeiro/spec.md` já é explícito: "Listagem de comandas
  **finalizadas**" — não há intenção, ali, de expor comandas abertas ou
  canceladas.
- Painel (`/dashboard`) ainda é um stub sem capability própria —
  `openspec/reference/README.md` já o descreve como tela que "agrega dados
  de outras capabilities", não uma capability em si.

## Goals / Non-Goals

**Goals:**
- Uma comanda abandonada (navegador travou, recepção interrompida) deixa
  rastro tanto no lado financeiro (`Comanda` existe, com `status: ABERTA`)
  quanto no lado operacional (`Agendamento` fica visivelmente parado em
  `EM_ATENDIMENTO`, nunca chega a `CONCLUIDO`).
- Nenhum estado novo é introduzido sem uma ação de UI que o dispare —
  princípio que motivou destravar `EM_ATENDIMENTO` e que agora também rege
  `CANCELADA`/`CANCELADO`: só existem porque a ação de "descartar" os aciona.
- Retomar uma comanda `ABERTA` — vinculada a agendamento de hoje, de outro
  dia, ou avulsa — sempre volta ao mesmo carrinho, nunca cria uma segunda
  comanda para o mesmo agendamento.
- Descartar uma comanda `ABERTA` é uma decisão explícita e intencional: exige
  justificativa antes de confirmar, nunca um clique único.
- Escrita do carrinho em progresso é barata o suficiente para não pesar a
  interação "tempo real" que a spec de `atendimento-comanda` pede
  (Requirement: Montagem da comanda — "calculando subtotal em tempo real").

**Non-Goals:**
- Tela ou consulta dedicada para revisar motivos de cancelamento depois — o
  campo existe para forçar justificativa no momento de descartar, não para
  leitura futura (decisão explícita desta exploração; ver Decisão 6).
- Regra de tamanho mínimo para o motivo — só precisa ser não-vazio, sem
  mínimo de caracteres arbitrário.
- Papel/permissão restringindo quem pode descartar uma comanda — qualquer
  usuário autenticado com acesso à tela pode, mesmo padrão de RBAC (ausente)
  do resto do produto.
- Deduplicar/agrupar comandas avulsas abandonadas — aceito que cada
  tentativa avulsa fica solta, sem retomada (não há chave natural como
  `agendamentoId` para agrupar contra).
- Mudar `onDelete` de qualquer relação existente de `Comanda`/`Agendamento`.
- Painel virar uma capability própria por causa do widget de contador — ele
  consome uma query que já é de `atendimento-comanda` (ver Decisão 9).

## Decisions

**1. `Comanda.status: StatusComanda` com três valores (`ABERTA`,
`FINALIZADA`, `CANCELADA`), e `motivoCancelamento` preenchido só nesse
último caso.** Revisão de uma decisão anterior desta mesma exploração, que
tinha rejeitado `CANCELADA` por não ter, na hora, nenhuma ação de UI que a
acionasse — o mesmo problema que motivou destravar `EM_ATENDIMENTO`. Isso
mudou: "descartar" agora é uma ação real da tela (Decisão 7), então
`CANCELADA` deixa de ser um estado especulativo e passa a ter gatilho
próprio, coerente com o princípio que a rejeitou antes.

**2. `Comanda` nasce no primeiro item do carrinho, não na finalização.**
Alternativa considerada (Plano A "puro"): carrinho só em estado de client,
`Comanda`+`ComandaItem` gravados atomicamente só no clique de "Finalizar" —
era a leitura inicial da spec, mas deixa zero rastro de qualquer tentativa
abandonada, o problema que motivou toda esta exploração. Rejeitada.
Alternativa considerada (gravar já na seleção da fila, antes de qualquer
item): geraria uma `Comanda` para todo clique de "só quero ver os dados do
pet", sem nenhuma intenção de venda por trás — ruído demais. O primeiro item
adicionado é o sinal mais forte de intenção real, e é o ponto de equilíbrio
escolhido.

**3. Escrita do primeiro item é síncrona; mudanças seguintes usam autosave
com debounce (~10s) enquanto o carrinho não está vazio; "Finalizar" sempre
síncrono.** Alternativas consideradas: (a) escrever a cada ação (toda
mudança de quantidade vira uma Server Action) — rejeitada por ser pesada
demais pra uma interação que a spec pede como "tempo real"; (b) confiar só
em `beforeunload`/`visibilitychange` para persistir o estado final —
rejeitada porque o cenário que mais importa capturar (o navegador
**travou**) é exatamente quando esse evento não dispara de forma confiável.
O debounce aceita perder os últimos ~10s antes de um crash, em troca de não
gerar uma escrita por clique.

**4. Retomada de comanda vinculada a agendamento usa a constraint existente
(`agendamentoId @unique`), sem lógica nova de deduplicação.** Ao reabrir um
agendamento cuja `Comanda` já está `ABERTA`, a Server Action de "adicionar
item" faz `upsert` por `agendamentoId` em vez de `create` — o schema já
impede a existência de uma segunda comanda para o mesmo agendamento, então
"retomar" é o comportamento natural de tentar criar e encontrar o registro
já existente, não uma feature nova a construir. Mesmo mecanismo cobre tanto
reabrir no mesmo dia (via fila) quanto reabrir dias depois (via seção
"Comandas em aberto", Decisão 7) — é a mesma Server Action nos dois casos.

**5. A transição para `EM_ATENDIMENTO` é acionada pela seleção do
agendamento na fila da tela de atendimento — e vive como parte do
Requirement "Ciclo de status do agendamento" já existente em `agendamento`,
não como um requirement novo de `atendimento-comanda`.** É a mesma tela que
já vai gravar `Agendamento.status = CONCLUIDO` a partir da lógica de
`atendimento-comanda` (Requirement: Finalização da comanda, item 3) — manter
as transições descritas no mesmo requirement evita a spec de `agendamento`
ficar incompleta.

**6. Descartar uma comanda vinculada a agendamento também transiciona
`Agendamento.status -> CANCELADO`.** Simetria direta com a Decisão 5
("finalizar" -> `CONCLUIDO`, "descartar" -> `CANCELADO`) e resolve o segundo
status órfão de `StatusAgendamento` (ver Context) com o mesmo princípio: só
ganha um gatilho porque agora existe uma ação real que o aciona. Comanda
avulsa descartada não tem agendamento pra tocar — só muda `Comanda.status`.

**7. Seção "Comandas em aberto" dentro da própria tela de
`atendimento-comanda`, visível só quando existe pelo menos uma comanda
`ABERTA` fora da fila de hoje (agendamento de outro dia, ou avulsa).**
Alternativa considerada: expor essas comandas dentro de
`historico-financeiro` — rejeitada porque a spec dele já escopa
explicitamente "comandas finalizadas"; misturar abertas ali mudaria um
requirement existente sem necessidade. Cada linha oferece "Retomar" (carrega
no carrinho via Decisão 4) e "Descartar" (abre o formulário da Decisão 8). A
seção fica oculta (não aparece vazia) quando não há nenhuma comanda nessa
condição.

**8. Descartar exige motivo obrigatório e não-vazio, capturado num pequeno
formulário — nunca um `window.confirm()` de um clique.** Diferente do padrão
de "inativar" já usado em `Cliente`/`Paciente`/`ItemCatalogo` (confirmação
simples, sem motivo) porque a ação aqui é sobre dinheiro que quase foi
cobrado, não sobre um cadastro. O motivo não tem consulta ou tela própria
depois de gravado — decisão explícita: o campo existe para forçar quem
descarta a parar e justificar no momento, não para alguém reler depois. Se
isso mudar, é aditivo (uma tela de auditoria futura), não uma
re-arquitetura.

**9. Contador de comandas em aberto aparece como widget no Painel
(`/dashboard`).** O Painel não vira uma capability própria por causa disso —
ele já é descrito (`reference/README.md`) como tela que agrega dados de
outras capabilities; o widget só consome uma contagem
(`Comanda.status = ABERTA`) que `atendimento-comanda` já expõe. Fica só como
nudge/aviso, sem ação nenhuma disponível a partir do próprio widget (a ação
mora na tela de atendimento).

## Risks / Trade-offs

- [Uma comanda `ABERTA` esquecida por dias polui qualquer contagem futura de
  "comandas abertas hoje"] → Mitigação: agora existe uma ação real
  ("Descartar", Decisões 6-8) pra resolver isso ativamente, além da seção
  "Comandas em aberto" (Decisão 7) tornar o problema visível em vez de
  escondido.
- [Debounce de 10s é um número escolhido, não medido] → Aceito como ponto de
  partida; ajustar o valor depois não muda spec nem approach, é um parâmetro
  de implementação.
- [`upsert` por `agendamentoId` na Decisão 4 assume que a Server Action de
  "adicionar item" sempre passa por esse caminho, mesmo quando é a primeira
  vez] → Mitigação: mesma Server Action serve os dois casos (nasce ou
  retoma) — não há um caminho de código separado que possa esquecer a
  checagem.
- [Motivo obrigatório mas nunca relido depois pode parecer atrito sem
  retorno para quem descarta] → Aceito conscientemente (Decisão 8): o valor
  é comportamental (forçar a pausa/justificativa no momento), não
  informacional; revisitar só se o produto precisar de auditoria de
  cancelamentos no futuro.
- [Painel consumindo um dado de `atendimento-comanda` sem essa tela
  pertencer formalmente a nenhuma capability] → Mitigação: nenhuma
  capability nova é criada só por causa do widget (Decisão 9); revisitar se
  o Painel crescer a ponto de precisar de spec própria.

## Migration Plan

1. Adicionar `enum StatusComanda { ABERTA FINALIZADA CANCELADA }` e
   `Comanda.status StatusComanda @default(ABERTA)`.
2. Adicionar `Comanda.motivoCancelamento String? @db.Text` (nulo em todo
   status exceto `CANCELADA`).
3. `Comanda.formaPagamento` vira opcional (`FormaPagamento?`); `subtotal` e
   `total` continuam `NOT NULL`, nascendo em `0` e recalculados a cada
   escrita.
4. Sem backfill: nenhuma `Comanda` existe em produção ainda (capability não
   implementada) — toda linha futura já nasce com o novo shape.
5. Rollback: reverter a migration remove `status`/`motivoCancelamento` e
   volta `formaPagamento` a obrigatório; como não há dado real gravado antes
   desta change existir, não há perda associada.
