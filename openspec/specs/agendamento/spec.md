# Agendamento

## Contexto

> Referência visual: `openspec/reference/prototipo.html`, seção `#agenda`.


Agenda semanal por profissional, com blocos de horário coloridos por espécie
do paciente, e um ciclo de status por atendimento.

## Requirements

### Requirement: Criação de agendamento
O sistema SHALL permitir criar um agendamento vinculado a um paciente
existente, um profissional, um serviço previsto, data e horário, com duração
padrão configurável por serviço.

#### Scenario: Conflito de horário para o mesmo profissional
- **GIVEN** o profissional X já tem um agendamento das 14:00 às 15:00
- **WHEN** o usuário tenta criar outro agendamento para o profissional X às 14:30
- **THEN** o sistema alerta sobre o conflito antes de confirmar (mas SHALL
  permitir ao usuário confirmar mesmo assim, para encaixes — não é um bloqueio duro)

### Requirement: Ciclo de status do agendamento
Todo agendamento SHALL ter um status dentre: aguardando, em atendimento,
concluído, cancelado. A transição para "concluído" SHALL ocorrer
automaticamente quando uma Comanda vinculada a esse agendamento for finalizada.

#### Scenario: Finalizar comanda conclui o agendamento
- **GIVEN** um agendamento com status "aguardando", vinculado a uma comanda em aberto
- **WHEN** a comanda é finalizada
- **THEN** o status do agendamento muda para "concluído" automaticamente

### Requirement: Visualização semanal por profissional
O sistema SHALL exibir a agenda em formato de grade semanal (dias da semana x
horários), com os agendamentos posicionados conforme horário de início e
duração, coloridos conforme a espécie do paciente.

#### Scenario: Clique em horário vazio
- **GIVEN** a grade semanal exibida
- **WHEN** o usuário clica em uma célula vazia (sem agendamento)
- **THEN** o sistema abre o formulário de novo agendamento com data e horário
  pré-preenchidos a partir da célula clicada
