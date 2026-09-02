## MODIFIED Requirements

### Requirement: CRUD de itens de catálogo
O sistema SHALL permitir criar, editar e inativar itens de catálogo, cada um
com nome, categoria (serviço ou produto) e preço. Não SHALL existir exclusão
física de item de catálogo no produto (ver Requirement "Inativação lógica de
item de catálogo").

#### Scenario: Preço inválido
- **GIVEN** o formulário de novo item de catálogo
- **WHEN** o usuário informa um preço negativo ou não numérico
- **THEN** o sistema rejeita o cadastro e destaca o campo de preço

## ADDED Requirements

### Requirement: Inativação lógica de item de catálogo
O sistema SHALL permitir inativar um item de catálogo independentemente de
haver Agendamentos ou itens de Comanda vinculados a ele. Inativar um item
NUNCA apaga ou desvincula nenhum dado — Agendamentos e comandas que já
referenciam esse item permanecem intactos e consultáveis normalmente no
histórico (ver Requirement "Alteração de preço não afeta vendas passadas").
Um item inativado SHALL poder ser reativado a qualquer momento.

#### Scenario: Inativar item já usado em agendamentos e comandas
- **GIVEN** um item de catálogo referenciado por 2 agendamentos futuros e por
  itens de comanda de vendas já finalizadas
- **WHEN** o usuário inativa esse item
- **THEN** o sistema marca o item como inativo, sem bloquear a operação e sem
  apagar ou desvincular nenhum agendamento ou comanda

#### Scenario: Item inativo some da listagem padrão
- **GIVEN** um item de catálogo inativado
- **WHEN** o usuário abre a listagem de catálogo sem nenhum filtro aplicado
- **THEN** esse item não aparece na listagem

#### Scenario: Reativação de item de catálogo
- **GIVEN** um item de catálogo inativo
- **WHEN** o usuário reativa esse item
- **THEN** o sistema marca o item como ativo novamente e ele volta a aparecer
  na listagem padrão
