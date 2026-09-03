## Context

Ver `proposal.md` (Why) para a motivação. Estado atual relevante:

- `src/app/(dashboard)/dashboard/page.tsx` é hoje um Server Component
  simples: busca `comandasAbertas` e renderiza um aviso condicional. Nenhum
  Client Component existe nessa tela ainda.
- O projeto não tem nenhuma biblioteca de gráficos hoje (`package.json` não
  lista nenhuma).
- Dados disponíveis para os 4 gráficos: `Comanda` (`status`, `total`,
  `formaPagamento`, `criadoEm`, `clienteId`, `clinicaId`), `ComandaItem`
  (`comandaId`, `itemCatalogoId`, `quantidade`, `subtotal`), `ItemCatalogo`
  (`nome`), `Cliente` (`nome`). `formaPagamento` só é preenchida quando a
  comanda é finalizada (comentário no schema); `Comanda` não tem um campo
  `finalizadoEm` separado — só `criadoEm` (quando a comanda nasceu, não
  quando foi finalizada).
- Padrão já estabelecido no projeto para Server Component + Client
  Component isolado: `agenda/page.tsx` (Server, agrega e resolve dados) +
  `grade-semanal.tsx` (Client, só renderiza o que já chegou pronto). Os
  gráficos seguem o mesmo corte.
- Skill `dataviz` está disponível neste ambiente Claude Code — traz uma
  metodologia de paleta/forma/acessibilidade pra visualizações. Não é
  código do projeto, é orientação a ser consultada na hora de implementar
  cada gráfico (registrado em `tasks.md`).

## Goals / Non-Goals

**Goals:**
- 4 gráficos funcionais no Painel, cada um lendo dados reais e já
  respeitando isolamento por `clinicaId`.
- Escolher e justificar uma biblioteca de gráficos única, reaproveitável
  para qualquer gráfico futuro do produto (não só estes 4).

**Non-Goals:**
- Filtro de período configurável pelo usuário (hoje/semana/mês/intervalo)
  — mesma postura já registrada em `historico-financeiro`
  ("Filtro por período (evolução futura)... uma change separada"). Os 4
  gráficos desta change usam janelas fixas (all-time para os rankings,
  últimos 14 dias para a série temporal).
- Implementar o restante do placeholder do Painel que vem do protótipo
  (stat cards de agenda do dia, próximos atendimentos, "matilha de hoje",
  aniversariantes) — nada disso é gráfico, fica de fora desta change.
- Exportar/imprimir os gráficos, ou qualquer interatividade além de
  tooltip ao passar o mouse.
- Cache/otimização de performance além de uma query razoável por
  gráfico — volume de comandas hoje é pequeno (dado de clínica única,
  não uma rede); revisitar se isso mudar.

## Decisions

### Decisão 1: Recharts como biblioteca de gráficos

**Alternativas consideradas:**
- **Chart.js** (via `react-chartjs-2`): baseado em `<canvas>`, não em
  componentes React nativos — API menos idiomática nesta stack (JSX
  declarativo o resto do projeto todo), e customização de tema via objeto
  de configuração JS em vez de props/CSS.
- **Nivo**: também baseado em componentes React e SVG, mas
  significativamente mais pesado (múltiplos pacotes por tipo de gráfico) e
  mais opinativo em tema — mais do que o necessário para 4 gráficos
  simples.
- **visx**: baixo nível (primitivas de escala/eixo, não gráficos prontos)
  — exigiria montar cada um dos 4 gráficos praticamente do zero.

**Escolha**: **Recharts** — componentes React declarativos, SVG (crisp,
tematizável direto com as cores do `tailwind.config.ts` via props, sem
config JS separada), pacote único, biblioteca já estabelecida no
ecossistema React/Next.js (é a base dos componentes de gráfico do próprio
shadcn/ui, que o projeto já usa para outros componentes). Justifica a
exceção à regra "não usar bibliotecas de UI pesadas sem justificativa" do
`project.md`: sem uma lib de gráficos não existe visualização gráfica
possível — não há alternativa "sem biblioteca" razoável aqui.

