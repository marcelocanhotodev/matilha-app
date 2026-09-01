# Cadastro de pacientes (animais)

## Contexto

> Referência visual: `openspec/reference/prototipo.html`, seção `#pacientes`.


O Paciente é o animal, sempre vinculado a um Cliente (tutor) já cadastrado.
A raça disponível depende da espécie escolhida.

## Requirements

### Requirement: Vínculo obrigatório com um cliente existente
Todo paciente SHALL pertencer a exatamente um Cliente já cadastrado no momento
da criação. O sistema não SHALL permitir criar um paciente "órfão".

#### Scenario: Nenhum cliente cadastrado ainda
- **GIVEN** a clínica ainda não tem nenhum cliente cadastrado
- **WHEN** o usuário abre o formulário de novo paciente
- **THEN** o sistema orienta a cadastrar um cliente primeiro (o seletor de
  tutor não pode ficar vazio silenciosamente)

### Requirement: Lista de raças dependente da espécie
Ao selecionar a espécie (Cão, Gato, Outro), o sistema SHALL apresentar uma
lista de raças específica daquela espécie, sempre com uma opção final "Outra"
que libera um campo de texto livre.

#### Scenario: Troca de espécie após já ter escolhido raça
- **GIVEN** o usuário selecionou espécie "Cão" e raça "Golden Retriever"
- **WHEN** ele muda a espécie para "Gato"
- **THEN** a lista de raças é recarregada com raças de gato, e a seleção
  anterior de raça de cão é descartada

### Requirement: Idade derivada da data de nascimento
O sistema SHALL armazenar a data de nascimento do paciente (não a idade), e
SHALL calcular a idade em tempo de exibição sempre que o dado for mostrado.

#### Scenario: Exibição da idade
- **GIVEN** um paciente com data de nascimento cadastrada
- **WHEN** o card do paciente é exibido
- **THEN** o sistema mostra a idade calculada a partir da data atual (em meses
  se menor que 1 ano, em anos e meses caso contrário)

### Requirement: Características físicas e clínicas
O sistema SHALL permitir registrar, além dos dados de identificação: sexo, peso
(kg), cor da pelagem, porte (pequeno/médio/grande), status de castração
(sim/não/não informado), número de microchip (opcional) e observações livres
(alergias, comportamento, medicação contínua).

#### Scenario: Peso inválido
- **GIVEN** o formulário de paciente
- **WHEN** o usuário informa um peso menor ou igual a zero
- **THEN** o sistema rejeita o valor e destaca o campo, sem bloquear os demais campos já válidos

#### Scenario: Observações visíveis no card
- **GIVEN** um paciente com o campo de observações preenchido (ex: "Alérgico a frango")
- **WHEN** o card desse paciente é listado
- **THEN** o sistema destaca visualmente essa observação (não deve ficar
  escondida atrás de um clique a mais — é informação de segurança clínica)

### Requirement: Atualização em cascata do vínculo com o cliente
Ao criar, editar ou excluir um paciente, o sistema SHALL manter consistente a
contagem/lista de pacientes exibida na tela de Clientes, sem exigir uma
atualização manual separada.

#### Scenario: Novo paciente reflete na tela de clientes
- **GIVEN** um cliente sem nenhum paciente cadastrado
- **WHEN** um novo paciente é criado para esse cliente
- **THEN** a tela de Clientes passa a mostrar esse paciente na contagem daquele
  cliente, na próxima vez que for renderizada
