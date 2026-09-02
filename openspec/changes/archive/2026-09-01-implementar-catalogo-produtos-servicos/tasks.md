## 1. Validação e utilitários

- [x] 1.1 Criar `src/lib/validators/item-catalogo.ts` com o schema Zod de `ItemCatalogo` (nome, categoria SERVICO/PRODUTO, preço, ícone opcional), incluindo a regra de preço numérico e não-negativo; verificar com teste cobrindo o Scenario "Preço inválido" da spec e um cadastro válido completo.

## 2. Server Actions

- [x] 2.1 Criar `src/lib/actions/item-catalogo.ts` com `criarItemCatalogo`, `editarItemCatalogo`, `inativarItemCatalogo`, `reativarItemCatalogo`, todas resolvendo `clinicaId` via `getClinicaAtual()` e validando com o schema da tarefa 1.1; verificar com teste garantindo que nenhuma action aceita ou vaza `clinicaId` fora da sessão ativa.
- [x] 2.2 Implementar `inativarItemCatalogo`/`reativarItemCatalogo` como toggle de `ativo`, sem nenhuma checagem de vínculo com Agendamento/ComandaItem; verificar reproduzindo o Scenario "Inativar item já usado em agendamentos e comandas" (nada é apagado ou desvinculado).

## 3. Listagem de catálogo

- [x] 3.1 Implementar `src/app/(dashboard)/cadastro/page.tsx` como Server Component, listando itens de catálogo ativos da clínica atual (via `getClinicaAtual()`), substituindo o stub atual; ler filtro de categoria e `mostrarInativos` da query string, mesmo padrão de `src/app/(dashboard)/pacientes/page.tsx`; verificar que a listagem reflete o layout de tabela do protótipo (ícone, nome, categoria, preço).
- [x] 3.2 Adicionar filtro por categoria (Todos/Serviços/Produtos) na listagem; verificar manualmente contra o comportamento dos chips `#cadastro .chip[data-cadcat]` em `prototipo.html`.

## 4. Modal de cadastro/edição

- [x] 4.1 Criar Client Component do modal com campos nome, categoria (select Serviço/Produto), preço e ícone (emoji, texto livre opcional), chamando `criarItemCatalogo`/`editarItemCatalogo`; verificar um cadastro válido completo e o Scenario "Preço inválido" bloqueando o submit no client.
- [x] 4.2 Ligar as ações "Inativar"/"Reativar" da listagem às Server Actions correspondentes, com confirmação antes de inativar; verificar manualmente o fluxo completo (cadastrar → inativar → some da listagem padrão → reativar → item reaparece).

## 5. Teste de isolamento entre clínicas

- [x] 5.1 Criar teste de isolamento para o recurso `ItemCatalogo`, replicando o padrão de referência em `src/lib/isolamento-paciente.test.ts` (clínica A não encontra item de catálogo da clínica B por ID direto, e a mesma query com a clínica correta encontra normalmente); verificar que o teste passa com `npm test`.
