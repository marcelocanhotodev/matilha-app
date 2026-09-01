# Histórico financeiro

## Contexto

> Referência visual: `openspec/reference/prototipo.html`, seção `#historico`.


Consulta agregada sobre as comandas já finalizadas: total arrecadado,
quantidade de atendimentos, ticket médio e forma de pagamento mais usada.

## Requirements

### Requirement: Listagem de comandas finalizadas
O sistema SHALL listar todas as comandas finalizadas da clínica ativa, mais
recentes primeiro, mostrando horário, paciente/tutor, itens vendidos, forma de
pagamento e total.

### Requirement: Totais agregados
O sistema SHALL calcular, a partir das comandas listadas (respeitando o filtro
de período ativo, quando existir): soma total arrecadada, quantidade de
comandas, ticket médio (total / quantidade) e a forma de pagamento mais
frequente.

#### Scenario: Nenhuma comanda finalizada ainda
- **GIVEN** a clínica ainda não finalizou nenhuma comanda
- **WHEN** a tela de histórico é aberta
- **THEN** o sistema exibe os totais como zero e uma mensagem de lista vazia,
  em vez de erro ou tela em branco

### Requirement: Filtro por período (evolução futura)
O sistema SHALL permitir, no futuro, filtrar o histórico por período (hoje,
semana, mês, intervalo customizado). Esta spec documenta a intenção; a
implementação do filtro é uma change separada a partir desta capability.
