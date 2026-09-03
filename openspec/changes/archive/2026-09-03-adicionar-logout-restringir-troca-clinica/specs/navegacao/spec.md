## MODIFIED Requirements

### Requirement: Acesso à clínica ativa a partir da sidebar
O rodapé da sidebar SHALL exibir o nome da clínica atualmente ativa, de forma
somente informativa — a sidebar SHALL NOT oferecer nenhum ponto de entrada
para trocar de clínica a partir dali (troca de clínica passa a exigir
logout, ver `autenticacao-multi-clinica` — Requirement: Troca de clínica
exige logout e novo login).

#### Scenario: Rodapé exibe a clínica ativa
- **WHEN** o usuário visualiza qualquer tela do painel
- **THEN** o rodapé da sidebar exibe o nome da clínica atualmente ativa

#### Scenario: Cartão de clínica ativa não abre seletor
- **WHEN** o usuário clica no cartão de clínica ativa no rodapé da sidebar
- **THEN** nada acontece — não existe dropdown nem qualquer outro controle
  para trocar de clínica a partir dali

## ADDED Requirements

### Requirement: Botão de logout na sidebar
O rodapé da sidebar SHALL exibir um botão "Sair", visível em toda tela do
painel, que aciona o logout (`autenticacao-multi-clinica` — Requirement:
Logout encerra a sessão).

#### Scenario: Botão de logout visível
- **WHEN** o usuário visualiza qualquer tela do painel
- **THEN** o rodapé da sidebar exibe, junto ao nome da clínica ativa, um
  botão "Sair"

#### Scenario: Clique em "Sair"
- **WHEN** o usuário clica no botão "Sair"
- **THEN** a sessão é encerrada e o usuário é redirecionado para a tela de
  login
