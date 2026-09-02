## 1. Schema e migração

- [x] 1.1 Adicionar `ItemCatalogo.duracaoPadraoMinutos Int?` a
      `prisma/schema.prisma`; rodar `npx prisma migrate dev --name
      add-item-catalogo-duracao-padrao` e verificar que a migration é
      criada e aplicada sem erro, sem backfill (itens existentes nascem com
      `null`).

## 2. Infraestrutura do combobox reutilizável

- [x] 2.1 Instalar `@radix-ui/react-popover`, `cmdk`, `clsx`,
      `tailwind-merge`; criar `src/lib/utils.ts` com `cn()` (clsx +
      tailwind-merge); verificar que `npx tsc --noEmit` continua limpo.
- [x] 2.2 Gerar/copiar `popover.tsx` e `command.tsx` para
      `src/components/`, repintando as classes semânticas padrão do shadcn
      (`bg-popover`, `text-foreground`, `border-input`, etc.) para as
      classes literais da paleta já existente (`bg-white`, `text-pine-900`,
      `border-sage-300`) — nenhuma CSS variable nova em `globals.css`
      (design.md, Decisão 5). Verificação visual adiada para quando o
      combobox for integrado num formulário real (tarefas 5/7), em vez de
      uma página de teste descartável.
- [x] 2.3 Criar `src/components/combobox.tsx`: componente genérico
      (`options: { value, label, sublabel? }[]`, `value`, `onChange`,
      `placeholder?`, `disabled?`), filtro client-side por `label` +
      `sublabel`, navegação por teclado (setas, enter, esc) via `cmdk`,
      fecha ao selecionar. Verificação visual adiada junto com a 2.2.

## 3. Catálogo — duração por serviço

- [x] 3.1 Adicionar `duracaoPadraoMinutos` a
      `src/lib/validators/item-catalogo.ts`: opcional, mas se presente
      inteiro positivo (rejeita zero/negativo/não numérico), e SHALL ser
      ignorado/limpo quando `categoria !== "SERVICO"`. Verificar
      reproduzindo os Scenarios "Duração padrão de um serviço", "Duração
      não se aplica a produto" e "Duração padrão inválida".
- [x] 3.2 Propagar `duracaoPadraoMinutos` em `criarItemCatalogo`/
      `editarItemCatalogo` (`src/lib/actions/item-catalogo.ts`), mesmo
      padrão de `paraDadosPrisma` já usado para os outros campos.
      Verificar com teste cobrindo criar um serviço com duração e um
      produto (duração sempre `null` neste último, mesmo se enviada).
- [x] 3.3 No modal de cadastro (`item-catalogo-modal.tsx`), exibir o campo
      de duração (minutos) só quando `categoria === "SERVICO"` — mesmo
      padrão condicional já usado para "raça depende da espécie" no modal
      de Paciente; trocar para "produto" limpa o valor do campo. Verificar
      manualmente alternando a categoria no formulário.
- [x] 3.4 Adicionar a coluna "Duração" à tabela de cadastro
      (`catalogo-table.tsx`), depois de "Preço", mostrando "—" para itens
      sem duração configurada (produtos, ou serviços sem valor definido).
      Verificar visualmente com pelo menos um serviço e um produto na
      listagem.
- [x] 3.5 Definir duração de exemplo para os 3 serviços já seedados em
      `prisma/seed.ts` (Consulta de rotina: 30 min; Vacinação (V10): 15
      min; Banho e tosa: 90 min) — os 2 produtos permanecem sem duração.
      Verificar rodando `npm run db:seed` e conferindo os valores no banco.

## 4. Agendamento — consultas e Server Actions

- [x] 4.1 Criar `src/lib/validators/agendamento.ts` com o schema Zod de
      criação de agendamento (`pacienteId`, `veterinarioId`,
      `itemCatalogoId` opcional, `dataHoraInicio`, `duracaoMinutos` inteiro
      positivo, `ignorarConflito` booleano opcional); verificar com teste
      cobrindo duração inválida rejeitada.
- [x] 4.2 Adicionar `criarAgendamento(dadosBrutos)` a
      `src/lib/actions/agendamento.ts`: resolve `clinicaId` via
      `getClinicaAtual()`, valida o paciente/veterinário pertencem à
      clínica ativa, busca agendamentos do mesmo `veterinarioId` no mesmo
      dia com `status` diferente de `CANCELADO`, filtra sobreposição de
      intervalo `[dataHoraInicio, dataHoraInicio+duracaoMinutos)` em JS;
      se houver conflito e `ignorarConflito` não for `true`, retorna
      `{ ok: false, conflito: [...] }` (detalhes de cada agendamento
      conflitante — horário e nome do paciente) sem criar nada. Verificar
      reproduzindo os Scenarios "Conflito de horário para o mesmo
      profissional" e "Agendamento cancelado não conta como conflito".
- [x] 4.3 Em `criarAgendamento`, quando não há conflito (ou
      `ignorarConflito: true`), cria o agendamento; se `itemCatalogoId`
      foi informado e o item tem `duracaoPadraoMinutos`, isso já veio
      pré-preenchido do client (tarefa 5.2) — a action grava
      `duracaoMinutos` como recebido, sempre. Verificar reproduzindo o
      Scenario "Confirmar mesmo com conflito" (segunda chamada com
      `ignorarConflito: true` cria normalmente).
