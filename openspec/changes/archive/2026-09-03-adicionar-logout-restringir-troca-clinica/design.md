## Context

Ver proposal.md - Why. Hoje o rodapé da sidebar é um único componente,
`src/app/(dashboard)/clinic-switcher.tsx` (`ClinicSwitcher`), usado só como
`<ClinicSwitcher variant="sidebar">` em `sidebar.tsx`. Ele guarda estado
`aberto` e chama `useTrocarClinica()` (`src/lib/hooks/use-trocar-clinica.ts`),
que por sua vez chama a Server Action `selecionarClinica`
(`src/lib/actions/clinica.ts`) e `useSession().update({ clinicaAtivaId })`.
A variante `variant="header"` do componente não tem nenhum uso no código
atual (confirmado por busca — só aparece na própria definição).

**Correção descoberta durante a implementação**: `useTrocarClinica` (e por
tabela `selecionarClinica`) NÃO é usado só pelo `ClinicSwitcher` — também é
usado por `src/app/(auth)/selecionar-clinica/clinic-option-list.tsx`, o
Client Component da tela `/selecionar-clinica` (Requirement "Seleção de
clínica após login", que esta change explicitamente não altera). Essa tela só
é alcançável quando a sessão AINDA NÃO tem `clinicaAtivaId`
(`page.tsx` redireciona pra `/` se já tiver) — ou seja, `selecionarClinica`
continua sendo a operação de "escolher a clínica ativa pela primeira vez",
nunca uma troca de uma clínica já ativa por outra. Apagar a action/hook
quebraria o login de qualquer usuário com mais de um vínculo. A decisão
abaixo foi revisada: a action e o hook **continuam existindo**, só perdem o
único chamador que configurava uma troca depois de já autenticado.

O login (`src/app/(auth)/login/login-form.tsx`) já chama `signIn` de
`"next-auth/react"` direto no client, sem passar por uma Server Action —
esse é o precedente a seguir para o logout.

## Goals / Non-Goals

**Goals:**
- Um botão "Sair" funcional no rodapé da sidebar, visível em toda tela do
  painel.
- Nenhum caminho de UI (ou action reaproveitável por uma UI futura) capaz de
  trocar `clinicaId` ativa sem passar por um logout de verdade.

**Non-Goals:**
- Confirmação ("tem certeza que quer sair?") antes do logout — nenhum outro
  fluxo do produto usa modal de confirmação para uma ação reversível como
  essa (contraste com `window.confirm` em inativar cliente/paciente, que
  descreve consequência de negócio, não risco de sessão).
- Qualquer mudança em `/selecionar-clinica`, `middleware.ts` ou
  `src/lib/clinica-selecao.ts` — o fluxo pós-login já cobre a escolha de
  clínica; esta change só remove o atalho que existia depois do login.
- "Lembrar" a última clínica escolhida entre sessões — fora de escopo, não
  pedido.

## Decisions

### Logout é uma chamada client-side a `signOut()`, não uma Server Action
Usa `signOut` de `"next-auth/react"` (`signOut({ redirect: true, callbackUrl:
"/login" })`) direto no componente client do rodapé, no mesmo padrão que
`login-form.tsx` já usa `signIn` de `"next-auth/react"`. `signOut` cuida de
invalidar o JWT/cookie e faz um full-page redirect para `/login` sozinho.

Alternativa considerada: expor uma Server Action que chama o `signOut` de
`src/lib/auth.ts` (Node runtime). Rejeitada — exigiria uma `<form action=...>`
ou wrapper `"use server"` só para replicar o que o client já faz em uma
chamada, sem ganho (nenhum dado sensível extra precisa ser lido/gravado no
servidor para um logout).

### `ClinicSwitcher` vira `SidebarFooter`, sem prop `variant`
Renomeia `clinic-switcher.tsx` → `sidebar-footer.tsx` (export `SidebarFooter`
no lugar de `ClinicSwitcher`). O componente perde `useState(aberto)` e a
chamada a `useTrocarClinica`; passa a renderizar só o cartão informativo da
clínica ativa (mesmo visual do cartão atual, sem o `▾` nem o `onClick` que
abria o dropdown) + o botão "Sair" ao lado. A prop `variant` é removida junto
(só existia para diferenciar de um uso `"header"` que já não existe em
lugar nenhum do código).

Alternativa considerada: manter `ClinicSwitcher` com o dropdown removido e
adicionar um `<LogoutButton>` separado, montado ao lado dele em
`sidebar.tsx`. Rejeitada — os dois elementos vivem colados visualmente no
mesmo requirement de spec ("rodapé da sidebar exibe nome da clínica + botão
Sair"); um componente só evita duas peças que sempre aparecem juntas e nunca
mudam independentemente.

### `selecionarClinica` e `useTrocarClinica` continuam existindo — só o `SidebarFooter` para de chamá-los
Ao contrário da decisão original desta seção (ver nota em Context): a action
e o hook são infraestrutura compartilhada entre "escolher a clínica ativa
pela primeira vez" (`/selecionar-clinica`, mantido) e "trocar a clínica já
ativa" (`ClinicSwitcher`, removido). Só o segundo chamador é removido nesta
change. `src/lib/actions/clinica.ts`, `src/lib/actions/clinica.test.ts` e
`src/lib/hooks/use-trocar-clinica.ts` permanecem intactos, agora com um único
chamador: `clinic-option-list.tsx`.

Isso não enfraquece o Requirement "Troca de clínica exige logout e novo
login": `selecionarClinica` só é alcançável a partir de `/selecionar-clinica`,
e essa tela redireciona embora (`redirect("/")`) sempre que a sessão já tem
`clinicaAtivaId` — não sobra nenhum caminho de UI que a chame com uma
clínica já ativa.

## Risks / Trade-offs

- [Usuário que trocava de clínica com frequência agora precisa sair e
  entrar de novo] → Trade-off intencional pedido pelo produto (proposal.md
  - Why); a tela `/selecionar-clinica` já existe e não muda, então o custo
  extra é só logout + login.
- [Remover o chamador errado de `useTrocarClinica`/`selecionarClinica`
  quebraria `/selecionar-clinica`] → Descoberto durante a implementação (ver
  Context) e corrigido: a action/hook não são apagados, só perdem o import
  em `ClinicSwitcher`/`SidebarFooter`. `clinic-option-list.tsx` continua
  funcionando sem alteração.
