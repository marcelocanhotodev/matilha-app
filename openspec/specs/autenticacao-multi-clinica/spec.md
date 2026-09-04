# Autenticação e acesso multi-clínica

## Purpose

> Referência visual: `openspec/reference/prototipo.html`, seção `#auth-screen (login) — abre automaticamente ao carregar o arquivo`.


Um usuário (dono de clínica, veterinário, recepcionista) pode ter acesso a mais
de uma clínica, com papéis diferentes em cada uma. O login não define sozinho
"qual clínica" — isso é um passo separado, escolhido explicitamente.

## Requirements

### Requirement: Login por e-mail e senha
O sistema SHALL autenticar usuários por e-mail e senha (hash bcrypt), emitindo
uma sessão JWT em caso de sucesso.

#### Scenario: Login válido
- **GIVEN** um usuário cadastrado com e-mail `ana@vidaanimal.com.br`
- **WHEN** ele envia e-mail e senha corretos no formulário de login
- **THEN** o sistema cria uma sessão e redireciona para a seleção de clínica

#### Scenario: Senha incorreta
- **GIVEN** um usuário cadastrado
- **WHEN** ele envia a senha errada
- **THEN** o sistema rejeita o login e exibe uma mensagem genérica de erro
  (nunca indicar se o e-mail existe ou não, por segurança)

### Requirement: Seleção de clínica após login
Se o usuário tem vínculo ativo com mais de uma clínica (via `UsuarioClinica`),
o sistema SHALL exibir uma tela de seleção antes de liberar o painel. Se tem
vínculo com apenas uma, o sistema SHALL pular direto para o painel dessa clínica.

#### Scenario: Usuário com múltiplas clínicas
- **GIVEN** um usuário vinculado a 3 clínicas diferentes
- **WHEN** ele completa o login
- **THEN** o sistema lista as 3 clínicas para escolha, cada uma com o papel do
  usuário naquela clínica (ex: "Recepção", "Veterinário(a)")

#### Scenario: Usuário com uma única clínica
- **GIVEN** um usuário vinculado a apenas 1 clínica
- **WHEN** ele completa o login
- **THEN** o sistema já abre o painel dessa clínica, sem tela intermediária

### Requirement: Troca de clínica exige logout e novo login
O sistema SHALL NOT oferecer, dentro do painel, nenhuma forma de trocar a
`clinicaId` ativa de uma sessão já autenticada. A única forma de um usuário
passar a operar em outra clínica vinculada é encerrar a sessão atual (ver
Requirement "Logout encerra a sessão") e autenticar de novo, passando pela
seleção de clínica (Requirement "Seleção de clínica após login").

#### Scenario: Não existe ponto de troca dentro do painel
- **GIVEN** um usuário autenticado, atualmente na Clínica A, também vinculado à Clínica B
- **WHEN** ele navega por qualquer tela do painel
- **THEN** não há nenhum controle (botão, link ou menu) que troque a
  `clinicaId` ativa sem antes encerrar a sessão

#### Scenario: Trocar de clínica saindo e entrando de novo
- **GIVEN** um usuário autenticado, atualmente na Clínica A, também vinculado à Clínica B
- **WHEN** ele faz logout e entra de novo com as mesmas credenciais
- **THEN** o sistema exibe a tela de seleção de clínica (por ter mais de um
  vínculo) e, ao escolher a Clínica B, o painel carrega com a `clinicaId` da
  Clínica B ativa

### Requirement: Logout encerra a sessão
O sistema SHALL permitir que um usuário autenticado encerre a própria sessão
a qualquer momento a partir do painel, invalidando a sessão e redirecionando
para a tela de login.

#### Scenario: Logout a partir do painel
- **GIVEN** um usuário autenticado, em qualquer tela do painel
- **WHEN** ele aciona "Sair"
- **THEN** a sessão é encerrada e o sistema redireciona para `/login`

#### Scenario: Rota protegida após logout exige novo login
- **GIVEN** um usuário que acabou de fazer logout
- **WHEN** ele tenta acessar diretamente uma URL do painel (ex.: `/dashboard`)
- **THEN** o sistema redireciona para `/login`, sem expor nenhum dado do
  painel

### Requirement: Isolamento de dados entre clínicas
O sistema SHALL garantir que nenhuma query retorne dados de uma clínica diferente
da `clinicaId` ativa na sessão, independentemente da tela ou endpoint.

#### Scenario: Tentativa de acesso cruzado
- **GIVEN** um usuário autenticado na Clínica A
- **WHEN** ele tenta acessar (via URL direta ou API) um recurso (paciente,
  agendamento, comanda) que pertence à Clínica B
- **THEN** o sistema responde como se o recurso não existisse (404), não como
  "acesso negado" (403) — para não confirmar a existência do recurso em outro tenant
