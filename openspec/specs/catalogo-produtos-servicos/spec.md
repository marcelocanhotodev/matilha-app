# Catálogo de produtos e serviços

## Contexto

> Referência visual: `openspec/reference/prototipo.html`, seção `#cadastro`.


Itens vendáveis pela clínica (serviços como consulta/vacinação, e produtos
como ração/antipulgas), usados tanto no agendamento (serviço previsto) quanto
na comanda (venda real).

## Requirements

### Requirement: CRUD de itens de catálogo
O sistema SHALL permitir criar, editar e inativar itens de catálogo, cada um
com nome, categoria (serviço ou produto), preço e, quando a categoria for
"serviço", uma duração padrão opcional em minutos — usada para pré-preencher
a duração ao criar um agendamento vinculado a esse serviço (ver
`agendamento`, Requirement: Criação de agendamento). Duração padrão não
SHALL ser solicitada nem gravada para itens da categoria "produto". Não
SHALL existir exclusão física de item de catálogo no produto (ver
Requirement "Inativação lógica de item de catálogo").

#### Scenario: Preço inválido
- **GIVEN** o formulário de novo item de catálogo
- **WHEN** o usuário informa um preço negativo ou não numérico
- **THEN** o sistema rejeita o cadastro e destaca o campo de preço

#### Scenario: Duração padrão de um serviço
- **GIVEN** o formulário de novo item de catálogo com categoria "serviço"
- **WHEN** o usuário informa 30 como duração padrão em minutos
- **THEN** o sistema grava esse item com duração padrão de 30 minutos

#### Scenario: Duração não se aplica a produto
- **GIVEN** o formulário de novo item de catálogo com categoria "produto"
- **WHEN** o usuário cadastra o item
- **THEN** o sistema não solicita nem grava duração padrão para esse item

#### Scenario: Duração padrão inválida
- **GIVEN** o formulário de novo item de catálogo com categoria "serviço"
- **WHEN** o usuário informa uma duração zero, negativa ou não numérica
- **THEN** o sistema rejeita o cadastro e destaca o campo de duração

### Requirement: Alteração de preço não afeta vendas passadas
Alterar o preço de um item de catálogo SHALL afetar apenas vendas futuras. O
valor de itens já vendidos em comandas anteriores SHALL permanecer inalterado
(ver `atendimento-comanda`, snapshot de preço).

#### Scenario: Preço alterado após uma venda
- **GIVEN** um item vendido em uma comanda finalizada ontem por R$ 100
- **WHEN** o preço desse item é alterado hoje para R$ 120 no catálogo
- **THEN** a comanda de ontem continua exibindo R$ 100 para aquele item

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
