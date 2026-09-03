## Context

Ver `proposal.md` (Why) para a motivação. Estado atual relevante:

- Todo teste de isolamento hoje (`isolamento-*.test.ts`) mocka a sessão com
  `vi.mock("@/lib/auth", () => ({ auth: async () => ({ user: { ...,
  clinicaAtivaId: clinicaAtivaMock.current } }) }))`, onde
  `clinicaAtivaMock.current` é **uma única variável mutável compartilhada**
  no módulo de teste — trocar de "clínica ativa" entre chamadas é só
  reatribuir essa variável antes de cada `await action(...)`.
- `prisma/seed.ts` hoje cria só a clínica `Vida Animal`
  (`clinica-seed-vida-animal`) com seus próprios cliente/paciente/item de
  catálogo/agendamentos.
- As actions (`criarCliente`, `criarPaciente`, `criarAgendamento`,
  `adicionarItem`, etc.) já foram auditadas nesta sessão e seguem
  consistentemente o padrão "resolve por `clinicaId` uma vez, confia no
  `.id` resolvido depois" (ver conversa — não repetir aqui).

## Goals / Non-Goals

**Goals:**
- Seed com 2 clínicas independentes, cada uma com cliente, paciente, item
  de catálogo, agendamento e comanda próprios — suficiente pra explorar o
  app manualmente (login, trocar de clínica) e ver dados reais dos dois
  lados.
- Um teste de integração que alterna entre clínica A e clínica B a cada
  passo do fluxo (não roda A do início ao fim e só depois B), pra pegar
  bugs de "esqueceu de reatribuir o contexto" ou "vazou uma referência de
  uma chamada anterior" que um teste sequencial-por-clínica não pegaria.

**Non-Goals:**
- Concorrência de verdade (duas chamadas rodando ao mesmo tempo via
  `Promise.all`). Ver Decisão 1 — não é viável com o mock atual, e não é
  isso que motivou a proposta (o risco real é troca de contexto entre
  requisições sequenciais, não race condition entre threads).
- Reescrever ou substituir os testes de isolamento existentes — este teste
  é complementar (fluxo completo entre capabilities), não substitui os
  testes de isolamento por model que já existem.
- Popular as clínicas seedadas com volume de dados (dezenas de pacientes
  etc.) — o objetivo é ilustrar duas clínicas distintas, não estressar
  performance.

## Decisions

### Decisão 1: Alternância sequencial, não concorrência real

O teste de fluxo completo alterna clínica A / clínica B **reatribuindo
`clinicaAtivaMock.current` e usando `await` a cada passo** — nunca
`Promise.all` das duas trilhas.

**Motivo**: `clinicaAtivaMock.current` é uma única variável mutável
compartilhada; `auth()` a lê de forma síncrona no momento em que a action é
chamada. Rodar as duas trilhas de verdade em paralelo tornaria o resultado
dependente da ordem de resolução de microtasks — o teste ficaria flaky e,
pior, uma falha de isolamento real poderia não reproduzir de forma
consistente. Alternar sequencialmente (A cria cliente → B cria cliente → A
cria paciente → B cria paciente → ...) já exercita o que realmente importa
aqui: código que "esquece" de reler o contexto atual e usa um valor
fechado (closure) de uma chamada anterior. Isso é idêntico, em espírito, ao
padrão já usado nos testes de isolamento existentes — só estendido a um
fluxo de 4 capabilities em vez de 1 model.

**Alternativa considerada**: estender o mock de `auth()` pra aceitar um
contexto por chamada (ex.: `AsyncLocalStorage`) e rodar de verdade em
paralelo. Rejeitada por ora — mudaria a infraestrutura de teste usada por
todos os `isolamento-*.test.ts` existentes, escopo bem maior que o problema
que motivou esta change.

### Decisão 2: Teste novo, não extensão de um `isolamento-*.test.ts` existente

Novo arquivo `src/lib/isolamento-fluxo-completo.test.ts`, em vez de
adicionar mais um `it(...)` a um dos arquivos existentes.

**Motivo**: os arquivos existentes são nomeados e escopados por model
(`isolamento-cliente`, `isolamento-paciente`, ...) e usam clínicas
descartáveis criadas/apagadas no próprio arquivo. Este teste atravessa 4
models numa única trilha de fluxo — não pertence a nenhum dos arquivos
existentes sem forçar o escopo do nome.

### Decisão 3: Seed com dados mínimos, mas cobrindo as 4 capabilities do fluxo

A segunda clínica seedada ganha exatamente 1 cliente, 1 paciente, 1 item
de catálogo (serviço), 1 agendamento e 1 comanda — o mínimo pra aparecer
em cada tela ao trocar de clínica pela UI, espelhando a proporção do que
`Vida Animal` já tem hoje (não precisa ser idêntico em volume).

## Risks / Trade-offs

- [Risco] Teste de fluxo completo pode ficar "grande demais" (um único
  `it` cobrindo 4 capabilities) e difícil de debugar quando quebra →
  Mitigação: cada etapa do fluxo faz sua própria asserção de isolamento
  logo depois de criar o dado (não um único assert gigante no final) —
  uma falha aponta exatamente em qual capability/etapa.
- [Trade-off] Não testar concorrência real (Decisão 1) significa que um
  bug de isolamento que só aparece sob race condition genuína (ex.:
  `AsyncLocalStorage` mal configurado numa implementação futura) não seria
  pego por este teste → aceito porque a arquitetura atual (sessão via
  NextAuth JWT, uma request por vez no fluxo dos Server Actions) não tem
  esse tipo de estado compartilhado entre requisições concorrentes hoje;
  revisitar se isso mudar.
