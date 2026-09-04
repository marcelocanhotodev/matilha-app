## MODIFIED Requirements

### Requirement: Listagem de comandas finalizadas
O sistema SHALL listar as comandas finalizadas da clínica ativa dentro do
período ativo (ou de todas, quando nenhum filtro de período estiver
selecionado), mais recentes primeiro, mostrando horário, paciente/tutor,
forma de pagamento e total. A lista SHALL NOT mostrar os itens vendidos de
cada comanda — isso é exclusivo da tela de detalhes (Requirement: Tela de
detalhes do atendimento).

#### Scenario: Listagem em ordem cronológica reversa
- **GIVEN** duas comandas finalizadas em dias diferentes
- **WHEN** a tela de histórico é aberta
- **THEN** a comanda mais recente aparece antes da mais antiga

#### Scenario: Linha da lista não expõe os itens vendidos
- **GIVEN** uma comanda finalizada com 3 itens diferentes
- **WHEN** ela aparece na listagem
- **THEN** a linha mostra horário, pet/tutor, forma de pagamento e total,
  sem listar os itens individualmente

### Requirement: Totais agregados
O sistema SHALL calcular, a partir das comandas finalizadas dentro do
período ativo (ou de todo o histórico, quando nenhum filtro de período
estiver selecionado): soma total arrecadada, quantidade de comandas,
ticket médio (total / quantidade) e a forma de pagamento mais frequente.

#### Scenario: Nenhuma comanda finalizada ainda
- **GIVEN** a clínica ainda não finalizou nenhuma comanda
- **WHEN** a tela de histórico é aberta
- **THEN** o sistema exibe os totais como zero e uma mensagem de lista vazia,
  em vez de erro ou tela em branco

#### Scenario: Totais recalculados pelo período ativo
- **GIVEN** comandas finalizadas em meses diferentes, com um filtro de
  período cobrindo só um deles
- **WHEN** o filtro é aplicado
- **THEN** os 4 cards mostram os totais só das comandas dentro do
  período, não do histórico inteiro

## REMOVED Requirements

### Requirement: Filtro por período (evolução futura)
**Reason**: Substituída por uma Requirement real e testável ("Filtro por
período") agora que esta change a implementa.
**Migration**: N/A — nunca foi implementada, não existe comportamento em
produção para migrar.

## ADDED Requirements

### Requirement: Filtro por período
O sistema SHALL permitir filtrar o histórico por um intervalo de datas
(data inicial e data final, ambas inclusive), aplicado tanto à listagem
paginada quanto aos totais agregados (Requirements: Listagem de comandas
finalizadas, Totais agregados). Sem filtro selecionado, o histórico SHALL
ser exibido por inteiro. O filtro SHALL usar a mesma data que já ordena a
listagem. Um intervalo com data inicial posterior à data final SHALL ser
rejeitado com uma mensagem de erro, sem aplicar um filtro inconsistente.

#### Scenario: Filtrar por um intervalo de datas
- **GIVEN** comandas finalizadas em 3 dias diferentes dentro do mês
- **WHEN** o usuário aplica um filtro com data inicial e data final
  cobrindo só o dia do meio
- **THEN** a listagem mostra só as comandas desse dia, e os 4 cards de
  totais refletem só esse subconjunto

#### Scenario: Intervalo sem nenhuma comanda finalizada
- **GIVEN** um intervalo de datas em que nenhuma comanda foi finalizada
- **WHEN** o filtro é aplicado
- **THEN** a listagem mostra a mensagem de lista vazia e os totais
  aparecem zerados, sem erro nem tela em branco

#### Scenario: Limpar o filtro
- **GIVEN** um filtro de período ativo
- **WHEN** o usuário limpa o filtro
- **THEN** o histórico volta a mostrar todas as comandas finalizadas, sem
  limite de período

#### Scenario: Data inicial posterior à data final
- **GIVEN** o usuário informa uma data inicial posterior à data final
- **WHEN** ele tenta aplicar o filtro
- **THEN** o sistema rejeita o intervalo com uma mensagem de erro clara, e
  a listagem permanece no estado anterior (sem aplicar o filtro inválido)

#### Scenario: Trocar de página preserva o filtro ativo
- **GIVEN** um filtro de período ativo com mais comandas do que cabem
  numa página
- **WHEN** o usuário navega para a próxima página
- **THEN** o filtro continua aplicado, mostrando a página seguinte do
  mesmo conjunto filtrado

#### Scenario: Aplicar um novo filtro volta para a primeira página
- **GIVEN** o usuário está na página 2 do histórico sem filtro
- **WHEN** ele aplica um filtro de período
- **THEN** a listagem volta a mostrar a primeira página, agora do
  conjunto filtrado
