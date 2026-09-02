## 1. Schema e dados

- [x] 1.1 Adicionar `ativo Boolean @default(true)` ao model `Paciente` em `prisma/schema.prisma` e rodar `npx prisma migrate dev --name add-paciente-ativo`; verificar que a migration é criada e `npx prisma validate` passa.

## 2. Validação e utilitários

- [x] 2.1 Criar `src/lib/format/idade.ts` com a função de cálculo de idade a partir da data de nascimento (meses se menor que 1 ano; anos e meses caso contrário), portada de `calcIdadeLabel` do protótipo; cobrir com teste unitário incluindo idade em meses, idade em anos exatos e idade em anos+meses.
- [x] 2.2 Criar `src/lib/validators/paciente.ts` com o schema Zod de Paciente (nome, espécie, raça, sexo, nascimento opcional, peso, cor, porte, castrado, microchip opcional, observações), incluindo a regra de peso > 0; verificar com teste cobrindo o Scenario "Peso inválido" da spec original e um cadastro válido completo.
- [x] 2.3 Definir a lista `BREEDS` por espécie (Cão/Gato/Outro, cada uma terminando em "Outra"/"Outro") como constante compartilhada entre modal e validação, portada de `openspec/reference/prototipo.html`; verificar que trocar a espécie no formulário recarrega a lista de raças correspondente (Scenario "Troca de espécie após já ter escolhido raça").

## 3. Server Actions

- [x] 3.1 Criar `src/lib/actions/paciente.ts` com `criarPaciente`, `editarPaciente`, `inativarPaciente`, `reativarPaciente`, todas resolvendo `clinicaId` via `getClinicaAtual()` e validando com o schema da tarefa 2.2; verificar com teste garantindo que nenhuma action aceita ou vaza `clinicaId` fora da sessão ativa.
- [x] 3.2 Em `criarPaciente`/`editarPaciente`, validar que o `clienteId` informado pertence a um Cliente existente e ativo da mesma clínica antes de gravar; verificar reproduzindo o Scenario "Nenhum cliente cadastrado ainda" (não é possível criar um paciente "órfão").
- [x] 3.3 Implementar `inativarPaciente`/`reativarPaciente` como toggle de `ativo`, sem nenhuma checagem de vínculo com Agendamento/Comanda; verificar reproduzindo o Scenario "Inativar paciente com agendamentos e comandas vinculados" (nada é apagado ou desvinculado).

## 4. Grade de pacientes

- [x] 4.1 Implementar `src/app/(dashboard)/pacientes/page.tsx` como Server Component, listando pacientes ativos da clínica atual (via `getClinicaAtual()`) em grade de cards, substituindo o stub atual; verificar que o card reflete o layout do protótipo (avatar por espécie, nome, raça + idade, specs físicas, observação destacada, tutor).
- [x] 4.2 Adicionar filtro por espécie (Todos/Cães/Gatos/Outros) na grade; verificar manualmente contra o comportamento dos chips `#pacientes .chip` em `prototipo.html`.
- [x] 4.3 Exibir observações/alergias destacadas visualmente no card quando preenchidas, sem exigir clique adicional; verificar reproduzindo o Scenario "Observações visíveis no card".

## 5. Modal de cadastro/edição

- [x] 5.1 Criar Client Component do modal com seletor de tutor (`<select>` com clientes ativos da clínica), segmented de espécie/sexo/castrado, raça dependente da espécie (tarefa 2.3) e campo de data de nascimento com idade calculada em tempo real (tarefa 2.1), chamando `criarPaciente`/`editarPaciente`; verificar reproduzindo o Scenario "Exibição da idade" e um cadastro válido completo.
- [x] 5.2 Ligar as ações "Inativar"/"Reativar" do card às Server Actions correspondentes, com confirmação antes de inativar; verificar manualmente o fluxo completo (cadastrar → inativar → some da grade padrão → reativar → paciente reaparece).

## 6. Teste de isolamento entre clínicas

- [x] 6.1 Criar teste de isolamento para o recurso `Paciente`, replicando o padrão de referência em `src/lib/isolamento-clinica.test.ts` (clínica A não encontra Paciente da clínica B por ID direto, e a mesma query com a clínica correta encontra normalmente); verificar que o teste passa com `npm test`.
