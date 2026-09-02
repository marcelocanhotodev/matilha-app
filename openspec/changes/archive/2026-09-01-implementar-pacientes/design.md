## Context

Ver `proposal.md` para a motivação. Estado relevante para o design:

- `autenticacao-multi-clinica` e `clientes` estão implementadas;
  `getClinicaAtual()` (`src/lib/tenant.ts`) é o ponto único de resolução de
  `clinicaId` e deve ser usado por toda query desta capability.
- `prisma/schema.prisma` já tem o model `Paciente` provisionado, com
  `clienteId` obrigatório e relação `onDelete: Restrict` para `Clinica` e
  `Cliente`. `Agendamento.pacienteId` é `onDelete: Restrict`;
  `Comanda.pacienteId` é `onDelete: SetNull` — as duas capabilities ainda não
  têm UI própria, mas as constraints já existem no schema.
- `Cliente` já resolveu o mesmo tipo de decisão (exclusão lógica via
  `ativo: Boolean`, ver `openspec/changes/archive/2026-08-31-implementar-clientes/design.md`,
  Decisão 1) — este design espelha esse precedente para `Paciente`.
- Protótipo de referência: `openspec/reference/prototipo.html`, seção
  `#pacientes` e modal `#modal-overlay-paciente` — já validou o layout de
  card, o filtro por espécie, o segmented de espécie/sexo/castrado e a lista
  `BREEDS` fixa por espécie.

## Goals / Non-Goals

**Goals:**
- Nenhuma forma de apagar fisicamente um Paciente no produto — só inativar.
- Inativação sempre permitida, sem checagem condicional de vínculo com
  Agendamento/Comanda (mesmo padrão de `inativarCliente`).

**Non-Goals:**
- Cascata de inativação entre Cliente e seus Pacientes (ex.: inativar um
  cliente não inativa automaticamente os pacientes dele) — fora de escopo
  desta decisão; nenhum dos dois specs pede esse comportamento.
- Alterar `onDelete` de `Agendamento.pacienteId`/`Comanda.pacienteId` — ver
  Decisão 1.

## Decisions

**1. Exclusão lógica (`Paciente.ativo: Boolean @default(true)`), não física.**
Alternativa considerada: manter exclusão física, já parcialmente bloqueada
pelo schema atual (`Agendamento.pacienteId` é `Restrict`). Rejeitada por três
motivos: (a) `Comanda.pacienteId` é `SetNull`, então um paciente sem
Agendamento mas com Comanda seria apagável fisicamente, deixando comandas
antigas com `pacienteId: null` — `historico-financeiro` perderia
silenciosamente qual paciente gerou qual receita passada; (b) essa mistura de
`Restrict`/`SetNull` já cria exclusão "às vezes permitida, às vezes não" pelo
mesmo botão, o tipo de lógica condicional de erro que o precedente de
`Cliente` (Decisão 1) rejeitou explicitamente; (c) consistência de produto —
`Cliente` já é sempre-inativa, ter dois modelos de exclusão diferentes na
mesma tela (tutor vs. o pet do tutor) não tem justificativa de negócio.

**2. `Agendamento.pacienteId` (`Restrict`) e `Comanda.pacienteId` (`SetNull`)
não mudam.** Como o produto nunca chama `prisma.paciente.delete()` (só
`update` do campo `ativo`, mesmo padrão de `alterarAtivo` em
`cliente.ts`), essas constraints nunca são acionadas — mudar `SetNull` para
`Restrict` por simetria com `Cliente`/`Paciente` adicionaria uma migration
sem nenhum efeito observável no produto. Revisitar apenas se um dia existir
um caminho real de exclusão física (ex.: ferramenta de admin/GDPR), fora de
escopo aqui.

**3. Botão de card é "Inativar"/"Reativar", não "Excluir".** O protótipo tem
um ícone de lixeira com delete físico direto (`deletePet`, sem confirmação);
não é replicado — mesma UI de ação (toggle) já usada na listagem de
`Cliente`.

## Risks / Trade-offs

- [Paciente inativado por engano fica "escondido" até alguém notar] →
  Mitigação: reativação é ação de um clique, mesmo padrão de `Cliente`.
- [Lista/card de Paciente não filtra por `ativo` seria uma regressão
  silenciosa em relação ao comportamento de `Cliente`] → Mitigação: listagem
  desta capability segue o mesmo filtro implícito (`where: { clinicaId,
  ativo: true }` por padrão) definido para `Cliente`.

## Migration Plan

1. `npx prisma migrate dev --name add-paciente-ativo` adicionando
   `ativo Boolean @default(true)` a `Paciente` — o default garante que todo
   registro existente (inclusive os do seed) nasce ativo, sem backfill
   manual.
2. Nenhuma mudança de `onDelete` em `Agendamento`/`Comanda` (ver Decisão 2).
3. Sem rollback especial: reverter a migration remove a coluna `ativo`; como
   não existe exclusão física de paciente no fluxo, não há perda de dado
   associada a um rollback.

## Open Questions

- O seletor de tutor no modal (`pac-tutor` no protótipo) é um `<select>`
  simples com todos os clientes ativos — não há nenhum componente de
  busca/combobox no projeto ainda. Fica como `<select>` simples por ora (não
  muda a spec nem o breakdown de tasks; se o volume de clientes por clínica
  crescer, trocar por um campo de busca é aditivo) ou vale já introduzir um
  componente de busca nesta change? Não decidido — não bloqueia o restante
  do design.
