## ADDED Requirements

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

## REMOVED Requirements

### Requirement: Exclusão bloqueada quando há pacientes vinculados
**Reason**: A exclusão física de cliente foi substituída por inativação
lógica (ver Requirement "Inativação lógica de cliente"). Como inativar nunca
apaga ou desvincula dado nenhum, a premissa de "bloquear a exclusão quando há
vínculo" deixa de fazer sentido — não há mais risco de perda de dado a
proteger contra.

**Migration**: Não há exclusão física de cliente no produto. Onde a UI antes
oferecia "Excluir", passa a oferecer "Inativar" (e "Reativar" para um cliente
já inativo). Nenhuma migração de dado além do novo campo `Cliente.ativo`
(default `true` para registros existentes).
