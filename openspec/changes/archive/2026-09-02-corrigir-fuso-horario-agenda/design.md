## Context

Ver `proposal.md` (Why) para a motivação e a reprodução do bug. Resumo
técnico do estado atual:

- `criarAgendamento` recebe `dataHoraInicio` como a string `${data}T${hora}:00`
  (sem offset), coagida com `z.coerce.date()` — `new Date(...)` sobre uma
  string sem offset é interpretada no fuso horário local **do processo que
  faz o parse**.
- `agenda/page.tsx` calcula os limites da semana (`segunda`/`fimDaSemana`)
  com `new Date(y, m, d, ...)`, também no fuso local do processo, e manda
  `segunda.toISOString()` (um instante UTC) para o Client Component.
- `grade-semanal.tsx` (client) relê esse instante com
  `new Date(iso).getFullYear()/getMonth()/getDate()` — no fuso local do
  **navegador**, que pode divergir do fuso do processo do servidor.
- `dataHoraInicio` no Prisma é `DateTime` sem `@db.Timestamptz`, ou seja,
  coluna Postgres `timestamp(3) without time zone`. O Prisma Client grava e
  lê essa coluna sempre tratando o valor UTC do `Date` do JS como o valor
  literal da coluna — internamente consistente entre escrita e leitura via
  Prisma, mas sem qualquer registro de fuso horário.
- Não existe hoje nenhuma constante de fuso horário no projeto, nem
  variável `TZ` fixada nos Dockerfiles/compose.
- O domínio é uma clínica veterinária brasileira; o Brasil não observa
  horário de verão desde 2019 — o fuso `America/Sao_Paulo` é UTC-3 o ano
  inteiro, sem transições a tratar.

## Goals / Non-Goals

**Goals:**
- Data e horário escolhidos pelo usuário na tela de agenda (criação e
  exibição) SHALL corresponder ao mesmo instante real, não importa o fuso
  horário do processo do servidor ou do navegador.
- A correção SHALL eliminar a divergência de hidratação do React causada
  pelo round-trip de data servidor→cliente.
- A correção SHALL funcionar tanto em dev (Docker local) quanto em produção
  (onde o runtime pode rodar em UTC, ex. Vercel), sem depender de o
  operador lembrar de configurar `TZ` corretamente em cada ambiente.

**Non-Goals:**
- Suporte a clínicas em fusos horários diferentes uma da outra (fora de
  escopo — todo o domínio de negócio hoje assume Brasil; nenhuma spec
  existente menciona fuso horário por clínica).
- Tratar horário de verão — não se aplica ao Brasil desde 2019; a lógica
  não precisa lidar com transições de DST.
- Mudar o tipo da coluna `dataHoraInicio` no Postgres (`timestamp` →
  `timestamptz`) — o bug está em como o offset é aplicado *antes* do dado
  chegar no Prisma, não no tipo da coluna. Ver Decisão 3.

## Decisions

### Decisão 1: Fuso horário fixo como constante da aplicação, não configuração por clínica

Fixamos `America/Sao_Paulo` como constante única (`src/lib/timezone.ts` ou
similar), usada tanto na criação quanto na exibição de agendamentos.

**Alternativas consideradas:**
- Campo `fusoHorario` por `Clinica`: rejeitado por escopo — nenhuma
  requirement existente prevê clínicas fora do Brasil, e introduzir esse
  campo agora é especular sobre um requisito que não existe.
