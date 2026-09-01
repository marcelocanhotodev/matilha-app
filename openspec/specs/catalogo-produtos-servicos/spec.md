# Catálogo de produtos e serviços

## Contexto

> Referência visual: `openspec/reference/prototipo.html`, seção `#cadastro`.


Itens vendáveis pela clínica (serviços como consulta/vacinação, e produtos
como ração/antipulgas), usados tanto no agendamento (serviço previsto) quanto
na comanda (venda real).

## Requirements

### Requirement: CRUD de itens de catálogo
O sistema SHALL permitir criar, editar e excluir itens de catálogo, cada um
com nome, categoria (serviço ou produto) e preço.

#### Scenario: Preço inválido
- **GIVEN** o formulário de novo item de catálogo
- **WHEN** o usuário informa um preço negativo ou não numérico
- **THEN** o sistema rejeita o cadastro e destaca o campo de preço

### Requirement: Alteração de preço não afeta vendas passadas
Alterar o preço de um item de catálogo SHALL afetar apenas vendas futuras. O
valor de itens já vendidos em comandas anteriores SHALL permanecer inalterado
(ver `atendimento-comanda`, snapshot de preço).

#### Scenario: Preço alterado após uma venda
- **GIVEN** um item vendido em uma comanda finalizada ontem por R$ 100
- **WHEN** o preço desse item é alterado hoje para R$ 120 no catálogo
- **THEN** a comanda de ontem continua exibindo R$ 100 para aquele item
