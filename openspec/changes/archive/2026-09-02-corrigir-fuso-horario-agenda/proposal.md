## Why

`agendamento` trata toda data/horário como "hora local de quem faz o
parse" — tanto na criação (`criarAgendamento`, via `z.coerce.date()` sobre
uma string sem offset) quanto na grade semanal (`agenda/page.tsx` calcula os
limites da semana no relógio do processo, manda pro client via
`toISOString()`, e o client relê com `getFullYear/getMonth/getDate()` no
fuso do navegador). Isso só funciona quando servidor e navegador compartilham
o mesmo fuso horário — e no ambiente de desenvolvimento atual eles não
compartilham: `Dockerfile.dev` roda `next dev` num container
`node:20-alpine` sem `TZ` definida (UTC), enquanto o navegador roda no host
em `America/Sao_Paulo` (UTC-3).

Reproduzido nesta sessão: o cabeçalho da grade mostra o rótulo de dia da
semana errado para a data ao lado (hoje, uma quarta-feira, aparece rotulado
"QUI"), o console acusa erro de hidratação do React ("Text content did not
match... the entire root will switch to client rendering"), e agendamentos
cujo horário salvo em UTC cai antes das 08:00 depois de convertido para
exibição local renderizam com posição negativa, sangrando por trás do
cabeçalho do dia — efetivamente invisíveis, mesmo com a linha existindo no
banco (confirmado via `psql`). Dois agendamentos criados nesta sessão
(2026-09-03 09:00 e 2026-09-09 09:00, ambos armazenados em UTC) caem
exatamente nesse caso.

Em produção o problema não desaparece — só muda de forma: ambientes
serverless (Vercel) normalmente rodam em UTC por padrão, enquanto a clínica
opera em horário do Brasil, então o mesmo descompasso servidor/local se
repete mesmo sem Docker.

## What Changes

- `criarAgendamento` e o formulário de novo agendamento passam a montar e
  interpretar `dataHoraInicio` com o offset do fuso horário da clínica
  explícito, em vez de depender do relógio do processo que faz o parse.
- `agenda/page.tsx` e `grade-semanal.tsx` param de fazer round-trip de datas
  via `toISOString()` + releitura em getters locais do navegador — os
  limites da semana (segunda 00:00 a sexta 23:59:59) e o agrupamento de
  agendamento por dia passam a ser calculados de forma consistente com um
  único fuso horário de referência, não o fuso de "quem calculou por
  último".
- Ambientes de execução (`Dockerfile`, `Dockerfile.dev`,
  `docker-compose.yml`, `docker-compose.prod.yml`) ganham `TZ` fixada
  explicitamente, como camada adicional de proteção — mas não como única
  correção, já que depender só disso não protege deploys (Vercel) que não
  usam esses arquivos.
- **Modificado**: `Requirement: Criação de agendamento` e `Requirement:
  Visualização semanal por profissional`, em `specs/agendamento/spec.md`,
  ganham cenários explícitos garantindo que a data/horário exibidos e
  salvos correspondem ao fuso horário da clínica, independentemente do fuso
  do processo do servidor ou do navegador — fechando a lacuna que permitiu
  esse bug.

## Capabilities

### New Capabilities

(nenhuma)

### Modified Capabilities

- `agendamento`: `Criação de agendamento` e `Visualização semanal por
  profissional` passam a exigir explicitamente que datas/horários sejam
  interpretados e exibidos no fuso horário da clínica, não no fuso do
  processo que executa o parse.

## Impact

- `src/lib/actions/agendamento.ts` — `criarAgendamento` (parse de
  `dataHoraInicio`, cálculo de janela do dia pra checagem de conflito).
- `src/lib/validators/agendamento.ts` — schema Zod de coerção de data.
- `src/app/(dashboard)/agenda/novo-agendamento-modal.tsx` — montagem da
  string `data`+`hora` enviada pra action.
- `src/app/(dashboard)/agenda/page.tsx` — cálculo de segunda/sexta da
  semana e query do Prisma por intervalo.
- `src/app/(dashboard)/agenda/grade-semanal.tsx` — reconstrução de `dias[]`
  no client, formatação de hora exibida, agrupamento por dia.
- `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`,
  `docker-compose.prod.yml` — variável `TZ`.
- `openspec/specs/agendamento/spec.md` — novos cenários nos dois
  requirements citados.
- Sem mudança de schema do Prisma nem migração — `dataHoraInicio` continua
  `DateTime` (mapeado para `timestamp(3) without time zone`); a correção é
  de onde/como o offset é aplicado antes de chegar ali, não do tipo de
  coluna.
