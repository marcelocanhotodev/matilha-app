## 1. Schema: tamanho de página por clínica

- [x] 1.1 Adicionar `Clinica.itensPorPaginaHistorico Int @default(10)` ao `prisma/schema.prisma` (comentário apontando pro design.md — sem tela de configuração, valor editado direto no banco) e rodar `npx prisma migrate dev --name add_itens_por_pagina_historico`; verificar que a migration é aplicada sem erro.

## 2. Consultas de histórico (`src/lib/historico.ts`)

- [x] 2.1 Criar `buscarComandaFinalizada(id: number, clinicaId: number)` — `findFirst` com `id, clinicaId, status: "FINALIZADA"`, incluindo `paciente`, `cliente`, `veterinario`, `agendamento`, `itens`; retorna `null` se não encontrar. Cobrir com teste vitest (`historico.test.ts`, mesmo padrão dos `isolamento-*.test.ts`): id de outra clínica → null; id de comanda `ABERTA`/`CANCELADA` → null; id certo da clínica → objeto com os itens.
- [x] 2.2 Criar `listarHistorico(clinicaId, { page, porPagina })` — comandas da página (`skip`/`take`, `orderBy: { criadoEm: "desc" }`), retornando os itens da página + `totalPaginas` (via `count()`). Testar: ordem cronológica reversa; tamanho de página respeitado; página além do total retorna lista vazia sem erro.
- [x] 2.3 Criar `totaisHistorico(clinicaId)` — arrecadado, quantidade, ticket médio e forma de pagamento mais frequente (por contagem de comandas, não soma de valor) sobre **todas** as finalizadas, sem paginação. Testar: nenhuma comanda finalizada → tudo zero/null; caso com dado real bate a conta; critério de desempate entre formas de pagamento definido e coberto.

## 3. Tela de listagem `/historico`

- [x] 3.1 Implementar `src/app/(dashboard)/historico/page.tsx`: resolve `clinicaId` (`getClinicaAtual()`) + `itensPorPaginaHistorico` da `Clinica`, lê `searchParams.page` (default 1), chama `listarHistorico`/`totaisHistorico`, renderiza os 4 cards de totais + tabela (Horário, Pet/Tutor, Pagamento, Total — sem itens) + navegação `?page=N`; cada linha linka para `/historico/[id]`.
- [x] 3.2 Estado vazio: nenhuma comanda finalizada → cards zerados + mensagem de lista vazia (Requirement "Nenhuma comanda finalizada ainda"), sem erro nem tela em branco.

## 4. Tela de detalhes `/historico/[id]`

- [x] 4.1 Implementar `src/app/(dashboard)/historico/[id]/page.tsx`: valida `params.id` como inteiro (não numérico → `notFound()`), chama `buscarComandaFinalizada`, `notFound()` se `null`.
- [x] 4.2 Renderizar: data/hora, pet/tutor/veterinário(a) (com "—" quando ausente), origem (agendamento vinculado com horário, ou "atendimento avulso"), tabela de itens (nome, quantidade, preço unitário, subtotal), subtotal/desconto/total, forma de pagamento, link "voltar ao histórico".

## 5. Verificação

- [x] 5.1 `npx tsc --noEmit` e `npx vitest run` limpos.
- [x] 5.2 `openspec validate implementar-historico --strict`.
- [x] 5.3 Teste manual no navegador: gerar comandas finalizadas suficientes (ou ajustar `itensPorPaginaHistorico` via pgAdmin para um número pequeno) para exercitar a paginação de verdade; abrir o detalhe de uma comanda; tentar acessar via URL direta o detalhe de uma comanda de outra clínica e de uma comanda `ABERTA`/`CANCELADA`, confirmando 404 nos dois casos.
