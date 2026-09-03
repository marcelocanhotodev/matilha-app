## REMOVED Requirements

### Requirement: Troca de clínica sem novo login
**Reason**: O produto passa a exigir logout + novo login para trocar de
clínica — ver Requirement "Troca de clínica exige logout e novo login" nesta
mesma capability.
**Migration**: Nenhuma migração de dados. Quem precisar trabalhar em outra
clínica deve sair (botão "Sair" na sidebar, ver capability `navegacao`) e
entrar de novo — a tela `/selecionar-clinica` (Requirement "Seleção de
clínica após login") já cobre a escolha da clínica ativa.

O sistema SHALL permitir trocar a clínica ativa a partir de dentro do painel,
sem exigir nova autenticação, desde que o usuário já tenha vínculo com a clínica
de destino.

#### Scenario: Trocar de clínica pelo painel
- **GIVEN** um usuário autenticado, atualmente na Clínica A, também vinculado à Clínica B
- **WHEN** ele aciona "trocar de clínica" e escolhe a Clínica B
- **THEN** o sistema atualiza a `clinicaId` da sessão e recarrega o painel com
  dados exclusivos da Clínica B

## ADDED Requirements

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
