## Why

O isolamento multi-tenant foi auditado nesta sessão e está correto — mas
toda a cobertura de teste existente (`isolamento-cliente.test.ts`,
`isolamento-paciente.test.ts`, `isolamento-clinica.test.ts`,
`isolamento-item-catalogo.test.ts`) testa **um model por vez, de forma
isolada**: cria um registro na clínica B, tenta acessar com sessão ativa
na clínica A, confirma que não vaza. Nenhum teste hoje exercita o **fluxo
real e completo** de uma clínica — cadastrar cliente, cadastrar paciente
vinculado, criar agendamento, abrir/editar uma comanda — rodando em
paralelo com outra clínica fazendo a mesma coisa, e confirmando que as
duas trilhas nunca se cruzam do início ao fim. Além disso, `prisma/seed.ts`
hoje só popula **uma** clínica (`Vida Animal`), então não há como explorar
manualmente o app (via `db:seed` + login) e ver duas clínicas lado a lado
com dados realistas — todo teste multi-clínica manual exige criar a
segunda clínica na mão.

## What Changes

- `prisma/seed.ts` ganha uma segunda clínica seedada (cliente, paciente,
  item de catálogo, agendamento, comanda próprios), permitindo login e
  troca de clínica pela UI com dados reais dos dois lados desde o
  primeiro `npm run db:seed`.
- Novo teste de integração (`src/lib/isolamento-fluxo-completo.test.ts` ou
  nome equivalente) que roda o fluxo completo — criar cliente → criar
  paciente → criar agendamento → abrir comanda → adicionar item — para
  duas clínicas ao mesmo tempo (intercalando chamadas, não sequencialmente
  clínica A e depois clínica B), e verifica ao final que cada clínica só
  enxerga os próprios registros em cada uma dessas quatro capabilities.
- Nenhuma mudança de comportamento do produto — é cobertura de teste e
  dado de seed sobre um comportamento que já existe e já foi auditado
  como correto (ver conversa desta sessão). Por isso não há capability
  nova nem requirement modificado: `skip_specs: true` neste change (ver
  `.openspec.yaml`).

## Capabilities

### New Capabilities

(nenhuma — mudança de teste/seed, sem capability nova)

### Modified Capabilities

(nenhuma — nenhum requirement de nenhuma spec muda; o comportamento
testado já é o comportamento especificado hoje)

## Impact

- `prisma/seed.ts` — segunda clínica + dados relacionados.
- Novo arquivo de teste de integração multi-clínica (local exato definido
  em `design.md`).
- Sem migração de schema, sem mudança de rota/action/UI.