- Detectar o fuso do navegador em runtime (`Intl.DateTimeFormat().resolvedOptions().timeZone`) e confiar nele: rejeitado — é exatamente a
  premissa que causou o bug (confiar no fuso de "quem calculou por
  último"); também abriria brecha para um usuário acessando de fora do
  Brasil ver/criar horários deslocados sem perceber.

### Decisão 2: Sem nova dependência — offset fixo `-03:00`, não uma lib de fuso horário

Como o Brasil não tem DST desde 2019, `America/Sao_Paulo` é sempre UTC-3.
Isso permite tratar o problema como um offset fixo (string ISO com
`-03:00` explícito) em vez de precisar de uma biblioteca de fuso horário
com banco de dados de regras (tz database).

**Alternativas consideradas:**
- `date-fns-tz` / `Luxon` / `Temporal` (polyfill): rejeitado por ora — mais
  peso de dependência do que o problema justifica (ver convenção do
  projeto em `openspec/project.md`: "Não usar bibliotecas... sem
  justificativa"). Se o produto algum dia precisar de múltiplos fusos
  reais (DST incluso), essa decisão deve ser revisitada.
- Confiar em `TZ=America/Sao_Paulo` no ambiente (Decisão 4) como única
  correção: insuficiente sozinho — não cobre o cálculo feito no
  **navegador** (`grade-semanal.tsx`), que não tem `TZ` de processo
  nenhuma; o navegador sempre usa o fuso do SO do usuário.

Implementação: um helper central (`src/lib/timezone.ts`) expõe:
- `paraInstanteClinica(data: string, hora: string): Date` — combina
  `data`+`hora` com o offset fixo `-03:00` antes de fazer `new Date(...)`,
  usado por `criarAgendamento`/`novo-agendamento-modal.tsx`.
- `paraDataLocalClinica(instante: Date): { ano, mes, dia, hora, minuto }`
  (ou equivalente) — deriva os componentes de calendário no fuso da
  clínica a partir de um `Date`/instante UTC, usado por
  `agenda/page.tsx`/`grade-semanal.tsx` em vez de `getFullYear()` etc.
  direto no `Date`.

### Decisão 3: Eliminar o round-trip client↔server de datas na grade semanal

Em vez de o servidor calcular `segunda`/`sexta` e mandar um `Date`/ISO para
o client recalcular os dias da semana com getters locais, o servidor
(`agenda/page.tsx`) já resolve e envia os **componentes de calendário**
prontos (ex.: um array de `{ ano, mes, dia, label }` por coluna, ou as
strings `yyyy-mm-dd` de cada dia), calculados com o helper da Decisão 2. O
client (`grade-semanal.tsx`) para de derivar dias a partir de
`new Date(iso).getFullYear()/...` — só usa o que o servidor já resolveu.
Isso também remove a causa do erro de hidratação (o texto renderizado no
servidor deixa de depender de um cálculo que o client refaz de forma
potencialmente diferente).

Mesmo princípio para o agrupamento de agendamentos por dia e para a
formatação de hora exibida em cada card (`fmtHora`, `horaDecimal` em
`grade-semanal.tsx`): usar os componentes de calendário/hora no fuso da
clínica (via helper), não os getters locais do `Date` no navegador.

### Decisão 4: `TZ` fixada nos containers como camada extra, não como correção principal

Mesmo com as decisões 1–3, fixamos `TZ=America/Sao_Paulo` em
`Dockerfile`, `Dockerfile.dev`, `docker-compose.yml` e
`docker-compose.prod.yml`. Não corrige o bug sozinho (a lógica do
navegador continua fora do controle do servidor), mas remove uma fonte de
comportamento surpreendente para qualquer código futuro que ainda chame
`new Date()`/`Date.now()` "ingenuamente" no servidor, e documenta a
suposição de fuso horário do ambiente.

## Risks / Trade-offs

- [Risco] Constante de fuso horário fixa não escala para clínicas fora do
  Brasil → Mitigação: escopo deliberado (Non-Goals); revisitar se/quando
  surgir requirement de multi-fuso real.
- [Risco] Corrigir só parte do fluxo (ex. só a criação, sem tocar a grade)
  deixaria o bug de hidratação e o de cards fora da grade intactos →
  Mitigação: tasks.md cobre os três pontos (criação, limites da semana,
  agrupamento/exibição) como um único conjunto, não mudanças isoladas.
- [Trade-off] Offset fixo `-03:00` em vez de uma tz database real é uma
  simplificação deliberada (Decisão 2) — correta hoje, mas silenciosamente
  incorreta se o Brasil reintroduzir horário de verão. Aceito porque
  reverter essa decisão exigiria trocar o helper central, não uma reescrita
  espalhada pelo código (o ponto do helper único).
