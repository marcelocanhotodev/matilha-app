## Purpose

Dá ao usuário autenticado uma navegação sempre visível entre as telas do painel
(Painel, Agenda, Pacientes, Clientes, Atendimento, Cadastro, Histórico) e o ponto
de acesso à clínica ativa, seguindo o padrão visual e comportamental validado no
protótipo de referência.

## ADDED Requirements

### Requirement: Lista de navegação com todas as rotas do painel
A sidebar SHALL exibir, nesta ordem, um item de navegação para cada rota hoje
disponível em `(dashboard)`: Painel (`/dashboard`), Agenda (`/agenda`), Pacientes
(`/pacientes`), Clientes (`/clientes`), Atendimento (`/atendimento`), Cadastro
(`/cadastro`) e Histórico (`/historico`). A sidebar SHALL ser exibida em toda
página dentro do grupo de rotas `(dashboard)` (usuário autenticado e com clínica
ativa selecionada).

#### Scenario: Usuário autenticado acessa qualquer tela do painel
- **WHEN** um usuário autenticado, com clínica ativa selecionada, visualiza
  qualquer rota de `(dashboard)`
- **THEN** a sidebar exibe os 7 itens de navegação, cada um com rótulo e destino
  correspondentes à rota real

#### Scenario: Clique em um item de navegação
- **WHEN** o usuário clica em um item da sidebar (ex.: "Pacientes")
- **THEN** o sistema navega para a rota correspondente (`/pacientes`) sem
  recarregar a página inteira

### Requirement: Destaque da rota ativa
O item de navegação cujo destino corresponde à rota atualmente exibida SHALL ser
apresentado visualmente destacado (estado "active"), e nenhum outro item SHALL
estar destacado ao mesmo tempo. Uma sub-rota (ex.: `/pacientes/123`, quando
existir) SHALL manter destacado o item da rota-pai correspondente (`Pacientes`).

#### Scenario: Rota atual é uma das 7 rotas principais
- **WHEN** o usuário está em `/clientes`
- **THEN** o item "Clientes" é exibido com o estilo de item ativo e os demais 6
  itens não são

#### Scenario: Rota atual é uma sub-rota de uma das rotas principais
- **WHEN** o usuário está em uma sub-rota de `/pacientes` (ex.: `/pacientes/123`)
- **THEN** o item "Pacientes" é exibido com o estilo de item ativo

### Requirement: Acesso à clínica ativa a partir da sidebar
O rodapé da sidebar SHALL exibir o nome da clínica atualmente ativa e SHALL
oferecer o ponto de entrada para trocar de clínica (o comportamento da própria
troca é especificado em `autenticacao-multi-clinica` — Requirement: Troca de
clínica sem novo login).

#### Scenario: Rodapé exibe a clínica ativa
- **WHEN** o usuário visualiza qualquer tela do painel
- **THEN** o rodapé da sidebar exibe o nome da clínica atualmente ativa

### Requirement: Navegação adaptada a telas estreitas
Em viewports estreitos (largura menor que 980px), a sidebar SHALL ser exibida
como uma barra horizontal rolável, no topo da página, com os mesmos itens de
navegação, sem o cartão de clínica ativa. Em viewports a partir de 980px, a
sidebar SHALL ser exibida como uma coluna fixa lateral com o cartão de clínica
ativa visível.

#### Scenario: Viewport estreito
- **WHEN** a largura da janela é menor que 980px
- **THEN** a navegação é exibida como barra horizontal no topo, sem o cartão de
  clínica ativa

#### Scenario: Viewport padrão
- **WHEN** a largura da janela é 980px ou maior
- **THEN** a navegação é exibida como coluna fixa lateral, com o cartão de
  clínica ativa visível no rodapé
