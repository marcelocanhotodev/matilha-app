## 1. Schema e dados

- [x] 1.1 Adicionar `ativo Boolean @default(true)` ao model `Cliente` em `prisma/schema.prisma` e rodar `npx prisma migrate dev --name add-cliente-ativo`; verificar que a migration é criada e `npx prisma validate` passa.
- [x] 1.2 Atualizar `prisma/seed.ts` para gravar CPF/CNPJ/celular já normalizados (dígitos puros); verificar rodando `npm run db:seed` e conferindo os valores gravados (via `prisma studio` ou query direta).

## 2. Validação e normalização

- [x] 2.1 Criar `src/lib/validators/cpf-cnpj.ts` com validação de dígito verificador (CPF e CNPJ) e normalização (strip de não-dígitos); cobrir com testes unitários incluindo CPF/CNPJ válidos, dígito verificador inválido, e entrada já mascarada.
- [x] 2.2 Criar validação de formato de e-mail (Zod); verificar com teste unitário cobrindo formato inválido.
- [x] 2.3 Criar schema Zod de Cliente (física/jurídica) combinando as validações acima, usado tanto no client (feedback imediato) quanto na Server Action; verificar com teste cobrindo os cenários da spec original (CPF inválido rejeita, e-mail inválido rejeita, tipo física vs jurídica exige campos distintos).

## 3. Server Actions

- [x] 3.1 Criar `src/lib/actions/cliente.ts` com `criarCliente`, `editarCliente`, `inativarCliente`, `reativarCliente`, todas resolvendo `clinicaId` via `getClinicaAtual()` e validando com o schema da tarefa 2.3; verificar com teste garantindo que nenhuma action aceita ou vaza `clinicaId` fora da sessão ativa.
- [x] 3.2 Implementar detecção de duplicidade de CPF/CNPJ (comparando valores normalizados) em `criarCliente`, retornando erro claro em vez de deixar estourar a constraint do Postgres; verificar reproduzindo o Scenario "Tentativa de cadastro com CPF já existente em formatação diferente".
- [x] 3.3 Implementar `inativarCliente`/`reativarCliente` como toggle de `ativo`, sem nenhuma checagem de vínculo com Paciente/Comanda; verificar reproduzindo o Scenario "Inativar cliente com pacientes e comandas vinculados" (nada é apagado ou desvinculado).

## 4. Integração CEP

- [x] 4.1 Criar Server Action/Route Handler que recebe um CEP e retorna o endereço do ViaCEP (ou erro/vazio); verificar com teste cobrindo CEP válido e CEP inexistente (mock do fetch), conforme os dois Scenarios da Requirement "Endereço com preenchimento automático por CEP".
- [x] 4.2 No Client Component do modal, acionar essa busca ao sair do campo CEP, preenchendo logradouro/bairro/cidade/UF sem sobrescrever campos já editados manualmente pelo usuário desde a última busca; verificar manualmente contra o comportamento de `#cli-cep` em `prototipo.html`.

## 5. Listagem de clientes

- [x] 5.1 Implementar `src/app/(dashboard)/clientes/page.tsx` como Server Component, listando clientes ativos da clínica atual (via `getClinicaAtual()`) com contagem de pacientes vinculados (`_count`); verificar que a tabela reflete o layout do protótipo (Tutor | Documento | Contato | Pets | Ações).
- [x] 5.2 Adicionar campo de busca por nome/CPF/CNPJ (normalizando a query antes de filtrar) via query string; verificar reproduzindo os Scenarios "Busca por nome parcial" e "Busca por documento com ou sem máscara".
- [x] 5.3 Adicionar alternância para exibir clientes inativos na listagem; verificar reproduzindo o Scenario "Alternar para ver clientes inativos".

## 6. Modal de cadastro/edição

- [x] 6.1 Criar Client Component do modal com segmented física/jurídica, campos e máscaras (`maskCPF`/`maskCNPJ`/`maskCelular` portadas do protótipo), chamando `criarCliente`/`editarCliente`; verificar reproduzindo os Scenarios de cadastro válido de pessoa física e jurídica da spec original.
- [x] 6.2 Ligar as ações "Inativar"/"Reativar" da listagem às Server Actions correspondentes, com confirmação antes de inativar; verificar manualmente o fluxo completo (cadastrar → inativar → reativar → cliente reaparece na listagem padrão).

## 7. Teste de isolamento entre clínicas

- [x] 7.1 Criar teste de isolamento para o recurso `Cliente`, replicando o padrão de referência em `src/lib/isolamento-clinica.test.ts` (clínica A não encontra Cliente da clínica B por ID direto, e a mesma query com a clínica correta encontra normalmente); verificar que o teste passa com `npm test`.
