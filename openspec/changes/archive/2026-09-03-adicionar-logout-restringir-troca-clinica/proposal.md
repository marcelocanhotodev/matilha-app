## Why

Hoje não existe nenhum jeito de sair da conta pela UI — `signOut` é exportado
por `src/lib/auth.ts` mas nunca chamado em lugar nenhum. Ao mesmo tempo, a
sidebar oferece um seletor de clínica que troca a `clinicaId` ativa da sessão
sem exigir login de novo (Requirement "Troca de clínica sem novo login",
`autenticacao-multi-clinica`). O pedido do produto é inverter esse modelo:
trocar de clínica deixa de ser uma ação de um clique dentro do painel e passa
a exigir sair da conta e entrar de novo — só a tela `/selecionar-clinica`
(que já existe para quem tem mais de um vínculo) decide a clínica ativa. Sem
um botão de logout visível, essa mudança tornaria impossível trocar de
clínica na prática.

## What Changes

- Adiciona um botão "Sair" na sidebar (rodapé, junto do cartão de clínica
  ativa) que encerra a sessão e redireciona para `/login`.
- **BREAKING**: remove a troca de clínica de dentro do painel. O clique no
  cartão de clínica ativa na sidebar deixa de abrir um dropdown com as
  outras clínicas vinculadas — o cartão passa a ser só informativo (mostra
  o nome da clínica ativa, não interativo para troca).
- **BREAKING**: o cartão de clínica ativa da sidebar para de chamar a
  Server Action `selecionarClinica` (`src/lib/actions/clinica.ts`) via o
  hook `useTrocarClinica` (`src/lib/hooks/use-trocar-clinica.ts`) — a
  spec deixa de garantir troca sem novo login. Action e hook continuam
  existindo: são a mesma engrenagem que a tela `/selecionar-clinica` usa
  para a primeira seleção de clínica após o login (inalterada por esta
  change), só perdem o chamador que fazia a troca dentro do painel.
- Trocar de clínica passa a significar: sair (novo botão) → tela de login →
  `/selecionar-clinica` (fluxo que já existe, inalterado) — sem nenhuma tela
  ou rota nova.

## Capabilities

### New Capabilities
(nenhuma)

### Modified Capabilities
- `autenticacao-multi-clinica`: remove o Requirement "Troca de clínica sem
  novo login" (substituído por um Requirement que exige logout + novo login
  para mudar a clínica ativa) e adiciona o Requirement "Logout encerra a
  sessão".
- `navegacao`: o Requirement "Acesso à clínica ativa a partir da sidebar"
  deixa de oferecer o ponto de entrada para troca (vira só exibição do nome
  da clínica ativa) e um novo Requirement cobre o botão de logout no rodapé
  da sidebar.

## Impact

- `src/app/(dashboard)/clinic-switcher.tsx`: perde o dropdown/estado
  `aberto` e a chamada a `useTrocarClinica`; vira exibição estática do nome
  da clínica ativa. Ganha (ou um componente irmão ganha) o botão "Sair".
  Variante `"header"` (já sem nenhum uso no código hoje) é removida junto.
- `src/app/(dashboard)/sidebar.tsx`: passa a receber e renderizar o botão de
  logout no rodapé.
- `src/lib/actions/clinica.ts`, `src/lib/actions/clinica.test.ts`,
  `src/lib/hooks/use-trocar-clinica.ts`: mantidos sem alteração — seguem
  servindo só `src/app/(auth)/selecionar-clinica/clinic-option-list.tsx`.
- `src/lib/auth.ts`: `signOut` (já exportado pelo NextAuth) passa a ser
  usado por um Client Component novo.
- Nenhuma mudança em `src/middleware.ts`, `/selecionar-clinica`,
  `clinic-option-list.tsx` ou `src/lib/clinica-selecao.ts` — o fluxo de
  login/seleção existente já cobre o caminho novo de troca de clínica.
