## 1. Schema e migração

- [x] 1.1 Adicionar `enum StatusComanda { ABERTA FINALIZADA CANCELADA }`,
      `Comanda.status StatusComanda @default(ABERTA)` e
      `Comanda.motivoCancelamento String? @db.Text` a `prisma/schema.prisma`;
      verificar `npx prisma validate`.
- [x] 1.2 Tornar `Comanda.formaPagamento` opcional (`FormaPagamento?`) no
      mesmo schema; rodar `npx prisma migrate dev --name
      add-comanda-status-motivo` e verificar que a migration é criada sem
      erro e `npx prisma migrate status` fica limpo.

## 2. Validação e utilitários

- [x] 2.1 Criar `src/lib/validators/comanda.ts` com o schema Zod do item do
      carrinho (`itemCatalogoId`, `quantidade` > 0), do desconto (`tipo:
      "PERCENTUAL" | "FIXO"`, `valor` >= 0) e do motivo de descarte (string
      não-vazia); cobrir com teste unitário incluindo desconto negativo
      rejeitado e motivo vazio rejeitado.
- [x] 2.2 Criar a função de cálculo de total (`subtotal - desconto`, nunca
      negativo) em `src/lib/validators/comanda.ts` ou módulo próprio;
      testar reproduzindo o Scenario "Desconto maior que o subtotal" da
      spec original (desconto R$ 80 sobre subtotal R$ 50 → total R$ 0).

## 3. Server Actions — ciclo de vida da comanda

- [x] 3.1 Criar `src/lib/actions/comanda.ts` com `adicionarItem(dados)`:
      resolve `clinicaId` via `getClinicaAtual()`; se não existir comanda
      "aberta" para o `agendamentoId` informado (ou para a sessão avulsa),
      cria uma (`status: ABERTA`); se já existir, reaproveita via `upsert`
      por `agendamentoId` (nunca cria uma segunda comanda para o mesmo
      agendamento — Requirement: Retomar comanda aberta). Verificar com
      teste cobrindo os Scenarios "Primeiro item cria a comanda" e "Reabrir
      agendamento com comanda aberta no mesmo dia".
- [x] 3.2 Em `adicionarItem`, se o item de catálogo já estiver na comanda,
      incrementar a quantidade existente em vez de criar uma linha
      duplicada, e sempre copiar `nomeSnapshot`/`precoSnapshot` do catálogo
      no momento da chamada (nunca referência viva); verificar reproduzindo
      os Scenarios "Adicionar item já presente na comanda" (spec original)
      e "Preço do item é copiado no momento da adição".
- [x] 3.3 Adicionar `removerItem`, `alterarQuantidade` e `aplicarDesconto`
      a `src/lib/actions/comanda.ts`, todas recalculando `subtotal`/`total`
      da comanda a cada chamada, reaproveitando o cálculo da tarefa 2.2;
      verificar com teste que `total` nunca fica negativo mesmo após
      múltiplas chamadas.
- [x] 3.4 Toda action desta seção SHALL rejeitar a operação se a comanda
      alvo não estiver com `status: ABERTA` (Requirement: Imutabilidade de
      comanda finalizada ou cancelada); verificar com teste reproduzindo o
      Scenario "Tentativa de alterar comanda já finalizada".

## 4. Server Actions — finalizar e descartar

- [x] 4.1 Adicionar `finalizarComanda(comandaId, formaPagamento)` a
      `src/lib/actions/comanda.ts`: bloqueia se a comanda estiver vazia
      (Scenario "Finalizar sem itens"), senão grava `formaPagamento`,
      transiciona `status: FINALIZADA`, e marca `Agendamento.status =
      CONCLUIDO` quando houver `agendamentoId` vinculado (numa
      `prisma.$transaction`, para as duas escritas serem atômicas).
      Verificar reproduzindo o Scenario "Finalizar comanda conclui o
      agendamento" (spec de `agendamento`).
- [x] 4.2 Adicionar `descartarComanda(comandaId, motivo)`: rejeita se
      `motivo` for vazio (Scenario "Descartar sem motivo"), senão grava
      `motivoCancelamento`, transiciona `status: CANCELADA`, e marca
      `Agendamento.status = CANCELADO` quando houver `agendamentoId`
      vinculado (mesma transação atômica da tarefa 4.1). Verificar
      reproduzindo os Scenarios "Descartar comanda vinculada a um
      agendamento" e "Descartar comanda avulsa".
- [x] 4.3 `finalizarComanda`/`descartarComanda` SHALL rejeitar comandas que
      já não estão `ABERTA` (mesma trava da tarefa 3.4); verificar
      reproduzindo o Scenario "Tentativa de descartar comanda já
      finalizada".

## 5. Server Action — transição de status do agendamento

- [x] 5.1 Criar `src/lib/actions/agendamento.ts` com
      `selecionarAgendamento(agendamentoId)`: transiciona
      `Agendamento.status` de `AGUARDANDO` para `EM_ATENDIMENTO`; se o
      status já for `CONCLUIDO` ou `CANCELADO`, não faz nada (nunca
      regride). Verificar reproduzindo os Scenarios "Selecionar na fila
      inicia o atendimento" e "Selecionar agendamento já concluído ou
      cancelado não regride o status".

## 6. Tela de atendimento — fila do dia e catálogo

- [x] 6.1 Implementar `src/app/(dashboard)/atendimento/page.tsx` como
      Server Component, substituindo o stub atual: busca os agendamentos
      do dia corrente da clínica ativa (via `getClinicaAtual()`), os itens
      de catálogo ativos (`ativo: true` — não esquecer, é o alerta deixado
      em `implementar-catalogo-produtos-servicos/design.md`), e passa tudo
      para um Client Component de workspace. Verificar que a fila mostra
      horário, paciente e status de cada agendamento (Requirement: Fila de
      agendamentos do dia).
