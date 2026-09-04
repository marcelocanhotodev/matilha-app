## Context

Ver proposal.md - Why. `historico-financeiro` (`src/lib/historico.ts`,
`src/app/(dashboard)/historico/`) já está implementada e em produção —
esta change adiciona um filtro por período em cima do que já existe, sem
tocar em `/historico/[id]` (tela de detalhe, fora de escopo).

Padrões já estabelecidos que esta change segue:

- **Filtro por query string, sem client JS**: `clientes/page.tsx` (busca +
  toggle de inativos) e `pacientes/page.tsx` (espécie + inativos) já
  combinam múltiplos parâmetros de filtro num único `<form method="get">`
  + link `<a href="?...">`, com `URLSearchParams` pra montar a query
  quando há mais de um parâmetro.
- **Datas sempre via `src/lib/timezone.ts`**: nunca `new Date(string)` nem
  `getHours()`/etc. direto num `Date` (regra do módulo, reforçada em
  `openspec/changes/corrigir-fuso-horario-agenda/`).
- **`Comanda` não tem campo de "finalizado em"**: só `criadoEm` (gravado
  na abertura da comanda, `@@index([clinicaId, criadoEm])`). A listagem
  já ordena por esse campo (Requirement: Listagem de comandas
  finalizadas, implementada); o filtro por período necessariamente usa a
  mesma data — não é uma inconsistência nova desta change, é manter o
  que já existe.

## Goals / Non-Goals

**Goals:**
- Filtro por data inicial e data final (MVP definido pelo usuário),
  aplicado à listagem paginada e aos 4 cards de totais.
- Filtro, paginação e navegação continuam 100% Server Component / query
  string, sem introduzir o primeiro client JS da capability.

**Non-Goals:**
- Atalhos de período ("Hoje", "Semana", "Mês") — fora de escopo deste
  MVP; se vierem a existir, é evolução futura de novo, agora sobre uma
  base que já sabe filtrar por intervalo.
- Filtro de um lado só (só início, ou só fim) — os dois campos são
  exigidos juntos; informar só um é tratado como "sem filtro" (mesma
  postura defensiva de ignorar parâmetro incompleto, não é um erro).
- Qualquer mudança na tela de detalhe `/historico/[id]` — ela é sobre uma
  comanda específica, não sobre um recorte de tempo.

## Decisions

### Parâmetros `?inicio=YYYY-MM-DD&fim=YYYY-MM-DD`, formato nativo de `<input type="date">`
Mesmo formato que o próprio HTML já produz — não precisa de parsing
alternativo nem de biblioteca de datas. Combinam com `?page=N` na mesma
URL; ao trocar o filtro, o formulário do filtro não inclui o `page` atual
(novo submit sempre cai em `page` default = 1, satisfazendo o Scenario
"Aplicar um novo filtro volta para a primeira página"); os links de
paginação (Anterior/Próxima) é que preservam `inicio`/`fim` junto com o
novo `page`, via `URLSearchParams`, mesmo padrão de `pacientes/page.tsx`.

### Novo helper em `timezone.ts`: `paraDiaCalendarioDeChave(chave: string): DiaCalendario | null`
Inverso de `paraChaveDeData` (que já existe). Parseia `"yyyy-mm-dd"` sem
depender de `new Date(string)` — validação por regex + `Number()` nos três
componentes, retornando `null` pra qualquer coisa que não seja uma data
válida (string vazia, malformada, ou um 31 de fevereiro). A partir daí:
`inicioDoDiaClinica(diaInicial)` e `fimDoDiaClinica(diaFinal)` (ambas já
existem) dão os limites `gte`/`lte` no fuso da clínica — mesmo padrão de
`faturamentoPorDia` em `painel-analitico.ts`. `fimDoDiaClinica` (não
`paraInstanteClinica(fim, "23:59")`) é obrigatório aqui: uma comanda
criada às 23:59:30 do último dia do intervalo precisa entrar no filtro,
e só o "um milissegundo antes da meia-noite seguinte" cobre isso.

Alternativa considerada: aceitar `inicio`/`fim` como instantes completos
(`YYYY-MM-DDTHH:mm`). Rejeitada — o Requirement fala em "data inicial e
data final", não em hora; granularidade de dia é o que o MVP pede, e
`<input type="date">` já força esse formato no client sem esforço extra.

### `listarHistorico`/`totaisHistorico` ganham um parâmetro opcional de período já resolvido
`listarHistorico(clinicaId, { page, porPagina, periodo? })` e
`totaisHistorico(clinicaId, periodo?)`, com `periodo: { inicio: Date; fim:
Date }` — já convertido pelo caller (Server Component), nunca strings cruas
chegando em `historico.ts`. Quando `periodo` é passado, ambas as funções
somam `criadoEm: { gte: periodo.inicio, lte: periodo.fim }` ao `where` que
já usam (`clinicaId`, `status: "FINALIZADA"`) — mesmo índice composto
`@@index([clinicaId, criadoEm])` que já cobre a ordenação de hoje, sem
precisar de índice novo.

### Intervalo inválido: mensagem de erro + filtro não aplicado, inputs continuam preenchidos
Quando `inicio`/`fim` parseiam mas `inicio > fim`, a página renderiza uma
mensagem de erro curta acima da tabela e usa o histórico sem filtro (é o
único "estado anterior" que existe num Server Component puro — não há
sessão nem estado de client pra "voltar"). Os dois `<input type="date">`
continuam com `defaultValue` vindo direto de `searchParams.inicio`/`.fim`
(mesmo quando inválidos) — a pessoa vê o que digitou e o motivo do erro,
em vez do formulário voltar limpo.

## Risks / Trade-offs

- [MVP não cobre atalhos nem intervalo aberto, então quem quiser "desde
  sempre até hoje" precisa digitar a data mais antiga manualmente] →
  Aceitável agora; usuário sempre pode limpar o filtro pra ver tudo, e
  atalhos ficam pra uma evolução futura sobre esta mesma base.
- [Filtro é por `criadoEm`, não por uma data de "finalização" que não
  existe no schema — alguém pode esperar filtrar por quando a comanda foi
  fechada, não aberta] → Mesma característica que a listagem já tem hoje
  (ordena por `criadoEm`); não é uma regressão introduzida por esta
  change, e mudar isso é uma decisão maior sobre o schema de `Comanda`,
  fora de escopo.
