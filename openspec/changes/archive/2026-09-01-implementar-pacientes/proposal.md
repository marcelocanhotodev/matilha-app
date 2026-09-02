## Why

`pacientes` é a próxima capability na ordem sugerida de implementação (depende
apenas de `clientes`, já concluída) e é pré-requisito direto de `agendamento`
e `atendimento-comanda`. Antes de implementar, uma sessão de exploração
revisou a spec original contra o schema Prisma e o protótipo e encontrou a
mesma lacuna já resolvida em `clientes`: a spec e o protótipo não definem
exclusão de Paciente de forma consistente com as restrições reais do banco
(`Agendamento.pacienteId` é `Restrict`, `Comanda.pacienteId` é `SetNull`) —
resolvida adotando exclusão lógica, espelhando a decisão já tomada para
`Cliente`. Essa decisão está capturada nesta proposta; outros detalhes de UX
(ex.: seletor de tutor no modal) seguem em aberto e serão fechados durante o
design/implementação.

## What Changes

- Implementa CRUD completo de Paciente (o animal, sempre vinculado a um
  Cliente existente): cadastro, edição, inativação/reativação e listagem em
  grade filtrável por espécie.
- **BREAKING** (em relação à spec original de `pacientes`, que não define
  exclusão): adota exclusão lógica (campo `Paciente.ativo`), mesmo padrão de
  `Cliente`. Inativar um paciente passa a ser sempre permitido,
  independentemente de Agendamentos ou Comandas vinculados — nenhum dado é
  apagado ou desvinculado. Não há exclusão física de paciente no produto.
- Raça dependente da espécie (Cão/Gato/Outro), lista fixa no código com opção
  "Outra"/"Outro" liberando texto livre — reproduz `BREEDS` do protótipo.
- Idade calculada em tempo de exibição a partir da data de nascimento (nunca
  armazenada como campo próprio).
- Observações/alergias destacadas visualmente no card, sem exigir clique
  adicional (informação de segurança clínica).

## Capabilities

### New Capabilities
_Nenhuma — `pacientes` já existe em `openspec/specs/pacientes/spec.md`._

### Modified Capabilities
- `pacientes`: adiciona um Requirement de inativação lógica (a spec original
  não define nenhum comportamento de exclusão).

## Impact

- `prisma/schema.prisma`: `Paciente` ganha o campo `ativo Boolean @default(true)`
  (nova migration).
- `src/app/(dashboard)/pacientes/page.tsx`: implementação real (Server
  Component, substitui o stub atual).
- Novo Client Component de modal de cadastro/edição (segmented
  espécie/sexo/castrado, raça dependente da espécie, seletor de tutor).
- `src/lib/actions/paciente.ts` (novo): Server Actions de criar, editar,
  inativar e reativar Paciente — todas passando por `getClinicaAtual()`.
- Novo teste de isolamento entre clínicas para `Paciente`, replicando o
  padrão já estabelecido em `isolamento-clinica.test.ts`.
- `openspec/specs/pacientes/spec.md`: atualizado por esta change (ver
  `specs/pacientes/spec.md` no delta).