- [x] 6.2 No Client Component do workspace, selecionar um card da fila
      chama `selecionarAgendamento` (tarefa 5.1) e, se existir serviço
      previsto no agendamento (`itemCatalogoId`) presente no catálogo,
      oferece adicioná-lo com um clique; verificar reproduzindo o Scenario
      "Selecionar agendamento existente". A opção "avulso" SHALL sempre
      existir na fila.
- [x] 6.3 Grade de catálogo (serviços/produtos) com filtro por categoria,
      cada item chamando `adicionarItem` (tarefa 3.1) ao clicar; verificar
      manualmente contra `#atendimento .catalog-grid` do protótipo.

## 7. Tela de atendimento — carrinho e autosave

- [x] 7.1 Painel do carrinho (Client Component) exibindo itens, stepper de
      quantidade, subtotal/total em tempo real e campo de desconto
      (percentual ou fixo); toda mudança chama a Server Action
      correspondente (tarefa 3.3) com debounce de ~10s, exceto o primeiro
      item da comanda, que grava imediatamente (Decisão 3 do design.md).
      Verificar manualmente que o subtotal recalcula na hora no client,
      mesmo antes do autosave disparar.
- [x] 7.2 Botão "Finalizar" com seletor de forma de pagamento, chamando
      `finalizarComanda` (tarefa 4.1); verificar o fluxo completo
      (adicionar item → finalizar → comanda finalizada, agendamento
      concluído se vinculado).

## 8. Tela de atendimento — comandas em aberto e descarte

- [x] 8.1 Query (Server Component) para toda comanda `ABERTA` da clínica
      ativa que não pertence à fila de hoje (agendamento de outro dia, ou
      avulsa); seção "Comandas em aberto" exibida só quando essa lista não
      está vazia (Requirement: Comandas em aberto). Verificar reproduzindo
      os Scenarios "Existe ao menos uma comanda aberta fora da fila de
      hoje" e "Nenhuma comanda aberta fora da fila de hoje".
- [x] 8.2 Clicar em "Retomar" numa linha dessa seção carrega o carrinho com
      os itens já salvos daquela comanda; verificar reproduzindo o Scenario
      "Reabrir comanda aberta de um agendamento de outro dia".
- [x] 8.3 Formulário de "Descartar" (campo de motivo obrigatório, não-vazio,
      chamando `descartarComanda` da tarefa 4.2 — nunca um confirm de um
      clique só); verificar que tentar confirmar sem motivo bloqueia a
      ação (Scenario "Descartar sem motivo").

## 9. Painel — aviso de comandas em aberto

- [x] 9.1 Em `src/app/(dashboard)/dashboard/page.tsx` (hoje stub), adicionar
      a contagem de comandas com `status: ABERTA` da clínica ativa como um
      aviso, oculto quando a contagem for zero; verificar reproduzindo os
      Scenarios "Existem comandas abertas" e "Nenhuma comanda aberta" do
      Requirement "Aviso de comandas em aberto no Painel".

## 10. Dados de teste e isolamento entre clínicas

- [x] 10.1 Adicionar 2-3 agendamentos de hoje (`dataHoraInicio` calculada
      a partir de `new Date()` no momento do seed, não uma data fixa) a
      `prisma/seed.ts`, vinculados aos pacientes/clientes já seedados —
      sem isso não há forma de testar a fila do dia, já que esta change não
      constrói a tela de criação de agendamento (fora de escopo, ver
      proposal.md). Verificar rodando `npm run db:seed` e conferindo que os
      agendamentos aparecem na fila da tela de atendimento.
- [x] 10.2 Adicionar um `describe` para `Comanda` em
      `src/lib/isolamento-clinica.test.ts`, seguindo o mesmo padrão já
      documentado no arquivo (clínica A não encontra Comanda da clínica B
      por ID direto); verificar que o teste passa com `npm test`.

## 11. Verificação final

- [x] 11.1 Rodar `npx tsc --noEmit` e `npm run build`, confirmar que passam
      sem erros novos introduzidos por este change. Ambos limpos; suíte de
      testes completa também rodada (`npx vitest run`) — 113/113 passando.
- [x] 11.2 Revisar cada scenario dos dois deltas
      (`specs/atendimento-comanda/spec.md`, `specs/agendamento/spec.md`)
      manualmente contra a UI implementada, incluindo o fluxo completo:
      selecionar agendamento → adicionar item → autosave → fechar aba →
      reabrir mais tarde (mesmo dia e em outro dia) → retomar → finalizar
      ou descartar com motivo; confirmar que todos passam. Verificado ao
      vivo logado como `ana@vidaanimal.com.br`: fila do dia com os 3
      agendamentos seedados, seleção transicionando para "em atendimento"
      na hora, item previsto com atalho de adição, incremento de
      quantidade em item já presente, desconto percentual recalculando em
      tempo real no client e persistindo após o debounce (~10s, conferido
      direto no banco), finalizar transicionando comanda→finalizada e
      agendamento→concluído, card concluído ficando não-clicável
      (imutabilidade), descartar avulso (sem efeito em agendamento) e
      descartar vinculado (agendamento→cancelado) nos dois pontos de
      entrada (lista "Comandas em aberto" e botão do carrinho), bloqueio de
      descarte sem motivo, retomada de uma comanda de "ontem" (simulada via
      script, já que a UI de criar agendamento é fora de escopo) carregando
      o carrinho salvo corretamente, e o widget do Painel aparecendo com 1
      comanda aberta e sumindo quando zero. Nenhum erro no console em
      nenhum momento.