### Decisão 2: Corte Server Component (agregação) + Client Component (renderização)

Cada gráfico é um par: uma função de agregação chamada no Server Component
`dashboard/page.tsx` (uma query Prisma por gráfico, já filtrada por
`clinicaId` via `getClinicaAtual()` e por `status: "FINALIZADA"`), e um
Client Component pequeno e "burro" que só recebe os dados já prontos
(formato `{ label, valor }[]` ou equivalente) e desenha o gráfico Recharts
— Recharts precisa de `ResizeObserver`/medição de layout, então só pode
rodar no client, mas nenhuma query Prisma deve vazar pra lá. Mesmo
princípio de `agenda/page.tsx` + `grade-semanal.tsx`.

### Decisão 3: Onde mora a agregação — funções em `src/lib/`, não inline na página

As 4 queries de agregação (itens mais vendidos, clientes com mais consumo,
faturamento por forma de pagamento, faturamento por dia) viram funções
próprias em um módulo novo (ex.: `src/lib/painel-analitico.ts`), não
inline dentro de `dashboard/page.tsx` — a página já vai empilhar essas 4
chamadas mais a contagem de comandas abertas existente; funções nomeadas
mantêm o Server Component legível e cada agregação testável isoladamente
(Vitest, mesmo padrão dos outros módulos de `src/lib/`).

### Decisão 4: Faturamento por dia usa `criadoEm`, não um campo de finalização

Como `Comanda` não tem `finalizadoEm`, o gráfico de série temporal agrupa
por `criadoEm` (data em que o atendimento começou) das comandas já
finalizadas — não pela data em que foram efetivamente fechadas. Na prática
a maioria dos atendimentos finaliza no mesmo dia em que começam, então a
diferença é pequena; documentado aqui para não ser assumido como bug se
alguém notar uma comanda finalizada dias depois de aberta aparecendo na
data de abertura. Adicionar `finalizadoEm` ao schema é uma migração fora
do escopo desta change (nenhum dos requirements dos outros 3 gráficos
precisa dela).

### Decisão 5: Paleta e forma de cada gráfico — decidido na implementação, via skill `dataviz`

Este design não fixa cores/formas exatas dos 4 gráficos (barra horizontal
vs. vertical, tom exato de cada série) — a skill `dataviz` já cobre
metodologia de paleta categórica/sequencial e acessibilidade, e deve ser
carregada antes de escrever o primeiro componente de gráfico (task
registrada em `tasks.md`). O que este design fixa: os tokens de cor já
existentes (`pine`/`sage`/`sand`/`gold` do `tailwind.config.ts`) são o
ponto de partida da paleta — nenhuma cor arbitrária fora desse sistema sem
justificativa, mesma regra de qualquer outra tela do produto.

## Risks / Trade-offs

- [Risco] `Comanda.criadoEm` como proxy de "data da venda" (Decisão 4)
  pode distorcer o gráfico de faturamento por dia em clínicas onde
  atendimentos ficam abertos por vários dias antes de finalizar →
  Mitigação: comportamento hoje raro (fluxo normal finaliza no mesmo dia);
  documentado explicitamente, fácil de revisitar se virar problema real.
- [Trade-off] Sem filtro de período (Non-Goal): rankings all-time podem
  ficar menos úteis conforme o histórico cresce (um item que vendeu muito
  há um ano continua no topo mesmo sem vender mais agora) → aceito porque
  filtro de período já é uma frente própria documentada em
  `historico-financeiro`, não algo a duplicar aqui.
- [Risco] Recharts é uma dependência nova de UI (SVG/DOM) — pacote deve
  ser mantido atualizado como qualquer outra dependência de `package.json`
  (sem tratamento especial).
