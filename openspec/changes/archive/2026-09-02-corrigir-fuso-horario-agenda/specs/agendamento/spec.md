## MODIFIED Requirements

### Requirement: Criação de agendamento
O sistema SHALL permitir criar um agendamento vinculado a um paciente
existente, um profissional, um serviço previsto, data e horário, com duração
padrão configurável por serviço. A data e o horário informados SHALL ser
interpretados no fuso horário da clínica, independentemente do fuso horário
configurado no processo do servidor que executa a criação.

#### Scenario: Conflito de horário para o mesmo profissional
- **GIVEN** o profissional X já tem um agendamento das 14:00 às 15:00
- **WHEN** o usuário tenta criar outro agendamento para o profissional X às 14:30
- **THEN** o sistema alerta sobre o conflito antes de confirmar (mas SHALL
  permitir ao usuário confirmar mesmo assim, para encaixes — não é um bloqueio duro)

#### Scenario: Horário informado é preservado independente do fuso do servidor
- **GIVEN** um usuário na tela de novo agendamento escolhe a data
  "2026-09-03" e o horário "09:00"
- **WHEN** o agendamento é salvo, não importa se o processo do servidor
  roda em UTC, no fuso da clínica, ou em qualquer outro fuso
- **THEN** o agendamento criado corresponde a 2026-09-03 09:00 no fuso
  horário da clínica — nunca a um horário deslocado pela diferença entre o
  fuso do servidor e o da clínica

### Requirement: Visualização semanal por profissional
O sistema SHALL exibir a agenda em formato de grade semanal (dias da semana x
horários), com os agendamentos posicionados conforme horário de início e
duração, coloridos conforme a espécie do paciente. O rótulo de dia da semana
de cada coluna (segunda a sexta) SHALL sempre corresponder à data real
exibida naquela coluna, e um agendamento SHALL aparecer na grade sempre que
seu horário cair dentro da faixa de horas exibida, independentemente de
diferença de fuso horário entre o processo do servidor e o navegador que
renderiza a tela.

#### Scenario: Clique em horário vazio
- **GIVEN** a grade semanal exibida
- **WHEN** o usuário clica em uma célula vazia (sem agendamento)
- **THEN** o sistema abre o formulário de novo agendamento com data e horário
  pré-preenchidos a partir da célula clicada

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
