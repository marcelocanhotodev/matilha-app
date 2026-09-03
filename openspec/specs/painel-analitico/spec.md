# Painel analítico

## Purpose

Dá à clínica uma leitura visual e imediata do próprio histórico de vendas
diretamente no Painel — quais itens mais vendem, quem são os clientes que
mais consomem, como o faturamento se divide por forma de pagamento e como
evolui dia a dia — sem precisar consultar o banco de dados na mão.

## Requirements

### Requirement: Gráfico de itens mais vendidos
O Painel SHALL exibir um gráfico de barras com os 5 itens de catálogo
(serviço ou produto, combinados numa única lista) com maior quantidade
total vendida em Comandas com status "finalizada" da clínica ativa. Em
caso de empate na quantidade entre dois ou mais itens, a ordem entre eles
SHALL ser alfabética pelo nome do item.

#### Scenario: Nenhuma venda registrada ainda
- **GIVEN** a clínica ativa não tem nenhuma Comanda finalizada
- **WHEN** o Painel é aberto
- **THEN** o gráfico exibe uma mensagem indicando que ainda não há vendas
  registradas, em vez de um gráfico vazio ou erro

#### Scenario: Menos de 5 itens com venda registrada
- **GIVEN** a clínica ativa tem vendas finalizadas de só 2 itens de
  catálogo distintos
- **WHEN** o Painel é aberto
- **THEN** o gráfico mostra só esses 2 itens — nunca completa com itens
  sem nenhuma venda

### Requirement: Gráfico de clientes com mais consumo
O Painel SHALL exibir um gráfico de barras com os 5 clientes com maior
soma de valor total (campo `total`) entre as Comandas com status
"finalizada" da clínica ativa, vinculadas a esse cliente. O ranking SHALL
incluir clientes inativos, já que reflete histórico de consumo, não o
cadastro atual. Em caso de empate no valor total entre dois ou mais
clientes, a ordem entre eles SHALL ser alfabética pelo nome do cliente.

#### Scenario: Nenhuma venda registrada ainda
- **GIVEN** a clínica ativa não tem nenhuma Comanda finalizada vinculada
  a um cliente
- **WHEN** o Painel é aberto
- **THEN** o gráfico exibe uma mensagem indicando que ainda não há
  consumo registrado, em vez de um gráfico vazio ou erro

#### Scenario: Comanda avulsa sem cliente vinculado não entra no ranking
- **GIVEN** uma Comanda finalizada sem `clienteId` (atendimento avulso)
- **WHEN** o ranking de clientes é calculado
- **THEN** o valor dessa comanda não é atribuído a nenhum cliente no
  gráfico

### Requirement: Gráfico de faturamento por forma de pagamento
O Painel SHALL exibir um gráfico de distribuição (tipo rosca ou pizza) do
valor total faturado (soma do campo `total`), agrupado pela forma de
pagamento registrada, considerando só Comandas com status "finalizada" da
clínica ativa.

#### Scenario: Nenhuma venda registrada ainda
- **GIVEN** a clínica ativa não tem nenhuma Comanda finalizada
- **WHEN** o Painel é aberto
- **THEN** o gráfico exibe uma mensagem indicando que ainda não há
  faturamento registrado, em vez de um gráfico vazio ou erro

### Requirement: Gráfico de faturamento por dia
O Painel SHALL exibir um gráfico de série temporal com o valor total
faturado (soma do campo `total` de Comandas com status "finalizada" da
clínica ativa) por dia, cobrindo os últimos 14 dias corridos (incluindo
hoje). Um dia sem nenhuma comanda finalizada SHALL aparecer no gráfico com
valor zero — o eixo do tempo nunca omite um dia do período.

#### Scenario: Nenhuma venda no período
- **GIVEN** a clínica ativa não tem nenhuma Comanda finalizada nos
  últimos 14 dias
- **WHEN** o Painel é aberto
- **THEN** o gráfico exibe os 14 dias no eixo do tempo, todos com valor
  zero — nunca um gráfico em branco ou erro
