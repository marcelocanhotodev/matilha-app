## Context

`src/app/(dashboard)/layout.tsx` é hoje um Server Component mínimo: resolve sessão
+ clínica ativa e renderiza um `<header>` só com `<ClinicSwitcher>`. As 7 páginas
de rota já existem sob `(dashboard)/` (algumas com UI real — `pacientes`,
`clientes`, `cadastro` — outras ainda `TODO` — `dashboard`, `agenda`,
`atendimento`, `historico`). O protótipo (`openspec/reference/prototipo.html`,
seção `.sidebar`) define o padrão visual: coluna fixa de 248px, gradiente
`pine-800→pine-900`, marca no topo, lista de `nav-item` (ícone SVG inline + rótulo,
item ativo em dourado), e um `clinic-pill` fixado no rodapé. Ver
`openspec/specs/navegacao/spec.md` para os requirements.

`tailwind.config.ts` já define as cores (`pine`, `sage`, `sand`, `gold`) e famílias
de fonte (`font-display`/`font-sans`/`font-mono`) do protótipo — usadas por várias
telas já implementadas (`font-display` em títulos). Carregar as fontes do Google
Fonts em si (hoje não carregadas em `src/app/layout.tsx`) é uma lacuna pré-existente,
alheia a esta sidebar, e não é resolvida aqui.

## Goals / Non-Goals

**Goals:**
- Sidebar fixa com os 7 itens de navegação, destaque de rota ativa, e o cartão de
  clínica ativa no rodapé, reproduzindo o visual do protótipo com Tailwind.
- Colapso para barra horizontal abaixo de 980px, como no protótipo.
- Reaproveitar `<ClinicSwitcher>` já existente (mesma lógica de troca de clínica),
  só ajustando estilo para caber no rodapé escuro da sidebar.

**Non-Goals:**
- Topbar (busca, "Novo agendamento"), breadcrumbs ou qualquer elemento de conteúdo
  das telas — pertence a cada capability de tela, não a esta.
- Sidebar recolhível/expansível por escolha do usuário (o protótipo não tem esse
  controle; só o colapso automático por breakpoint).
- Carregar as fontes do Google Fonts (Fraunces/Inter/IBM Plex Mono) — lacuna
  pré-existente e ortogonal a este change.
- Papéis/permissões por item de menu — todas as 7 rotas são visíveis a qualquer
  usuário autenticado com clínica ativa, sem filtro por `papel`.

## Decisions

### A lista de rotas é uma constante estática no componente, não vinda do roteador
**Decisão**: um array `[{ href, label, icon }]` hardcoded no componente da
sidebar, na mesma ordem do protótipo.
**Alternativas consideradas**: gerar a lista dinamicamente a partir da estrutura
de pastas de `(dashboard)/`. Rejeitada — Next.js não expõe essa introspecção em
runtime de forma simples/estável, e a ordem/rótulo de cada item é uma decisão de
produto (vem do protótipo), não uma derivação mecânica do filesystem.

### Item ativo via `usePathname()` num Client Component isolado
**Decisão**: o `layout.tsx` do painel continua Server Component (mantém a busca
de sessão/clínicas ali). A lista de navegação em si (`<SidebarNav>`) é um Client
Component pequeno que usa `usePathname()` do App Router para decidir qual item
está ativo — mesmo padrão já usado no repo para isolar estado de cliente
(`<ClientesTable>`, `<PacientesGrid>`, `<ClinicSwitcher>`) dentro de páginas/layouts
Server Component.
**Alternativas consideradas**: destacar a rota ativa via CSS puro
(`:has(a[aria-current])`) evitando JS — mais frágil para o caso de sub-rota
destacar o item pai (`/pacientes/123` → item "Pacientes"), que precisa de um
`pathname.startsWith(href)` em vez de igualdade exata.

### `ClinicSwitcher` ganha uma variante visual para o rodapé escuro da sidebar
**Decisão**: adicionar uma prop de variante (ex.: `variant="sidebar"`) ao
`ClinicSwitcher` existente, em vez de duplicar o componente. A lógica de troca
(`useTrocarClinica`, dropdown de outras clínicas) não muda — só as classes
Tailwind (fundo claro do header atual vs. fundo escuro/`rgba(255,255,255,.05)`
do `clinic-pill` do protótipo).
**Alternativas consideradas**: criar um componente novo `ClinicPill` duplicando a
lógica de `ClinicSwitcher`. Rejeitada — duplicaria o hook de troca e o tratamento
de erro sem necessidade.

### Ícones: SVG inline copiado do protótipo, sem biblioteca
**Decisão**: manter os mesmos `<svg>` inline do protótipo (um por item de nav),
coerente com "não usar bibliotecas de UI pesadas fora do Tailwind/shadcn sem
justificativa" (`project.md`). Nenhuma dependência nova.

### Breakpoint responsivo via `lg:` do Tailwind (≥1024px, não 980px)
**Decisão**: o protótipo usa um breakpoint customizado de 980px; o Tailwind
padrão mais próximo é `lg` (1024px). Usar `lg:` (padrão do projeto, sem
configurar breakpoint customizado) em vez de replicar 980px exatamente.
**Trade-off aceito**: entre 980px e 1024px a sidebar fica horizontal no
scaffold onde no protótipo já seria vertical — diferença pequena, não observável
como regressão de comportamento (a spec usa "menor que 980px"/"a partir de
980px" como descrição do comportamento do protótipo; a **implementação real
prioriza o breakpoint padrão do Tailwind já usado no restante do projeto** em
vez de introduzir uma tela customizada só para este componente).

## Risks / Trade-offs

- [Risco] Rótulos/ordem dos itens divergirem do protótipo com o tempo (ex.: nova
  rota adicionada sem atualizar a sidebar) → Mitigação: a lista de itens vive num
  único array, próximo ao componente, com comentário apontando para
  `openspec/specs/navegacao/spec.md` como fonte da ordem/rótulos esperados.
- [Risco] `ClinicSwitcher` com variante de estilo introduz um branch de props que
  cresce se surgirem mais variantes → Mitigação: só duas variantes previstas
  (header claro atual, rodapé escuro da sidebar); se surgir uma terceira,
  reavaliar extração de estilos.
- [Trade-off] Breakpoint 1024px (`lg`) em vez de 980px do protótipo → aceito,
  ver Decisão acima.
