## MODIFIED Requirements

### Requirement: Finalização da comanda
Ao finalizar, o sistema SHALL: (1) preservar os snapshots de nome e preço já
capturados no momento em que cada item foi adicionado ao carrinho (ver
Requirement: Persistência da comanda em progresso) — nunca recalculá-los a
partir do preço atual do catálogo; (2) registrar forma de pagamento;
(3) marcar o agendamento vinculado, se houver, como concluído; (4) tornar a
comanda consultável no histórico financeiro; (5) transicionar o status da
própria comanda para "finalizada".

#### Scenario: Finalizar sem itens
- **GIVEN** uma comanda vazia
- **WHEN** o usuário tenta finalizar
- **THEN** o sistema bloqueia a finalização e avisa que é preciso adicionar
  ao menos um item

#### Scenario: Comanda finalizada sai da lista de comandas em aberto
- **GIVEN** uma comanda com status "aberta", vinculada a um agendamento de
  um dia anterior
- **WHEN** essa comanda é finalizada
- **THEN** ela deixa de aparecer na seção "Comandas em aberto"

## ADDED Requirements

### Requirement: Persistência da comanda em progresso
A partir do primeiro item adicionado ao carrinho, o sistema SHALL gravar uma
comanda com status "aberta", vinculada ao agendamento selecionado (se
houver) ou avulsa. Cada item adicionado SHALL copiar nome e preço do item de
catálogo no momento da adição (snapshot, ver `catalogo-produtos-servicos`) —
nunca uma referência viva ao preço atual do catálogo. Mudanças subsequentes
no carrinho (quantidade, desconto) SHALL ser persistidas automaticamente,
sem exigir uma ação explícita de salvar.

#### Scenario: Primeiro item cria a comanda
- **GIVEN** um atendimento sendo iniciado (vinculado a um agendamento, ou
  avulso), sem nenhuma comanda ainda
- **WHEN** o usuário adiciona o primeiro item ao carrinho
- **THEN** o sistema cria uma comanda com status "aberta" contendo esse item

#### Scenario: Preço do item é copiado no momento da adição
- **GIVEN** um item de catálogo com preço R$ 100
- **WHEN** o usuário adiciona esse item ao carrinho, e depois o preço do
  item de catálogo muda para R$ 120
- **THEN** o item já adicionado à comanda continua mostrando R$ 100 — o
  snapshot não muda

#### Scenario: Alteração de quantidade persiste automaticamente
- **GIVEN** uma comanda aberta com um item já adicionado
- **WHEN** o usuário altera a quantidade desse item
- **THEN** o sistema persiste essa alteração sem exigir clique num botão de
  salvar

### Requirement: Retomar comanda aberta
Ao selecionar um agendamento que já tem uma comanda com status "aberta"
vinculada, o sistema SHALL carregar o carrinho a partir dos itens já salvos
naquela comanda, em vez de iniciar um carrinho vazio. O sistema NUNCA SHALL
criar uma segunda comanda para o mesmo agendamento.

#### Scenario: Reabrir agendamento com comanda aberta no mesmo dia
- **GIVEN** um agendamento de hoje cuja comanda já está "aberta" (iniciada
  anteriormente)
- **WHEN** o usuário seleciona esse agendamento na fila do dia
- **THEN** o carrinho é carregado com os itens já salvos, não vazio

#### Scenario: Reabrir comanda aberta de um agendamento de outro dia
- **GIVEN** uma comanda "aberta" vinculada a um agendamento que não é mais
  de hoje
- **WHEN** o usuário seleciona essa comanda na seção "Comandas em aberto"
- **THEN** o carrinho é carregado com os itens já salvos, do mesmo jeito que
  no mesmo dia

### Requirement: Comandas em aberto
O sistema SHALL exibir, na tela de atendimento, uma seção listando toda
comanda com status "aberta" que não pertence à fila do dia corrente
(agendamento de outro dia, ou avulsa), mostrando quando foi iniciada,
paciente/tutor vinculado (ou "avulso"), itens já adicionados e subtotal
parcial. Essa seção SHALL ficar oculta quando não existir nenhuma comanda
nessa condição.

