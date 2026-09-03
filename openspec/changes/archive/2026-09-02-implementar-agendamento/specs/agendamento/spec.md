## MODIFIED Requirements

### Requirement: Criação de agendamento
O sistema SHALL permitir criar um agendamento vinculado a um paciente
existente, um profissional, um serviço previsto, data e horário, com
duração padrão configurável por serviço. A duração SHALL ser pré-preenchida
a partir da duração padrão do serviço selecionado (ver
`catalogo-produtos-servicos`), quando configurada, mas SHALL permanecer
editável pelo usuário. Um agendamento com status "cancelado" NÃO SHALL
contar como conflito de horário para outro agendamento do mesmo
profissional.

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

### Requirement: Visualização semanal por profissional
O sistema SHALL exibir a agenda em formato de grade semanal (dias da semana x
horários), com os agendamentos posicionados conforme horário de início e
duração, coloridos conforme a espécie do paciente. A grade SHALL exibir os
agendamentos de todos os profissionais da clínica numa única visão — não
SHALL existir filtro ou seleção de profissional individual nesta capability
(apesar do nome do requirement).

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
