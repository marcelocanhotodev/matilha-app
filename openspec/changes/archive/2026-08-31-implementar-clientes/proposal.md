## Why

`clientes` é a próxima capability na ordem sugerida de implementação (depende
apenas de `autenticacao-multi-clinica`, já concluída) e é pré-requisito direto
de `pacientes`, `agendamento` e `atendimento-comanda`. Antes de implementar,
uma sessão de exploração revisou a spec original contra o schema Prisma e o
protótipo e encontrou uma lacuna de integridade de dado (a regra de exclusão
bloqueada cobria só `Paciente`, não `Comanda`) — resolvida adotando exclusão
lógica em vez de física, o que elimina a lacuna por completo em vez de só
fechá-la. Essa e outras decisões de formato/escopo tomadas na exploração estão
capturadas nesta proposta.

## What Changes

- Implementa CRUD completo de Cliente (pessoa física ou jurídica): cadastro,
  edição, inativação/reativação e listagem.
- Validação de CPF/CNPJ por dígito verificador e de e-mail (formato),
  client-side (feedback imediato) e server-side (nunca confiar só no client).
- **BREAKING** (em relação à spec original de `clientes`): substitui exclusão
  física condicionalmente bloqueada por exclusão lógica (campo `Cliente.ativo`).
  Inativar um cliente passa a ser sempre permitido, independentemente de
  Pacientes ou Comandas vinculados — nenhum dado é apagado ou desvinculado.
  Não há mais exclusão física no produto.
- CPF, CNPJ e celular são persistidos normalizados (somente dígitos); máscara
  de exibição/digitação fica inteiramente no client.
- Preenchimento automático de endereço por CEP (ViaCEP), acionado via Server
  Action/Route Handler (nunca fetch direto do client para serviço externo).
  Falha ou CEP não encontrado nunca bloqueia o cadastro.
- Listagem de clientes ganha busca simples (nome/CPF/CNPJ) e coluna com
  contagem de pacientes vinculados. As colunas "Última visita" e "Total
  gasto" do protótipo ficam fora de escopo — dependem de dado que só existe
  depois de `atendimento-comanda`/`historico-financeiro`.
- Teste de isolamento entre clínicas para o recurso `Cliente`, replicando o
  padrão de referência já estabelecido em `isolamento-clinica.test.ts`.

## Capabilities

### New Capabilities
_Nenhuma — `clientes` já existe em `openspec/specs/clientes/spec.md`._

### Modified Capabilities
- `clientes`: substitui o Requirement "Exclusão bloqueada quando há
  pacientes vinculados" por um Requirement de inativação lógica; adiciona
  Requirements de busca na listagem, de listagem com contagem de pacientes, e
  formaliza a normalização de CPF/CNPJ/celular para dígitos puros na
  persistência.

## Impact

- `prisma/schema.prisma`: `Cliente` ganha o campo `ativo Boolean @default(true)`
  (nova migration).
- `src/app/(dashboard)/clientes/page.tsx`: implementação real (Server
  Component com busca via query string, lista paginação-free por ora).
- Novo Client Component de modal de cadastro/edição (segmented física/
  jurídica, máscaras de CPF/CNPJ/celular, integração com o endpoint de CEP).
- `src/lib/actions/cliente.ts` (novo): Server Actions de criar, editar,
  inativar e reativar Cliente — todas passando por `getClinicaAtual()`.
- `src/lib/validators/cpf-cnpj.ts` (novo): validação de dígito verificador e
  normalização de CPF/CNPJ, reutilizável por outras capabilities/telas.
- Endpoint de proxy para ViaCEP (Server Action ou Route Handler dedicado).
- Novo teste de isolamento entre clínicas para `Cliente`.
- `openspec/specs/clientes/spec.md`: atualizado por esta change (ver
  `specs/clientes/spec.md` no delta).