#### Scenario: Existe ao menos uma comanda aberta fora da fila de hoje
- **GIVEN** uma comanda "aberta" vinculada a um agendamento de um dia
  anterior, ou uma comanda avulsa "aberta"
- **WHEN** o usuário abre a tela de atendimento
- **THEN** a seção "Comandas em aberto" é exibida, listando essa comanda

#### Scenario: Nenhuma comanda aberta fora da fila de hoje
- **GIVEN** que todas as comandas "abertas" existentes pertencem à fila do
  dia corrente, ou não existe nenhuma comanda aberta
- **WHEN** o usuário abre a tela de atendimento
- **THEN** a seção "Comandas em aberto" não é exibida

### Requirement: Descartar comanda aberta
O sistema SHALL permitir descartar uma comanda com status "aberta",
exigindo um motivo obrigatório e não vazio antes de confirmar. Ao descartar,
o sistema SHALL: (1) transicionar o status da comanda para "cancelada",
preservando a linha e os itens; (2) gravar o motivo informado; (3) marcar o
agendamento vinculado, se houver, como cancelado. O sistema NUNCA SHALL
apagar fisicamente uma comanda descartada.

#### Scenario: Descartar sem motivo
- **GIVEN** uma comanda com status "aberta"
- **WHEN** o usuário tenta confirmar o descarte sem preencher um motivo
- **THEN** o sistema bloqueia a ação e exige o preenchimento do motivo

#### Scenario: Descartar comanda vinculada a um agendamento
- **GIVEN** uma comanda "aberta" vinculada a um agendamento com status
  "aguardando" ou "em atendimento"
- **WHEN** o usuário descarta essa comanda com um motivo preenchido
- **THEN** a comanda passa a "cancelada" com o motivo gravado, e o
  agendamento vinculado passa a "cancelado"

#### Scenario: Descartar comanda avulsa
- **GIVEN** uma comanda "aberta" avulsa (sem agendamento vinculado)
- **WHEN** o usuário descarta essa comanda com um motivo preenchido
- **THEN** a comanda passa a "cancelada" com o motivo gravado, sem nenhum
  efeito em agendamento

### Requirement: Imutabilidade de comanda finalizada ou cancelada
Uma comanda com status "finalizada" ou "cancelada" SHALL ser somente
leitura — o sistema NUNCA SHALL aceitar adicionar/remover item, alterar
quantidade, desconto ou forma de pagamento, nem finalizar/descartar
novamente sobre ela. Selecionar, na fila, um agendamento cuja comanda já
está nesse estado NÃO SHALL reabrir edição.

#### Scenario: Tentativa de alterar comanda já finalizada
- **GIVEN** uma comanda com status "finalizada"
- **WHEN** o sistema recebe uma tentativa de adicionar item a essa comanda
- **THEN** a operação é rejeitada, e a comanda permanece inalterada

#### Scenario: Tentativa de descartar comanda já finalizada
- **GIVEN** uma comanda com status "finalizada"
- **WHEN** o usuário tenta descartá-la
- **THEN** a operação é rejeitada — comanda finalizada não pode ser
  descartada

#### Scenario: Selecionar agendamento cuja comanda já está finalizada ou cancelada
- **GIVEN** um agendamento com comanda vinculada em status "finalizada" ou
  "cancelada"
- **WHEN** o usuário seleciona esse agendamento na fila
- **THEN** o sistema não permite adicionar itens a essa comanda — não reabre
  edição

### Requirement: Aviso de comandas em aberto no Painel
O sistema SHALL exibir, no Painel, a contagem de comandas com status
"aberta" da clínica ativa, como aviso — sem nenhuma ação disponível a partir
desse aviso (a ação de retomar/descartar mora na tela de atendimento). O
aviso SHALL ficar oculto quando essa contagem for zero, mesma regra da
seção "Comandas em aberto".

#### Scenario: Existem comandas abertas
- **GIVEN** ao menos uma comanda "aberta" na clínica ativa
- **WHEN** o usuário abre o Painel
- **THEN** o Painel exibe a contagem dessas comandas

#### Scenario: Nenhuma comanda aberta
- **GIVEN** nenhuma comanda "aberta" na clínica ativa
- **WHEN** o usuário abre o Painel
- **THEN** o aviso de comandas em aberto não é exibido
