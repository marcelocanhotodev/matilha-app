# Agendamento

## Purpose

> Referência visual: `openspec/reference/prototipo.html`, seção `#agenda`.


Agenda semanal por profissional, com blocos de horário coloridos por espécie
do paciente, e um ciclo de status por atendimento.

## Requirements

### Requirement: Criação de agendamento
O sistema SHALL permitir criar um agendamento vinculado a um paciente
existente, um profissional, um serviço previsto, data e horário, com duração
padrão configurável por serviço. A duração SHALL ser pré-preenchida a partir
da duração padrão do serviço selecionado (ver `catalogo-produtos-servicos`),
quando configurada, mas SHALL permanecer editável pelo usuário. Um
agendamento com status "cancelado" NÃO SHALL contar como conflito de
horário para outro agendamento do mesmo profissional. A data e o horário
informados SHALL ser interpretados no fuso horário da clínica,
independentemente do fuso horário configurado no processo do servidor que
executa a criação.

#### Scenario: Conflito de horário para o mesmo profissional
- **GIVEN** o profissional X já tem um agendamento das 14:00 às 15:00
- **WHEN** o usuário tenta criar outro agendamento para o profissional X às 14:30
- **THEN** o sistema alerta sobre o conflito antes de confirmar (mas SHALL
  permitir ao usuário confirmar mesmo assim, para encaixes — não é um bloqueio duro)

#### Scenario: Confirmar mesmo com conflito
- **GIVEN** o alerta de conflito de horário exibido para o usuário
- **WHEN** o usuário confirma mesmo assim
- **THEN** o sistema cria o agendamento normalmente, sem impedir a
  confirmação

#### Scenario: Agendamento cancelado não conta como conflito
- **GIVEN** o profissional X tem um agendamento das 14:00 às 15:00 com
  status "cancelado"
- **WHEN** o usuário cria outro agendamento para o profissional X às 14:30
- **THEN** o sistema não alerta sobre conflito

#### Scenario: Duração pré-preenchida a partir do serviço
- **GIVEN** um serviço com duração padrão de 30 minutos
- **WHEN** o usuário seleciona esse serviço no formulário de novo
  agendamento
- **THEN** o campo de duração é pré-preenchido com 30 minutos, mas
  continua editável

#### Scenario: Horário informado é preservado independente do fuso do servidor
- **GIVEN** um usuário na tela de novo agendamento escolhe a data
  "2026-09-03" e o horário "09:00"
- **WHEN** o agendamento é salvo, não importa se o processo do servidor
  roda em UTC, no fuso da clínica, ou em qualquer outro fuso
- **THEN** o agendamento criado corresponde a 2026-09-03 09:00 no fuso
  horário da clínica — nunca a um horário deslocado pela diferença entre o
  fuso do servidor e o da clínica

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
- **GIVEN** um agendamento com status "aguardando", vinculado a uma comanda em aberto
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

### Requirement: Visualização semanal por profissional
O sistema SHALL exibir a agenda em formato de grade semanal (dias da semana x
horários), com os agendamentos posicionados conforme horário de início e
duração, coloridos conforme a espécie do paciente. A grade SHALL exibir os
agendamentos de todos os profissionais da clínica numa única visão — não
SHALL existir filtro ou seleção de profissional individual nesta capability
(apesar do nome do requirement). O rótulo de dia da semana de cada coluna
(segunda a sexta) SHALL sempre corresponder à data real exibida naquela
coluna, e um agendamento SHALL aparecer na grade sempre que seu horário
cair dentro da faixa de horas exibida, independentemente de diferença de
fuso horário entre o processo do servidor e o navegador que renderiza a
tela.

#### Scenario: Clique em horário vazio
- **GIVEN** a grade semanal exibida
- **WHEN** o usuário clica em uma célula vazia (sem agendamento)
- **THEN** o sistema abre o formulário de novo agendamento com data e horário
  pré-preenchidos a partir da célula clicada

#### Scenario: Navegação entre semanas
- **GIVEN** a grade semanal exibida para a semana atual
- **WHEN** o usuário navega para a semana seguinte ou anterior
- **THEN** o sistema exibe os agendamentos reais daquela semana

#### Scenario: Clique em agendamento existente não abre edição
- **GIVEN** a grade semanal exibida com um agendamento já criado
- **WHEN** o usuário clica nesse agendamento
- **THEN** o sistema não abre nenhum formulário de edição

#### Scenario: Rótulo do dia da semana bate com a data exibida
- **GIVEN** a grade semanal exibida, com o servidor rodando em um fuso
  horário diferente do fuso horário do navegador
- **WHEN** a página é renderizada
- **THEN** cada coluna mostra o rótulo de dia da semana (SEG/TER/QUA/QUI/SEX)
  correto para a data numérica exibida logo abaixo dele — nenhuma
  divergência entre servidor e navegador reordena ou desloca essa
  correspondência

#### Scenario: Agendamento em horário limite da grade continua visível
- **GIVEN** um agendamento salvo com horário de início dentro da faixa
  exibida pela grade (por exemplo, 09:00 no fuso da clínica)
- **WHEN** a grade semanal é renderizada, mesmo com o servidor rodando em
  outro fuso horário
- **THEN** o agendamento é exibido na posição correspondente ao seu horário
  real no fuso da clínica — nunca deslocado para fora da faixa de horas
  visível nem renderizado sobre o cabeçalho da grade
