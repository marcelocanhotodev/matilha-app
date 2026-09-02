## ADDED Requirements

### Requirement: Inativação lógica de paciente
O sistema SHALL permitir inativar um paciente independentemente de haver
Agendamentos ou Comandas vinculados a ele. Inativar um paciente NUNCA apaga
ou desvincula nenhum dado — Agendamentos e Comandas associados permanecem
intactos e consultáveis normalmente no histórico. Não SHALL existir exclusão
física de paciente no produto. Um paciente inativado SHALL poder ser
reativado a qualquer momento.

#### Scenario: Inativar paciente com agendamentos e comandas vinculados
- **GIVEN** um paciente com 3 agendamentos e 5 comandas no histórico
- **WHEN** o usuário inativa esse paciente
- **THEN** o sistema marca o paciente como inativo, sem bloquear a operação
  e sem apagar ou desvincular nenhum agendamento ou comanda

#### Scenario: Paciente inativo some da listagem padrão
- **GIVEN** um paciente inativado
- **WHEN** o usuário abre a grade de pacientes sem nenhum filtro aplicado
- **THEN** esse paciente não aparece na grade

#### Scenario: Reativação de paciente
- **GIVEN** um paciente inativo
- **WHEN** o usuário reativa esse paciente
- **THEN** o sistema marca o paciente como ativo novamente e ele volta a
  aparecer na grade padrão
