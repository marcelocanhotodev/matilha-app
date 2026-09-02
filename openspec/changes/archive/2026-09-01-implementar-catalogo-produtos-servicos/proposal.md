## Why

`catalogo-produtos-servicos` é a próxima capability na ordem sugerida de
implementação (`openspec/project.md`), sem dependências pendentes — o model
`ItemCatalogo` já existe no schema desde o início do projeto. Antes de
implementar, uma sessão de exploração revisou a spec original contra o
schema Prisma, o protótipo e o padrão já consolidado em `clientes` e
`pacientes`, e encontrou a mesma lacuna já resolvida nessas duas
capabilities: a spec fala em "excluir" um item de catálogo, mas o schema
(`ItemCatalogo.ativo Boolean @default(true)`) já foi provisionado para
exclusão lógica, nunca física. Essa decisão é capturada nesta proposta,
alinhando a linguagem da spec ao que o produto já faz em toda parte.

## What Changes

- Implementa CRUD completo de `ItemCatalogo` (serviço ou produto vendável
  pela clínica): cadastro, edição, inativação/reativação e listagem em grade
  filtrável por categoria (Todos/Serviços/Produtos).
- **BREAKING** (em relação à spec original de `catalogo-produtos-servicos`,
  que fala em "excluir"): adota exclusão lógica (campo `ItemCatalogo.ativo`,
  já existente no schema, sem necessidade de migration), mesmo padrão de
  `Cliente`/`Paciente`. Inativar um item passa a ser sempre permitido,
  independentemente de haver Agendamentos ou itens de Comanda vinculados —
  nenhum dado é apagado ou desvinculado (o snapshot em `ComandaItem` já
  garante que vendas passadas não mudam). Não há exclusão física de item de
  catálogo no produto.
- Cadastro/edição em modal (Client Component), mesmo padrão de interação já
  consolidado em `pacientes`/`clientes` — não o painel inline desenhado no
  protótipo (`openspec/reference/prototipo.html`, seção `#cadastro`).
- Categoria (Serviço/Produto) e ícone (emoji) seguem o protótipo; preço
  validado como numérico não-negativo, client e server-side.

## Capabilities

### New Capabilities
_Nenhuma — `catalogo-produtos-servicos` já existe em
`openspec/specs/catalogo-produtos-servicos/spec.md`._

### Modified Capabilities
- `catalogo-produtos-servicos`: substitui a exclusão física implícita no
  Requirement de CRUD por um Requirement de inativação lógica, com os
  mesmos cenários já estabelecidos em `clientes`/`pacientes` (listagem
  padrão oculta inativos, alternância para ver inativos, reativação).

## Impact

- `prisma/schema.prisma`: nenhuma mudança — `ItemCatalogo.ativo` já existe.
- `src/app/(dashboard)/cadastro/page.tsx`: implementação real (Server
  Component, substitui o stub atual).
- Novo Client Component de modal de cadastro/edição (nome, categoria,
  preço, ícone).
- `src/lib/validators/item-catalogo.ts` (novo): schema Zod de
  `ItemCatalogo`, mesmo padrão de `src/lib/validators/paciente.ts`.
- `src/lib/actions/item-catalogo.ts` (novo): Server Actions de criar,
  editar, inativar e reativar item de catálogo — todas passando por
  `getClinicaAtual()`.
- Novo teste de isolamento entre clínicas para `ItemCatalogo`, replicando o
  padrão já estabelecido em `isolamento-paciente.test.ts`.
- `openspec/specs/catalogo-produtos-servicos/spec.md`: atualizado por esta
  change (ver `specs/catalogo-produtos-servicos/spec.md` no delta).
