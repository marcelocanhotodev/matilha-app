## Why

`agendamento` é a última capability sem UI própria na ordem sugerida em
`project.md`. Duas de suas três requirements originais (`Criação de
agendamento`, `Visualização semanal por profissional`) nunca foram
implementadas — `/agenda` continua sendo stub; a única forma hoje de um
`Agendamento` existir é o `seed.ts` criado para testar a fila de
`atendimento-comanda`. Ao explorar como construir isso, ficou claro que o
protótipo de referência (`openspec/reference/prototipo.html`, seção
`#agenda`) é bem menos aproveitável do que nas outras telas: o formulário de
criação nunca foi ligado a dado real (pet/tutor são campos de texto livre,
sem relação com `pacientes`/`clientes`), a navegação de semana é decorativa
(botões sem handler), e não existe nenhuma verificação de conflito de
horário em lugar nenhum — a spec pede um comportamento que o protótipo nunca
chegou a simular.

## What Changes

- **Criação de agendamento** ganha um formulário de verdade: seletor de
  paciente existente (não mais texto livre), seletor de veterinário (usuário
  vinculado à clínica ativa, sem filtro por papel), serviço previsto,
  data/hora, com duração pré-preenchida a partir do serviço selecionado mas
  sempre editável.
- `ItemCatalogo` ganha `duracaoPadraoMinutos` (opcional, só relevante para
  itens da categoria "serviço") — a fonte do pré-preenchimento de duração
  acima. Isso modifica `catalogo-produtos-servicos`, capability já
  implementada e arquivada.
- **Conflito de horário**: ao salvar um agendamento cujo horário se sobrepõe
  a outro do mesmo profissional (excluindo agendamentos cancelados), o
  sistema alerta antes de confirmar — mas SHALL permitir seguir mesmo assim
  (nunca um bloqueio duro). Introduz uma textura de confirmação nova no
  produto: "o sistema avisou, o usuário decide" — diferente do
  `window.confirm()` já usado para inativação.
- **Visualização semanal**: uma grade única (não filtrada por profissional,
  apesar do nome do requirement — decisão desta exploração, ver design.md),
  segunda a sexta, 8h-18h, com agendamentos posicionados por horário/duração
  e coloridos por espécie do paciente — reproduzindo fielmente o layout já
  validado no protótipo. Navegação de semana via `?semana=` na URL (sem JS),
  substituindo os botões decorativos do protótipo por navegação real.
  Clicar numa célula vazia abre o formulário de criação com data/hora
  pré-preenchidas; clicar num agendamento existente não faz nada
  (edição/reagendamento não é uma requirement desta capability).
- **Combobox reutilizável**: primeiro componente verdadeiramente
  compartilhado do projeto (`src/components/`, fora de qualquer pasta de
  rota), construído a partir do shadcn/ui (Popover + Command via `cmdk`) —
  primeira vez que o stack declarado em `project.md` ("Tailwind CSS +
  shadcn/ui") é de fato usado. Repintado com a paleta já existente
  (`pine`/`sage`/`sand`/`gold`) em vez do sistema de cor semântico padrão do
  shadcn, para não introduzir um segundo dialeto de estilo no projeto. Usado
  no seletor de paciente do formulário de agendamento, e retrofitado no
  seletor de tutor do modal de Paciente (fechando o Open Question deixado em
  aberto por `implementar-pacientes`).

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `agendamento`: as requirements "Criação de agendamento" e "Visualização
  semanal por profissional" ganham comportamento real pela primeira vez
  (formulário com seletores + conflito de horário; grade semanal com
  navegação real) — ainda não redigido como delta spec nesta change.
- `catalogo-produtos-servicos`: o Requirement "CRUD de itens de catálogo"
  ganha o campo `duracaoPadraoMinutos` (opcional, só para serviços) — ainda
  não redigido como delta spec nesta change.

## Impact

- **Schema**: `ItemCatalogo` ganha `duracaoPadraoMinutos Int?` — migration
  nova, sem backfill (nulo é um valor válido, itens existentes nascem sem
  duração configurada). Nenhuma mudança em `Agendamento` (já tem
  `duracaoMinutos` desde o início).
- **Dependências novas**: `@radix-ui/react-popover`, `cmdk`, `clsx`,
  `tailwind-merge` — primeira dependência de UI do projeto além do Tailwind
  em si.
- **Código**: ainda não iniciado — esta change está em fase de design.
  Toca `src/app/(dashboard)/agenda/` (hoje stub), `src/app/(dashboard)/
  cadastro/` (coluna nova + campo condicional no modal de item de
  catálogo), `src/app/(dashboard)/pacientes/paciente-modal.tsx` (retrofit do
  seletor de tutor), e introduz `src/components/` (novo diretório
  compartilhado) e `src/lib/utils.ts` (`cn()` helper).
- **Capabilities relacionadas não afetadas**: `atendimento-comanda` não
  muda — a Requirement "Fila de agendamentos do dia" já lê `Agendamento`
  normalmente, independente de como ele foi criado.
