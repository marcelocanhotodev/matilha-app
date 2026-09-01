# Cadastro de clientes (tutores)

## Contexto

> Referência visual: `openspec/reference/prototipo.html`, seção `#clientes`.


O Cliente é o tutor do animal — pessoa física ou jurídica. O cadastro precisa
conter os dados exigidos para uma futura emissão de NFS-e (nota fiscal de
serviço eletrônica), mesmo que a emissão em si não seja implementada ainda.

## Requirements

### Requirement: Cadastro de pessoa física
Ao cadastrar um cliente pessoa física, o sistema SHALL exigir nome completo e
CPF válido (dígito verificador correto), e SHALL aceitar opcionalmente data de
nascimento.

#### Scenario: CPF com dígito verificador inválido
- **GIVEN** o formulário de novo cliente com tipo "pessoa física"
- **WHEN** o usuário informa um CPF cujo dígito verificador não confere
- **THEN** o sistema rejeita o cadastro e destaca o campo CPF, sem salvar

#### Scenario: Cadastro válido de pessoa física
- **GIVEN** nome, CPF válido, e-mail válido e celular preenchidos
- **WHEN** o usuário confirma o cadastro
- **THEN** o sistema cria o Cliente com `tipo = FISICA` e os dados informados

### Requirement: Cadastro de pessoa jurídica
Ao cadastrar um cliente pessoa jurídica, o sistema SHALL exigir razão social e
CNPJ válido (dígito verificador correto), e SHALL aceitar opcionalmente
inscrição estadual.

#### Scenario: Cadastro válido de pessoa jurídica
- **GIVEN** razão social, CNPJ válido e e-mail preenchidos
- **WHEN** o usuário confirma o cadastro
- **THEN** o sistema cria o Cliente com `tipo = JURIDICA` e os dados informados

### Requirement: Endereço com preenchimento automático por CEP
O sistema SHALL buscar logradouro, bairro, cidade e UF automaticamente a partir
do CEP informado (via serviço externo, ex: ViaCEP), preenchendo os campos
correspondentes sem sobrescrever o que o usuário já tiver editado manualmente
depois da busca.

#### Scenario: CEP válido
- **GIVEN** o usuário digita um CEP válido e sai do campo
- **WHEN** o serviço de CEP retorna um endereço
- **THEN** os campos logradouro, bairro, cidade e UF são preenchidos automaticamente

#### Scenario: CEP não encontrado
- **GIVEN** o usuário digita um CEP inexistente
- **WHEN** o serviço de CEP retorna erro/vazio
- **THEN** o sistema não preenche os campos e não bloqueia o cadastro — o
  usuário pode preencher o endereço manualmente

### Requirement: E-mail obrigatório e validado
O sistema SHALL exigir e-mail em formato válido para todo cliente, pois é o
canal previsto de envio de nota fiscal.

#### Scenario: E-mail em formato inválido
- **GIVEN** o usuário preenche "não-é-email" no campo de e-mail
- **WHEN** ele tenta salvar
- **THEN** o sistema rejeita o cadastro e destaca o campo de e-mail

### Requirement: Inativação lógica de cliente
O sistema SHALL permitir inativar um cliente independentemente de haver
Pacientes ou Comandas vinculados a ele. Inativar um cliente NUNCA apaga ou
desvincula nenhum dado — Pacientes e Comandas associados permanecem
intactos e consultáveis normalmente no histórico. Um cliente inativado
SHALL poder ser reativado a qualquer momento.

#### Scenario: Inativar cliente com pacientes e comandas vinculados
- **GIVEN** um cliente com 2 pacientes cadastrados e 5 comandas no histórico
- **WHEN** o usuário inativa esse cliente
- **THEN** o sistema marca o cliente como inativo, sem bloquear a operação e
  sem apagar ou desvincular nenhum paciente ou comanda

#### Scenario: Cliente inativo some da listagem padrão
- **GIVEN** um cliente inativado
- **WHEN** o usuário abre a listagem de clientes sem nenhum filtro aplicado
- **THEN** esse cliente não aparece na lista

#### Scenario: Reativação de cliente
- **GIVEN** um cliente inativo
- **WHEN** o usuário reativa esse cliente
- **THEN** o sistema marca o cliente como ativo novamente e ele volta a
  aparecer na listagem padrão

### Requirement: Listagem de clientes com contagem de pacientes vinculados
O sistema SHALL listar, por padrão, apenas clientes ativos, exibindo para
cada um a quantidade de pacientes vinculados, e SHALL oferecer uma forma de
também visualizar clientes inativos.

#### Scenario: Contagem de pacientes exibida na listagem
- **GIVEN** um cliente com 3 pacientes cadastrados
- **WHEN** a listagem de clientes é exibida
- **THEN** a linha desse cliente mostra a contagem "3"

#### Scenario: Alternar para ver clientes inativos
- **GIVEN** a listagem de clientes exibindo apenas ativos
- **WHEN** o usuário aciona a opção de ver inativos
- **THEN** os clientes inativos passam a ser exibidos também

### Requirement: Busca de clientes por nome ou documento
O sistema SHALL permitir filtrar a listagem de clientes por nome (ou razão
social) ou por CPF/CNPJ, com correspondência parcial.

#### Scenario: Busca por nome parcial
- **GIVEN** clientes cadastrados incluindo "Marina Silva"
- **WHEN** o usuário busca por "Marina"
- **THEN** a listagem mostra apenas os clientes cujo nome contém "Marina"

#### Scenario: Busca por documento com ou sem máscara
- **GIVEN** um cliente cadastrado com CPF 384.526.170-62
- **WHEN** o usuário busca por "38452617062" (mesmos dígitos, sem máscara)
- **THEN** a listagem retorna esse cliente

### Requirement: Duplicidade de CPF/CNPJ detectada independente de formatação
O sistema SHALL detectar um CPF ou CNPJ já cadastrado na mesma clínica
independentemente de como foi digitado (com ou sem pontuação), rejeitando o
cadastro duplicado.

#### Scenario: Tentativa de cadastro com CPF já existente em formatação diferente
- **GIVEN** um cliente já cadastrado com CPF 384.526.170-62
- **WHEN** o usuário tenta cadastrar um novo cliente com CPF 38452617062
  (mesmos dígitos, sem máscara)
- **THEN** o sistema rejeita o cadastro como duplicata, sem criar um segundo
  registro