- [x] 4.4 Criar a consulta "usuários da clínica ativa" (inline no Server
      Component da tarefa 6.1, via `prisma.usuarioClinica.findMany({
      where: { clinicaId }, include: { usuario: { select: { id, nome } } }
      })`, sem filtro de `papel` — design.md, Decisão 4). Verificar que a
      lista inclui o usuário seedado (`ADMIN`).

## 5. Agendamento — formulário de criação

- [x] 5.1 Criar o formulário de novo agendamento (Client Component):
      combobox de paciente (via `src/components/combobox.tsx`, mostrando
      "nome do pet — nome do tutor"), `<select>` simples de veterinário,
      `<select>` de serviço (itens de catálogo ativos), campos de data e
      horário, campo de duração. Verificar manualmente que o combobox
      filtra ao digitar e fecha ao selecionar.
- [x] 5.2 Selecionar um serviço com `duracaoPadraoMinutos` pré-preenche o
      campo de duração, que continua editável; verificar reproduzindo o
      Scenario "Duração pré-preenchida a partir do serviço".
- [x] 5.3 Ao submeter, chama `criarAgendamento`; se a resposta tiver
      `conflito`, exibe o aviso inline (horário e paciente de cada
      conflito) e troca o texto do botão para algo como "Salvar mesmo
      assim"; um novo clique reenvia com `ignorarConflito: true`. Sem
      modal novo — o próprio formulário muda de estado (design.md, Decisão
      6). Verificar o fluxo completo: criar um conflito de propósito,
      confirmar mesmo assim, ver os dois agendamentos na grade.

## 6. Agendamento — grade semanal

- [x] 6.1 Implementar `src/app/(dashboard)/agenda/page.tsx` como Server
      Component, substituindo o stub atual: lê `?semana=` da query string
      (default: semana atual calculada de verdade), busca os agendamentos
      da clínica ativa nesse intervalo (segunda a sexta), os pacientes
      ativos, os usuários da clínica (tarefa 4.4) e os itens de catálogo
      ativos; passa tudo para o Client Component da grade. Verificar que a
      página carrega sem erro com a semana atual.
- [x] 6.2 Implementar a grade (Client Component): colunas
      segunda-sexta, linhas 8h-18h, agendamentos posicionados por
      `top`/`height` a partir de `dataHoraInicio`/`duracaoMinutos` (mesma
      matemática do protótipo), coloridos por espécie do paciente
      (reaproveitar `SPECIES_META` já usado em `pacientes-grid.tsx`).
      Verificar visualmente comparando com a seção `#agenda` do protótipo.
- [x] 6.3 Clique numa célula vazia abre o formulário de novo agendamento
      (tarefa 5.1) com data e horário pré-preenchidos a partir da célula;
      clique num agendamento existente não faz nada além de um `title`
      com os detalhes. Verificar reproduzindo os Scenarios "Clique em
      horário vazio" e "Clique em agendamento existente não abre edição".
- [x] 6.4 Links "Semana anterior"/"Próxima semana" (`<a href="?semana=...">`
      com a data ±7 dias, sem JS); verificar reproduzindo o Scenario
      "Navegação entre semanas" — navegar, conferir que os agendamentos
      exibidos mudam para os da semana correspondente.

## 7. Retrofit — seletor de tutor em Paciente

- [x] 7.1 Trocar o `<select>` de tutor em
      `src/app/(dashboard)/pacientes/paciente-modal.tsx` pelo
      `src/components/combobox.tsx` (mesma lista de `clientesAtivos` já
      recebida via prop, sem mudança de query) — fecha o Open Question
      deixado em `implementar-pacientes/design.md`. Verificar que
      cadastrar um novo paciente com o combobox continua funcionando
      (mesmo fluxo de antes, só a interação de seleção muda).

## 8. Verificação final

- [x] 8.1 Rodar `npx tsc --noEmit`, `npm run build` e a suíte de testes
      completa (`npx vitest run`); confirmar que passam sem erros novos
      introduzidos por este change.
- [x] 8.2 Revisar cada scenario dos dois deltas
      (`specs/agendamento/spec.md`, `specs/catalogo-produtos-servicos/
      spec.md`) manualmente contra a UI implementada, incluindo o fluxo
      completo: cadastrar um serviço com duração → criar um agendamento
      selecionando esse serviço (duração pré-preenchida) → criar um
      segundo agendamento conflitante para o mesmo profissional →
      confirmar mesmo assim → navegar entre semanas → conferir que ambos
      aparecem na grade, posicionados e coloridos corretamente. Verificado
      ao vivo logado como `ana@vidaanimal.com.br`: grade semanal com dados
      reais (posicionamento e cor por espécie corretos, "hoje" destacado na
      data real), navegação de semana via `?semana=`, clique em célula
      vazia pré-preenchendo data/hora, combobox de paciente filtrando por
      pet+tutor em tempo real, duração pré-preenchida ao escolher um
      serviço (30 min para "Consulta de rotina"), fluxo completo de
      conflito (aviso "Esse horário conflita com: Rex (09:00–09:30)",
      botão vira "Salvar mesmo assim", confirma e cria os dois
      agendamentos sobrepostos — conferido também direto no banco), coluna
      "Duração" e campo condicional no cadastro (aparece só para Serviço,
      some e limpa ao trocar para Produto), e o retrofit do combobox de
      tutor no modal de Paciente. Nenhum erro no console.
