## Why

Todas as demais capabilities (`clientes`, `pacientes`, `agendamento`, `atendimento-comanda`,
`historico-financeiro`) dependem de duas coisas que hoje são apenas stubs: uma sessão
autenticada real e uma `clinicaId` ativa confiável (`getClinicaAtual()` em `src/lib/tenant.ts`
lança erro sempre, porque `src/lib/auth.ts` é um stub que sempre `throw`). Sem esta capability,
nenhuma outra pode ser implementada de ponta a ponta nem testada com isolamento real entre
clínicas — é o bloqueador raiz do roadmap descrito em `openspec/project.md`.

## What Changes

- Implementa `src/lib/auth.ts` com Auth.js v5, `CredentialsProvider` (e-mail + senha, hash
  bcrypt via `Usuario.senhaHash`), sessão em JWT.
- Separa a configuração em `src/lib/auth.config.ts` (edge-safe, sem providers) e
  `src/lib/auth.ts` (completo, com bcrypt) — o primeiro é o único importado por
  `src/middleware.ts`, para nunca puxar bcrypt para o bundle de Edge runtime.
- `callbacks.jwt`: no primeiro login, carrega os vínculos do usuário via `UsuarioClinica`;
  se houver exatamente 1 vínculo, define `clinicaAtivaId` automaticamente; se houver mais de
  1, deixa `clinicaAtivaId` vazio para a tela de seleção decidir.
- `callbacks.jwt` com `trigger === "update"`: revalida no banco que o usuário tem
  `UsuarioClinica` para a `clinicaId` recebida antes de gravá-la no token — nunca confia no
  valor vindo do client sem checagem.
- Nova Server Action `selecionarClinica(clinicaId)` que dispara esse update de sessão a
  partir da tela de seleção de clínica e do seletor no painel (troca sem novo login).
- Implementa `src/middleware.ts` de fato: não autenticado → `/login`; autenticado sem
  `clinicaAtivaId` → `/selecionar-clinica`; ambos presentes → segue. Sem checagem de papel
  (ver Non-goals em `design.md`).
- Implementa a tela de login (`src/app/(auth)/login/page.tsx`) e a nova tela de seleção de
  clínica, com base no protótipo (`openspec/reference/prototipo.html`, `#auth-screen`), **sem**
  os elementos que não têm requirement por trás: sem "Entrar com Google", sem "Esqueci a
  senha", sem "Cadastre sua clínica", sem checkbox "Manter conectado" (ver `design.md`).
- Remove o `throw` de `src/lib/auth.ts` e o passthrough de `src/middleware.ts` — ambos hoje
  são stubs intencionais que esta change substitui pela implementação real.
- Adiciona um teste de integração dedicado ao isolamento entre clínicas (login na Clínica A,
  tentativa de acesso a um recurso da Clínica B por ID direto, valida 404).

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

_Nenhuma — `openspec/specs/autenticacao-multi-clinica/spec.md` já descreve integralmente o
comportamento requerido (login, seleção de clínica, troca sem novo login, isolamento por
404). Esta change implementa esse contrato sem alterar requirements ou scenarios; as decisões
de escopo abaixo (UI sem elementos decorativos, split edge/node, RBAC por papel fora do
escopo) são decisões de implementação, não mudanças de comportamento observável já
especificado. `.openspec.yaml` desta change define `skip_specs: true`._

## Impact

- **Código novo/alterado**: `src/lib/auth.ts`, `src/lib/auth.config.ts` (novo),
  `src/lib/tenant.ts` (remove o TODO, passa a funcionar), `src/middleware.ts`,
  `src/types/next-auth.d.ts` (ajuste se necessário), `src/app/(auth)/login/page.tsx`, nova
  rota `src/app/(auth)/selecionar-clinica/page.tsx`, nova Server Action
  `selecionarClinica`.
- **Dependências**: nenhuma nova lib além do que já está previsto em `package.json`
  (`next-auth`, `bcryptjs` já usados pelo `seed.ts`).
- **Desbloqueia**: todas as demais capabilities do roadmap, que hoje não podem ser
  implementadas nem testadas com isolamento real de tenant sem esta.
- **Dados**: nenhuma migração de schema — `Usuario`, `Clinica`, `UsuarioClinica` já existem
  em `prisma/schema.prisma`.
