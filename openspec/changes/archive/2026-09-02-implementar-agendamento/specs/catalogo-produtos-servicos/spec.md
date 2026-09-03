## MODIFIED Requirements

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
