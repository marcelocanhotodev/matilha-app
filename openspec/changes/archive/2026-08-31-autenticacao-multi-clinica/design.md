## Context

`src/lib/auth.ts` e `src/middleware.ts` são stubs propositais (ver comentários `TODO` em
ambos) esperando por esta capability; `src/lib/tenant.ts` já expõe o contrato
`getClinicaAtual()` que todas as demais capabilities vão consumir, mas ele lança sempre
porque depende de `auth()`. `next-auth.d.ts` já estende `Session.user` com
`clinicaAtivaId?: string`. O schema (`Usuario`, `Clinica`, `UsuarioClinica`) já existe e não
muda. Ver `proposal.md` para o porquê; `openspec/specs/autenticacao-multi-clinica/spec.md`
para os requirements que este design implementa sem alterar.

Referência visual: `openspec/reference/prototipo.html`, `#auth-screen` (tela de login +
seleção de clínica).

## Goals / Non-Goals

**Goals:**
- Login por credenciais com sessão JWT, seleção de clínica pós-login (pulando a tela quando
  só há 1 vínculo), troca de clínica sem novo login, e isolamento por 404 — os 4 requirements
  da spec.
- Estrutura de auth que separa o que roda em Edge (middleware) do que roda em Node (bcrypt),
  para não travar nem inflar o middleware por acidente.

**Non-Goals:**
- **Controle de acesso por papel (RBAC)**: `PapelUsuario` (ADMIN/VETERINARIO/RECEPCAO) é
  exibido na tela de seleção de clínica, mas nenhuma rota é bloqueada por papel nesta change —
  a spec só pede exibição, não bloqueio. Fica para uma capability futura ou para quando a
  spec de uma tela específica exigir isso.
- **"Entrar com Google", "Esqueci a senha", "Cadastre sua clínica", "Manter conectado"**:
  presentes no protótipo visual, mas sem requirement, model ou capability por trás. Não
  entram na tela real (nem como elemento desabilitado) para não simular uma função que não
  existe.
- **Auto-cadastro de clínica ou de usuário**: usuários e vínculos são criados via
  `prisma/seed.ts` ou diretamente no banco; não há tela de signup nesta change.

## Decisions

### 1. Split `auth.config.ts` (edge-safe) / `auth.ts` (Node completo)
`src/lib/auth.config.ts` exporta o `NextAuthConfig` sem `providers` (sem `CredentialsProvider`,
sem `bcryptjs`) — só `callbacks`, `pages`, `session: { strategy: "jwt" }`. `src/lib/auth.ts`
importa esse config, adiciona o `CredentialsProvider` (com `bcrypt.compare` contra
`Usuario.senhaHash`) e exporta `{ auth, signIn, signOut, handlers }`. `src/middleware.ts`
importa `auth` a partir de uma instância do Auth.js construída só com `auth.config.ts`
(`NextAuth(authConfig).auth`), nunca de `auth.ts`.
- **Alternativa considerada**: um único `auth.ts` importado também pelo middleware. Rejeitada
  porque o bundler do Next.js arrastaria `bcryptjs` para o runtime de Edge — na melhor
  hipótese infla o bundle, na pior quebra o build ou o middleware em produção.

### 2. `clinicaAtivaId` resolvido em dois momentos do `callbacks.jwt`
- `trigger === "signIn"`: busca `UsuarioClinica` do usuário. Exatamente 1 vínculo → grava
  `clinicaAtivaId` direto no token (pula a tela de seleção, conforme spec). Mais de 1 → token
  fica sem `clinicaAtivaId`, e a tela de seleção decide.
- `trigger === "update"`: recebe `clinicaId` candidata (via `selecionarClinica`), **revalida
  no banco** que existe `UsuarioClinica` para aquele `usuarioId` + `clinicaId` antes de gravar
  — nunca confia no valor recebido do client sem essa checagem, mesmo vindo de uma Server
  Action.
- **Alternativa considerada**: guardar a clínica ativa em um cookie separado, fora do JWT do
  Auth.js. Rejeitada — duplicaria a fonte da verdade da sessão e criaria uma segunda checagem
  de consistência (cookie vs. token) que o middleware precisaria arbitrar.

### 3. Troca de clínica via Server Action (validação) + `useSession().update()` (refresh de sessão)
O trigger `"update"` do `callbacks.jwt` só é acionado pela rota interna `/api/auth/session`,
que só é chamada pelo hook cliente `useSession().update(...)` — uma Server Action isolada não
consegue disparar esse trigger diretamente (não existe um `update()` server-side exportado
por `NextAuth()` em App Router). Por isso o fluxo real é:
1. `selecionarClinica(clinicaId)` (Server Action) revalida no banco que o usuário tem
   `UsuarioClinica` para aquela clínica — 1ª camada de defesa.
