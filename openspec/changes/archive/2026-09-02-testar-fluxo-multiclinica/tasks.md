## 1. Seed da segunda clínica

- [x] 1.1 `prisma/seed.ts` ganhou `clinica-seed-pata-feliz` ("Clínica Pata
  Feliz"), usuário `joao@patafeliz.com.br` e vínculo `usuarioClinica`
  próprios. `npm run db:seed` rodado duas vezes dentro do container
  (idempotente, mesmo padrão `upsert`), sem erro.
- [x] 1.2 Adicionado 1 item de catálogo (serviço, `duracaoPadraoMinutos:
  30`), 1 cliente (Júlia Santos) e 1 paciente (Nina) escopados em
  `clinica-seed-pata-feliz`. Verificado via `psql` — contagem por clínica
  confirma `clinica-seed-pata-feliz` com exatamente 1 cliente/1
  paciente/1 agendamento/1 comanda, sem misturar com `Vida Animal`.
- [x] 1.3 Adicionado 1 agendamento e 1 comanda (com item) pra segunda
  clínica reaproveitando `hojeAs()`. **Achado durante a verificação**: o
  seed inicial deixava o agendamento em `AGUARDANDO` com uma comanda já
  `ABERTA` vinculada — inconsistente com a Requirement "Ciclo de status
  do agendamento" (uma Comanda só existe depois da transição pra
  `EM_ATENDIMENTO`). Corrigido no próprio seed antes de prosseguir.
  Verificado visualmente: login como `joao@patafeliz.com.br` mostra Nina
  em `/agenda` (10:00) e `EM ATENDIMENTO` em `/atendimento`; logout e
  login de volta como `ana@vidaanimal.com.br` mostra só os 3 clientes
  originais de Vida Animal em `/clientes` (Júlia não aparece).

## 2. Teste de integração do fluxo completo

- [x] 2.1 Criado `src/lib/isolamento-fluxo-completo.test.ts` com setup de
  duas clínicas de teste descartáveis (A e B), veterinário vinculado a
  cada uma (`usuarioClinica`) e item de catálogo próprio de cada lado —
  mesmo padrão `beforeAll`/`afterAll` dos `isolamento-*.test.ts`
  existentes.
- [x] 2.2 Fluxo alternado implementado (design.md, Decisão 1): cada `it`
  cobre uma etapa (criarCliente, criarPaciente, criarAgendamento,
  adicionarItem), chamando primeiro pra clínica A (reatribuindo
  `clinicaAtivaMock.current`, com `await`), depois pra clínica B — sem
  `Promise.all`. Todas as etapas rodam sem erro pras duas clínicas.
- [x] 2.3 Cada etapa verifica isolamento logo em seguida: `findFirst` pelo
  `id` com a `clinicaId` da *outra* clínica → `null`; com a `clinicaId`
  certa → encontra. Repetido para Cliente, Paciente (+ checagem cruzada de
  FK `clienteId`), Agendamento e Comanda/ComandaItem (incluindo os valores
  de `subtotal`, pra confirmar que os itens não se misturaram entre as
  comandas).
- [x] 2.4 Último `it` do arquivo confirma, via `findMany({ where:
  { clinicaId } })`, que cada clínica termina o fluxo com exatamente o
  registro esperado (nem a mais, nem a menos) nas 4 capabilities.
  `npx vitest run src/lib/isolamento-fluxo-completo.test.ts` — 5/5 testes
  passando.

## 3. Regressão

- [x] 3.1 Suíte completa rodada: **159/159 testes passando** (154
  existentes + 5 do novo `isolamento-fluxo-completo.test.ts`), mais
  `npx tsc --noEmit` limpo.
