## Why

Hoje `src/app/(dashboard)/layout.tsx` só hospeda o seletor de clínica; não existe
navegação entre as telas do painel. O usuário precisa digitar a URL de cada rota
(`/dashboard`, `/agenda`, `/pacientes`, `/clientes`, `/atendimento`, `/cadastro`,
`/historico`) manualmente. Todas as 7 rotas já existem como páginas (algumas
implementadas, algumas ainda `TODO`), e o protótipo de referência
(`openspec/reference/prototipo.html`) já define o padrão visual e comportamental
de uma sidebar fixa com esses mesmos itens — falta apenas construí-la no scaffold
Next.js e ligá-la às rotas reais.

## What Changes

- Adicionar uma sidebar fixa (`<aside>`) ao layout do painel (`(dashboard)/layout.tsx`),
  seguindo o visual do protótipo: marca "Matilha" no topo, lista de navegação, e o
  cartão de clínica ativa no rodapé.
- A lista de navegação cobre as 7 rotas hoje existentes em `(dashboard)`, na mesma
  ordem e com os mesmos rótulos/ícones do protótipo: Painel (`/dashboard`), Agenda
  (`/agenda`), Pacientes (`/pacientes`), Clientes (`/clientes`), Atendimento
  (`/atendimento`), Cadastro (`/cadastro`), Histórico (`/historico`).
- O item correspondente à rota atual fica destacado ("active"), incluindo quando a
  rota atual é uma sub-rota (ex.: futura `/pacientes/123`).
- O cartão de clínica ativa no rodapé da sidebar absorve o `ClinicSwitcher` atual
  (mesmo comportamento de troca de clínica), no lugar do header hoje usado em
  `(dashboard)/layout.tsx`.
- Em telas estreitas (< 980px, breakpoint do protótipo), a sidebar colapsa para uma
  barra horizontal rolável no topo, sem o cartão de clínica (mesmo comportamento do
  protótipo).
- Nenhuma rota nova é criada e nenhuma página existente muda de comportamento —
  apenas a casca de navegação ao redor delas.

## Capabilities

### New Capabilities
- `navegacao`: navegação principal do painel (sidebar) — lista de rotas disponíveis,
  destaque da rota ativa, e o ponto de acesso à troca de clínica.

### Modified Capabilities
(nenhuma — as capabilities de cada tela, ex. `pacientes`, `clientes`, não têm
requirement alterado; só passam a ser alcançáveis por um link em vez de URL direta)

## Impact

- **Código**: `src/app/(dashboard)/layout.tsx` (reestruturado para incluir a
  sidebar), novo componente de navegação (ex.: `src/app/(dashboard)/sidebar.tsx` +
  `sidebar-nav-item.tsx` client component para o estado de rota ativa).
  `src/app/(dashboard)/clinic-switcher.tsx` é reaproveitado, com ajuste visual para
  caber no rodapé da sidebar (fundo escuro em vez de branco).
- **Nenhuma rota, schema Prisma ou Server Action muda.**
- **Dependências**: nenhuma nova dependência de pacote — ícones seguem o padrão do
  protótipo (SVG inline), sem biblioteca de ícones.
