# Histórico financeiro

## Purpose

> Referência visual: `openspec/reference/prototipo.html`, seção `#historico`.


Consulta agregada sobre as comandas já finalizadas: total arrecadado,
quantidade de atendimentos, ticket médio e forma de pagamento mais usada.

## Requirements

### Requirement: Listagem de comandas finalizadas
O sistema SHALL listar todas as comandas finalizadas da clínica ativa, mais
recentes primeiro, mostrando horário, paciente/tutor, forma de pagamento e
total. A lista SHALL NOT mostrar os itens vendidos de cada comanda — isso é
exclusivo da tela de detalhes (Requirement: Tela de detalhes do
atendimento).

#### Scenario: Listagem em ordem cronológica reversa
- **GIVEN** duas comandas finalizadas em dias diferentes
- **WHEN** a tela de histórico é aberta
- **THEN** a comanda mais recente aparece antes da mais antiga

#### Scenario: Linha da lista não expõe os itens vendidos
- **GIVEN** uma comanda finalizada com 3 itens diferentes
- **WHEN** ela aparece na listagem
- **THEN** a linha mostra horário, pet/tutor, forma de pagamento e total,
  sem listar os itens individualmente

### Requirement: Tela de detalhes do atendimento
O sistema SHALL oferecer uma tela de detalhes, somente leitura, para cada
comanda finalizada, endereçável por uma URL própria contendo o id da
comanda. A tela SHALL mostrar: data/hora, pet, tutor, veterinário(a),
origem (agendamento vinculado, com horário, ou atendimento avulso), a lista
completa de itens vendidos (nome, quantidade, preço unitário, subtotal),
subtotal, desconto, total e forma de pagamento. Campos opcionais sem valor
(pet, tutor ou veterinário ausentes) SHALL ser exibidos como "—", nunca
omitidos ou causando erro.

#### Scenario: Acessar o detalhe de uma comanda finalizada
- **GIVEN** uma comanda finalizada da clínica ativa, com 2 itens
- **WHEN** o usuário acessa a URL de detalhe dessa comanda
- **THEN** a tela mostra os 2 itens (nome, quantidade, preço unitário,
  subtotal), o subtotal/desconto/total e a forma de pagamento

#### Scenario: Comanda sem paciente vinculado
- **GIVEN** uma comanda finalizada avulsa, sem `pacienteId`
- **WHEN** o usuário acessa a tela de detalhe
- **THEN** o campo de pet é exibido como "—", sem erro

#### Scenario: Comanda de outra clínica não é acessível pela URL
- **GIVEN** um usuário autenticado na Clínica A
- **WHEN** ele acessa a URL de detalhe de uma comanda que pertence à
  Clínica B
- **THEN** o sistema responde como se a comanda não existisse (404), nunca
  um erro de acesso negado (403) — mesmo padrão de isolamento usado no
  resto do projeto

#### Scenario: Comanda não finalizada não é acessível pela URL
- **GIVEN** uma comanda `ABERTA` ou `CANCELADA` da clínica ativa
- **WHEN** o usuário acessa a URL de detalhe dessa comanda
- **THEN** o sistema responde como se ela não existisse (404) — histórico
  só cobre comandas finalizadas

### Requirement: Paginação configurável do histórico
O sistema SHALL paginar a listagem de comandas finalizadas, com o número de
itens por página definido por clínica. Cada clínica SHALL ter um valor
próprio, com padrão de 10 quando não definido explicitamente. Não há tela
de configuração para esse valor nesta capability — ele é alterado
diretamente no banco de dados.

#### Scenario: Página respeita o tamanho configurado da clínica
- **GIVEN** uma clínica configurada para 10 itens por página, com 25
  comandas finalizadas
- **WHEN** o usuário abre a primeira página do histórico
- **THEN** a lista mostra 10 comandas, e a navegação indica 3 páginas no
  total

#### Scenario: Clínica sem valor configurado usa o padrão
- **GIVEN** uma clínica que nunca teve o tamanho de página alterado
- **WHEN** o histórico é exibido
- **THEN** a paginação usa 10 itens por página

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
