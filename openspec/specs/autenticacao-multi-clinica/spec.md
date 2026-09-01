# Autenticação e acesso multi-clínica

## Contexto

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

### Requirement: Troca de clínica sem novo login
O sistema SHALL permitir trocar a clínica ativa a partir de dentro do painel,
sem exigir nova autenticação, desde que o usuário já tenha vínculo com a clínica
de destino.

#### Scenario: Trocar de clínica pelo painel
- **GIVEN** um usuário autenticado, atualmente na Clínica A, também vinculado à Clínica B
- **WHEN** ele aciona "trocar de clínica" e escolhe a Clínica B
- **THEN** o sistema atualiza a `clinicaId` da sessão e recarrega o painel com
  dados exclusivos da Clínica B

### Requirement: Isolamento de dados entre clínicas
O sistema SHALL garantir que nenhuma query retorne dados de uma clínica diferente
da `clinicaId` ativa na sessão, independentemente da tela ou endpoint.

#### Scenario: Tentativa de acesso cruzado
- **GIVEN** um usuário autenticado na Clínica A
- **WHEN** ele tenta acessar (via URL direta ou API) um recurso (paciente,
  agendamento, comanda) que pertence à Clínica B
- **THEN** o sistema responde como se o recurso não existisse (404), não como
  "acesso negado" (403) — para não confirmar a existência do recurso em outro tenant
