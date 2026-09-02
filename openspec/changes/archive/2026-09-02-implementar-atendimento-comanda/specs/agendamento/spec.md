## MODIFIED Requirements

### Requirement: Ciclo de status do agendamento
Todo agendamento SHALL ter um status dentre: aguardando, em atendimento,
concluído, cancelado. A transição para "em atendimento" SHALL ocorrer
quando a recepção seleciona esse agendamento na fila da tela de
atendimento, antes de qualquer item ser adicionado à comanda. A transição
para "concluído" SHALL ocorrer automaticamente quando uma Comanda vinculada
a esse agendamento for finalizada. A transição para "cancelado" SHALL
ocorrer automaticamente quando a Comanda vinculada a esse agendamento for
descartada. As transições para "concluído" e "cancelado" são terminais —
nenhuma ação SHALL regredir um agendamento desses status de volta para
"aguardando" ou "em atendimento".

#### Scenario: Selecionar na fila inicia o atendimento
- **GIVEN** um agendamento com status "aguardando"
- **WHEN** a recepção seleciona esse agendamento na fila do dia
- **THEN** o status desse agendamento muda para "em atendimento"
  imediatamente, antes de qualquer item ser adicionado à comanda

#### Scenario: Finalizar comanda conclui o agendamento
- **GIVEN** um agendamento com status "aguardando", vinculado a uma comanda
  em aberto
- **WHEN** a comanda é finalizada
- **THEN** o status do agendamento muda para "concluído" automaticamente

#### Scenario: Descartar comanda cancela o agendamento
- **GIVEN** um agendamento vinculado a uma comanda "aberta"
- **WHEN** essa comanda é descartada
- **THEN** o status do agendamento muda para "cancelado" automaticamente

#### Scenario: Selecionar agendamento já concluído ou cancelado não regride o status
- **GIVEN** um agendamento com status "concluído" ou "cancelado"
- **WHEN** a recepção seleciona esse agendamento na fila
- **THEN** o status permanece inalterado — nunca volta para "em atendimento"
