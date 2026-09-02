## 1. Componente de navegação da sidebar

- [x] 1.1 Criar `src/app/(dashboard)/sidebar-nav.tsx` (Client Component) com o
      array estático dos 7 itens (`href`, `label`, ícone SVG inline), na ordem
      de `openspec/specs/navegacao/spec.md` — Painel, Agenda, Pacientes,
      Clientes, Atendimento, Cadastro, Histórico. Verificar renderizando a
      página e conferindo visualmente os 7 rótulos, na ordem certa, com os
      `href` corretos (inspecionar os `<a>` gerados).
- [x] 1.2 Usar `usePathname()` para marcar o item ativo: igualdade exata para
      `/dashboard`, e `pathname === href || pathname.startsWith(href + "/")`
      para as demais (cobre sub-rota futura destacando o item pai). Verificar
      navegando manualmente para cada uma das 7 rotas e confirmando que só o
      item correspondente recebe o estilo ativo (fundo dourado, conforme o
      protótipo).
- [x] 1.3 Estilizar os itens com Tailwind reproduzindo `.nav-item`/`.nav-item.active`
      do protótipo (`openspec/reference/prototipo.html`, seção `Sidebar`):
      texto `sage-300`, hover com fundo translúcido, ativo com fundo `gold-500`
      e texto `pine-900`. Verificar visualmente lado a lado com o protótipo
      aberto no navegador.

## 2. Variante da sidebar para o `ClinicSwitcher`

- [x] 2.1 Adicionar uma prop de variante (`variant: "header" | "sidebar"`, default
      `"header"`) a `src/app/(dashboard)/clinic-switcher.tsx`, sem alterar a
      lógica de `useTrocarClinica`/dropdown — só as classes Tailwind do botão
      trigger (fundo escuro translúcido, texto claro, no padrão `.clinic-pill`
      do protótipo, em vez do fundo branco atual). Verificar que a variante
      `"header"` mantém o visual atual inalterado (nenhuma outra tela que a usa
      muda de aparência).
- [x] 2.2 Na variante `"sidebar"`, exibir também o papel do usuário na clínica
      ativa (`papel`) abaixo do nome, como no `clinic-pill-text .role` do
      protótipo. Verificar visualmente com um usuário de teste com papel
      definido.

## 3. Montagem da sidebar no layout do painel

- [x] 3.1 Criar `src/app/(dashboard)/sidebar.tsx` (Server Component) que recebe
      `clinicas`/`clinicaAtivaId` e renderiza: marca "Matilha" no topo,
      `<SidebarNav>`, e `<ClinicSwitcher variant="sidebar">` no rodapé — layout
      flex-column, largura fixa (`w-[248px]`), fundo em gradiente `pine-800`→
      `pine-900`, `sticky top-0 h-screen`, replicando `.sidebar` do protótipo.
      Verificar visualmente comparando com a seção `.sidebar` do protótipo.
- [x] 3.2 Reescrever `src/app/(dashboard)/layout.tsx` para usar `<div className="flex">`
      (ou grid) com `<Sidebar>` + `<main>{children}</main>` no lugar do
      `<header>` atual, mantendo os redirects de sessão/clínica ativa e a busca
      de `listarClinicasDoUsuario` já existentes. Verificar rodando `npm run dev`
      e abrindo `/dashboard`: a sidebar aparece à esquerda, o conteúdo da
      página ao lado.
- [x] 3.3 Confirmar que as 7 páginas (`/dashboard`, `/agenda`, `/pacientes`,
      `/clientes`, `/atendimento`, `/cadastro`, `/historico`) renderizam
      normalmente dentro do novo layout, sem erro de hidratação no console.
      Verificar navegando manualmente por cada rota com o servidor de dev
      rodando e checando o console do navegador.

## 4. Comportamento responsivo

- [x] 4.1 Adicionar classes `lg:` para o comportamento em telas largas
      (coluna fixa lateral, cartão de clínica visível) e o comportamento
      default/mobile (barra horizontal rolável no topo, sem cartão de
      clínica) — conforme Decisão de breakpoint em `design.md`. Verificar
      redimensionando a janela do navegador (ou DevTools em modo responsivo)
      cruzando os 1024px e observando a transição.

## 5. Verificação final

- [x] 5.1 Rodar `npm run lint` e `npm run build` (ou o comando de typecheck do
      projeto) e confirmar que passam sem erros novos introduzidos por este
      change. `npm run lint` pede setup interativo do ESLint (projeto nunca
      teve `.eslintrc`/`eslint.config` — lacuna pré-existente, alheia a este
      change); verificado com `npx tsc --noEmit` (limpo) e `npm run build`
      (compilação e geração das 13 rotas concluídas sem erro).
- [x] 5.2 Revisar cada cenário de `openspec/specs/navegacao/spec.md` manualmente
      contra a UI implementada (lista completa de rotas, destaque de rota
      ativa, cartão de clínica no rodapé, colapso responsivo) e confirmar que
      todos passam. Verificado logado como `ana@vidaanimal.com.br` (seed),
      navegando pelas 7 rotas via clique nos itens da sidebar (Next `<Link>`,
      sem reload de página): em cada uma só o item correspondente ficava
      destacado, e o rodapé sempre mostrou "Clínica Vida Animal". O cenário
      de sub-rota (`/pacientes/123`) não tem página real ainda nesta versão
      do app — a lógica (`pathname.startsWith(href + "/")`) foi conferida por
      leitura de código, não por clique real. O colapso responsivo foi
      conferido pela regra `@media (min-width: 1024px)` presente no CSS
      compilado para `.lg\:sticky`/`.lg\:flex-col`/`.lg\:overflow-visible`
      (ver tarefa 4.1) — não foi possível redimensionar a janela real do
      Chrome neste ambiente para observar a transição ao vivo.
