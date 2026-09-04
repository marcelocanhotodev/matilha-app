## Context

Ver proposal.md - Why. `historico-financeiro` nunca foi implementada — a
rota `/historico` é um stub. O restante do painel já estabelece padrões
fortes que esta change segue:

- **Isolamento multi-clínica**: toda query de recurso é filtrada por
  `clinicaId` da sessão (`getClinicaAtual()`), e acesso a um id de outra
  clínica responde 404 (`notFound()`), nunca 403 — ver
  `openspec/specs/autenticacao-multi-clinica/spec.md`, Requirement:
  Isolamento de dados entre clínicas, e o padrão replicado em
  `src/lib/isolamento-*.test.ts`.
- **Paginação por query string**: `clientes/page.tsx` e `pacientes/page.tsx`
  já usam `searchParams` + `<a href="?...">`/`<form method="get">` pra
  filtros, sem nenhum JS de client — mesmo espírito de
  `src/app/(dashboard)/agenda/page.tsx` (`?semana=`).
- **Agregações sobre `Comanda` `FINALIZADA`**: `src/lib/painel-analitico.ts`
  já tem 4 funções desse tipo (soma/contagem/agrupamento), sempre
  recebendo `clinicaId: number` já resolvido pelo caller.

Nenhum desses padrões precisa mudar — esta change só é a primeira vez que
"acesso por id na URL" (em vez de listagem simples) entra em cena.

## Goals / Non-Goals

**Goals:**
- Implementar a capability inteira (listagem + totais + detalhe +
  paginação) num único change, já que nenhuma parte funciona sem as outras
  (spec só faz sentido completa).
- Estabelecer o padrão de rota dinâmica com isolamento por clínica de um
  jeito que sirva de referência pra próximas telas de detalhe que o
  projeto vier a precisar.

**Non-Goals:**
- Filtro por período — a própria spec já documenta isso como evolução
  futura, em change separada (Requirement "Filtro por período").
- Tela de configuração do tamanho de página — é um valor no banco, sem UI,
  por decisão explícita (ver proposal.md).
- Qualquer ação de escrita na tela de detalhe (editar, cancelar, reabrir) —
  comanda finalizada é imutável (`atendimento-comanda`, Requirement:
  Imutabilidade de comanda finalizada ou cancelada); a tela é puro
  read-only.
- Paginação cursor-based ou infinita — offset simples (`skip`/`take`) é
  suficiente pro volume de dados atual e futuro próximo; revisitar junto
  com o filtro por período, se necessário.

## Decisions

### Rota `/historico/[id]` segue o mesmo padrão de isolamento das queries internas, só que na borda da URL
`findFirst({ where: { id, clinicaId, status: "FINALIZADA" } })` — se não
achar, `notFound()`. Isso cobre em uma única condição os três casos que
precisam dar 404: id inexistente, id de outra clínica, e id de uma comanda
que existe mas não está `FINALIZADA` (ABERTA/CANCELADA não fazem parte do
"histórico" como conceito, então não recebem URL própria funcional).

Alternativa considerada: buscar só por `id` e checar `clinicaId`/`status`
depois, devolvendo 404 explicitamente em cada branch. Rejeitada — o filtro
único no `where` é o mesmo padrão que `updateMany`/`findFirst` já usam em
todo o resto do projeto (ex.: `src/lib/actions/cliente.ts`) pra nunca
revelar, nem por diferença de mensagem, se o recurso existe em outro
tenant.

### Totais agregados são uma query separada, nunca derivados da página atual
A listagem paginada (`skip`/`take`) e os 4 cards de totais
(arrecadado/quantidade/ticket médio/forma mais usada) são duas queries
Prisma independentes, ambas filtradas por `clinicaId` + `status:
FINALIZADA`, sem paginação na segunda. Se os cards fossem calculados só a
partir das 10 linhas visíveis, "ticket médio" e "forma mais usada"
mudariam a cada página — errado por definição (são estatísticas do
histórico inteiro).

"Forma mais usada" aqui é **contagem** de comandas por forma de pagamento
(a mais frequente), diferente da agregação que já existe em
`faturamentoPorFormaPagamento` (`painel-analitico.ts`), que soma **valor**
por forma — não dá pra reaproveisar a função existente, precisa de uma
nova (mesmo padrão de `Map` + `reduce` das outras 4).

### Desempate de "forma de pagamento mais frequente": ordem fixa do enum, não alfabética
Quando duas ou mais formas de pagamento empatam em contagem de comandas,
vence a que aparece primeiro na ordem `DINHEIRO > PIX > CARTAO_CREDITO >
CARTAO_DEBITO` — a mesma ordem fixa que `forma-pagamento-chart.tsx`
(`ORDEM_FORMA_PAGAMENTO`, capability `painel-analitico`) já usa pra essa
dimensão, e que coincide com a ordem de declaração do enum
`FormaPagamento` no `schema.prisma`.

Alternativa considerada: desempate alfabético, como `itensMaisVendidos`/
`clientesComMaisConsumo` já fazem em `painel-analitico.ts`. Rejeitada —
lá faz sentido porque são listas abertas de entidades nomeadas; aqui
`FormaPagamento` é um enum fechado de 4 valores, e o projeto já tem uma
ordem fixa estabelecida especificamente pra ele (pelo mesmo motivo:
manter o significado estável entre execuções). Alfabético produziria uma
ordem diferente (`CARTAO_CREDITO`/`CARTAO_DEBITO` antes de
`DINHEIRO`/`PIX`), inconsistente com essa convenção já existente.

### Tamanho de página: coluna em `Clinica`, sem UI
`Clinica.itensPorPaginaHistorico Int @default(10)`. Por clínica (não
global) porque todo o resto do schema já modela configuração como uma
propriedade do tenant, nunca um valor único pro sistema inteiro — não
faria sentido abrir uma exceção aqui. Lido direto pelo Server Component
(`clinica.itensPorPaginaHistorico`, já disponível via `getClinicaAtual()`
+ uma query em `Clinica`, ou incluído na própria query de sessão/layout se
for mais barato). Sem tela de configuração — decisão explícita do
proposal.md: quem precisar de um valor diferente edita a linha no banco
(pgAdmin já está de pé no docker-compose de dev).

### Paginação via `?page=N`, mesmo padrão de `clientes`/`pacientes`
`searchParams.page` (1-indexed, default `1`) vira `skip: (page - 1) *
tamanho`. Total de páginas via `Math.ceil(total / tamanho)` a partir de um
`prisma.comanda.count()` com o mesmo `where` da listagem. Navegação entre
páginas são links `<a href="?page=N">` (Server Component puro, sem client
JS) — mesma escolha que o resto do projeto já fez pra filtros de lista.

## Risks / Trade-offs

- [Nenhum filtro de período ainda: `count()`/aggregate rodam sobre o
  histórico inteiro a cada carregamento, crescendo pra sempre] →
  Aceitável agora (poucas centenas/milhares de linhas no horizonte
  próximo); revisitar quando o Requirement "Filtro por período" virar uma
  change de verdade.
- [Id previsível/sequencial em `/historico/[id]` permite tentativa de
  enumeração] → Mesma exposição que qualquer outro id inteiro do sistema já
  tem hoje (nenhuma tela usa uuid); mitigado pelo 404-nunca-403, que já é
  a postura de isolamento do projeto inteiro, não uma exceção criada aqui.
- [Campo novo sem UI pode ser esquecido por quem precisar mudar o valor no
  futuro] → Mitigado documentando a coluna com um comentário claro no
  `schema.prisma` apontando pra este design.
