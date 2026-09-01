# Ponto de atendimento (comanda)

## Contexto

> Referência visual: `openspec/reference/prototipo.html`, seção `#atendimento`.


Tela onde a recepção monta a comanda de um atendimento — vinculado a um
agendamento do dia, ou avulso (encaixe/balcão) — adicionando serviços e
produtos do catálogo até chegar num valor final.

## Requirements

### Requirement: Fila de agendamentos do dia
O sistema SHALL exibir os agendamentos do dia corrente como uma lista
selecionável (não um campo de texto ou dropdown escondido), cada um mostrando
horário, paciente e status atual. SHALL existir sempre uma opção "avulso" para
atendimentos sem agendamento prévio.

#### Scenario: Selecionar agendamento existente
- **GIVEN** a fila do dia com 5 agendamentos
- **WHEN** o usuário seleciona um deles
- **THEN** o sistema mostra os dados do paciente/tutor/profissional
  relacionados, e oferece adicionar à comanda o serviço já previsto naquele
  agendamento, caso ele exista no catálogo

### Requirement: Montagem da comanda
O sistema SHALL permitir adicionar múltiplos itens de catálogo à comanda, cada
um com quantidade ajustável, calculando subtotal em tempo real.

#### Scenario: Adicionar item já presente na comanda
- **GIVEN** uma comanda com "Consulta de rotina" já adicionada (quantidade 1)
- **WHEN** o usuário adiciona "Consulta de rotina" novamente
- **THEN** o sistema incrementa a quantidade existente para 2, em vez de criar
  uma linha duplicada

### Requirement: Desconto configurável
O sistema SHALL permitir aplicar desconto em percentual ou em valor fixo sobre
o subtotal, recalculando o total automaticamente, sem nunca resultar em total negativo.

#### Scenario: Desconto maior que o subtotal
- **GIVEN** uma comanda com subtotal de R$ 50
- **WHEN** o usuário informa um desconto fixo de R$ 80
- **THEN** o sistema exibe o total como R$ 0, nunca como valor negativo

### Requirement: Finalização da comanda
Ao finalizar, o sistema SHALL: (1) copiar nome e preço de cada item vendido
(snapshot, ver `catalogo-produtos-servicos`); (2) registrar forma de pagamento;
(3) marcar o agendamento vinculado, se houver, como concluído; (4) tornar a
comanda consultável no histórico financeiro.

#### Scenario: Finalizar sem itens
- **GIVEN** uma comanda vazia
- **WHEN** o usuário tenta finalizar
- **THEN** o sistema bloqueia a finalização e avisa que é preciso adicionar
  ao menos um item
