## 1. Helper central de fuso horário

- [x] 1.1 Criar `src/lib/timezone.ts` com a constante do fuso da clínica
  (offset fixo `-03:00`, `America/Sao_Paulo`) e as funções
  `paraInstanteClinica(data, hora)` e `paraComponentesClinica(instante)`
  (renomeada de `paraDataLocalClinica` durante a implementação — mesmo
  papel descrito em `design.md`, Decisão 2) e verificado com testes
  unitários cobrindo: meia-noite, virada de dia, e um horário qualquer no
  meio do dia. `src/lib/timezone.test.ts`, 16 testes passando.
- [x] 1.2 Adicionado teste unitário que simula o processo rodando em UTC
  (`process.env.TZ = "UTC"` em `beforeAll`/`afterAll`) e confirma que
  `paraInstanteClinica`/`paraComponentesClinica`/`segundaFeiraDaSemana`
  continuam corretos independentemente do fuso do processo Node —
  `src/lib/timezone.test.ts`, describe "independência do fuso horário do
  processo Node".

## 2. Criação de agendamento

- [x] 2.1 `novo-agendamento-modal.tsx` passou a enviar `data`+`hora` como
  campos separados (a conversão pra instante fica só no validador, ponto
  único — decisão tomada: opção b do item), removendo a concatenação de
  string sem offset.
- [x] 2.2 `src/lib/validators/agendamento.ts` não usa mais
  `z.coerce.date()`: recebe `data`+`hora`, valida formato, e usa
  `paraInstanteClinica` (com `.transform()` + `.refine()`) pra produzir
  `dataHoraInicio`.
- [x] 2.3 `criarAgendamento` (`src/lib/actions/agendamento.ts`) calcula a
  janela do dia (checagem de conflito) com `paraDiaCalendario` +
  `inicioDoDiaClinica`/`fimDoDiaClinica`; `formatarHora` (usada nos
  conflitos retornados) usa `paraComponentesClinica` em vez de
  `Intl.DateTimeFormat` sem `timeZone`. `novoFim` já era aritmética pura
  sobre milissegundos, não precisou mudar.
- [x] 2.4 `agendamento.test.ts` e `validators/agendamento.test.ts`
  atualizados pro novo payload (`data`+`hora`) e estendidos com casos que
  rodam com `process.env.TZ = "UTC"`, confirmando que um agendamento criado
  para "2026-09-20 09:00"/"2026-09-10 09:00" fica salvo no instante correto
  (verificado via `paraComponentesClinica` sobre o registro
  persistido/resultado do parse) e que a checagem de conflito continua
  funcionando nesse cenário. 38 testes passando (`npx vitest run
  src/lib/timezone.test.ts src/lib/validators/agendamento.test.ts
  src/lib/actions/agendamento.test.ts`).

## 3. Grade semanal

- [x] 3.1 `agenda/page.tsx` calcula segunda/sexta com `segundaFeiraDaSemana`/
  `adicionarDias`/`inicioDoDiaClinica`/`fimDoDiaClinica` (não mais
  `new Date(y,m,d,...)` cru) e envia pra `GradeSemanal` os componentes de
  calendário já resolvidos (`dias: DiaColuna[]`, um por coluna, com
  `chave`/`ano`/`mes`/`dia`), além de `hojeChave` — não manda mais um ISO
  string único pro client recalcular.
- [x] 3.2 `grade-semanal.tsx` consome os `DiaColuna[]`/`AgendamentoGrade[]`
  recebidos via prop; não existe mais `new Date(segundaFeira)` nem
  reconstrução de dias a partir de getters locais — round-trip eliminado.
- [x] 3.3 `fmtHora`/`horaDecimal`/`mesmoDia` (getters locais do `Date` no
  navegador) foram removidos de `grade-semanal.tsx`: dia (`diaChave`),
  posição (`horaDecimal`) e rótulo (`horaLabel`) já chegam prontos do
  servidor via `AgendamentoGrade`, calculados com `paraComponentesClinica`
  em `agenda/page.tsx`.
- [x] 3.4 Verificado manualmente no navegador (docker compose, servidor em
  UTC): após `docker compose restart app` (limpar estado de HMR), a grade
  mostra "31 de ago. – 04 de set." com os rótulos SEG/TER/QUA/QUI/SEX
  batendo com os números 31/1/2/3/4 (hoje, 2, corretamente em QUA/dourado);
  console sem nenhum warning/erro de hidratação. Criado um agendamento novo
  às 09:00 de sexta (04/09) pela UI — renderizou dentro da grade, na
  posição correta, sem sangrar acima do cabeçalho (o bug original faria
  esse mesmo horário cair às "06:00" equivalentes, antes de `START_HOUR`).
  Os dois agendamentos criados na sessão de exploração
  (2026-09-03T09:00:00Z e 2026-09-09T09:00:00Z) continuam sangrando — são
  dados legados, gravados por engano com o bug antigo antes desta correção
  existir (armazenados literalmente às 09:00 UTC em vez de 12:00 UTC); não
  há tarefa de migração de dados no escopo desta change (banco de
  desenvolvimento/teste).

## 4. Ambiente

- [x] 4.1 Adicionado `RUN apk add --no-cache tzdata` + `ENV
  TZ=America/Sao_Paulo` em `Dockerfile` (estágio `base`) e
  `Dockerfile.dev`, e `TZ: America/Sao_Paulo` em `docker-compose.yml`/
  `docker-compose.prod.yml`. Verificado com `docker compose exec app sh -c
  "echo TZ=$TZ; date"` — depois de `docker compose up -d --build app`,
  mostra `TZ=America/Sao_Paulo` e `date` com offset `-03` correto (antes:
  `TZ=` vazio, `date` em UTC).

## 5. Regressão

- [x] 5.1 Suíte completa rodada (`npx vitest run`, equivalente a `npm test`
  — ver `package.json`): **154/154 testes passando**, incluindo os 38 de
  `agendamento`/`timezone` (os 17 originais mais os novos casos das seções
  1–3) e todo o resto do projeto (paciente, cliente, comanda,
  item-catálogo, isolamento de clínica etc. — nada quebrou).
- [x] 5.2 Reprodução manual repetida (login, `/agenda`, container em UTC):
  cabeçalho da grade com rótulo de dia batendo com a data numérica em cada
  coluna (hoje, quarta-feira 2, corretamente sob "QUA"), sem erro de
  hidratação no console. Criado um agendamento novo às 09:00 — o horário
  exato que, antes da correção, seria salvo/exibido deslocado pra antes das
  08:00 (`START_HOUR`) e sangraria por trás do cabeçalho; agora aparece
  corretamente dentro da grade, na posição e coluna certas.