2. O Client Component que chamou a action, se ela retornar sucesso, chama
   `useSession().update({ clinicaAtivaId: clinicaId })` — isso é o que efetivamente aciona
   `callbacks.jwt` com `trigger === "update"` no servidor, que **revalida de novo** antes de
   gravar (2ª camada de defesa, a que realmente importa: mesmo se alguém chamar `update()`
   direto do client sem passar pela Server Action, o callback rejeita sozinho).
Continua sem exigir novo login/senha — só passa pelo hook de sessão do Auth.js, não por
`signIn()`. Exige um `<SessionProvider>` no layout raiz para `useSession()` funcionar, e o
componente que dispara a troca ser Client Component (consistente com a convenção do projeto
de que UI interativa é Client Component isolado).
- **Alternativa considerada**: reautenticar silenciosamente (`signIn("credentials", {...})`
  de novo com a clínica escolhida). Rejeitada — exigiria guardar a senha ou reimplementar
  login sem senha, e a spec já diz explicitamente "sem exigir nova autenticação".
- **Alternativa considerada**: Server Action reescreve o cookie de sessão manualmente
  (`next-auth/jwt` `decode`/`encode` + `cookies().set(...)`), sem envolver client nenhum.
  Rejeitada por ora — reimplementa por fora um mecanismo que o Auth.js já expõe oficialmente
  via `update()`; manter o caminho documentado é mais robusto a mudanças de versão do
  Auth.js do que recriar a serialização do JWT à mão.

### 4. Isolamento por 404 é uma consequência do filtro por `clinicaId`, não uma checagem extra
Nenhum código novo de "verificar se o recurso pertence à clínica ativa e retornar 404" é
necessário nesta capability — isso decorre de toda query já filtrar por `clinicaId` (regra
de `project.md`, implementada via `getClinicaAtual()`). O que esta capability garante é que
`getClinicaAtual()` finalmente funcione e nunca retorne uma `clinicaId` não pertencente ao
usuário. A prova de que o padrão funciona fica no teste de integração (`tasks.md`), que só
pode existir depois que pelo menos uma rota de recurso (usada como referência) filtra por
`clinicaId` — combinamos usar **Pacientes** como esse recurso de referência, já que o
model existe no schema mesmo a capability `pacientes` ainda não estando implementada; o teste
cobre a query diretamente via Prisma, sem depender da UI da capability `pacientes`.

## Risks / Trade-offs

- **[Risco] Um dev esquece o filtro de `clinicaId` em uma query futura → vaza dado entre
  clínicas.** → Mitigação: `getClinicaAtual()` como único ponto de leitura (já é a regra do
  projeto); o teste de isolamento desta change fica como referência/exemplo para as demais
  capabilities repetirem o mesmo padrão de teste.
- **[Risco] `callbacks.jwt` com `trigger === "update"` aceitando `clinicaId` sem revalidar
  contra `UsuarioClinica` → usuário força troca para clínica sem vínculo.** → Mitigação:
  revalidação no banco é parte do design (Decisão 2), não opcional.
- **[Trade-off] Sem RBAC por papel nesta change** → um `RECEPCAO` tecnicamente acessa as
  mesmas rotas que um `ADMIN` dentro da clínica ativa. Aceito como Non-Goal explícito; se
  isso for um problema antes de existir uma spec dedicada, é uma decisão de produto a revisar,
  não um bug desta implementação.
- **[Trade-off] Duração de sessão fixa (sem "manter conectado")** → todo login usa o mesmo
  `maxAge` de sessão JWT (constante de config). Simplifica o escopo; se no futuro for preciso
  sessão curta vs. longa, isso é uma nova decisão, não uma regressão desta change.

## Migration Plan

Sem dado existente em produção para migrar (schema já existe, sem alteração). Passos de
entrega:
1. `auth.config.ts` + `auth.ts` + tipos (`next-auth.d.ts` já pronto).
2. `middleware.ts` real, substituindo o passthrough.
3. `selecionarClinica` (Server Action) + tela de seleção de clínica.
4. Tela de login real, substituindo o placeholder.
5. Teste de integração de isolamento (referência: Pacientes).
Sem rollback especial: reverter para os stubs atuais (`throw` / passthrough) é seguro, já que
nenhuma outra capability depende de dado gravado por esta — apenas do contrato de
`getClinicaAtual()`.
