## 1. Infraestrutura de testes (Vitest)

<!-- Escopo adicional identificado durante o apply: o projeto não tinha nenhum test
     runner configurado, mas as tasks abaixo dependem de testes automatizados.
     Decisão do usuário: configurar Vitest agora, como parte desta change. -->

- [x] 1.1 Instalar `vitest` (dev dependency) e criar `vitest.config.ts` (ambiente `node`,
      alias `@/` → `src/` igual ao `tsconfig.json`); adicionar script `"test": "vitest run"`
      em `package.json`; verificar que `npm test` roda sem erro mesmo sem nenhum teste ainda.
- [x] 1.2 Documentar, em comentário no primeiro arquivo de teste desta change, o
      pré-requisito de execução: Postgres do `docker-compose.yml` rodando e migrado
      (`npx prisma migrate dev`) — os testes de integração usam o mesmo `DATABASE_URL` do
      dev, criando/limpando suas próprias linhas (mesmo padrão do `prisma/seed.ts`), já que
      não há banco de teste separado no projeto.

## 2. Configuração de auth (split edge/node)

- [x] 2.1 Criar `src/lib/auth.config.ts` com `NextAuthConfig` sem providers (session strategy
      `jwt`, `pages.signIn`, `callbacks.jwt` e `callbacks.session` — ver Decisão 1 e 2 do
      design) e verificar que o arquivo não importa `bcryptjs` nem `@/lib/prisma`.
- [x] 2.2 Reescrever `src/lib/auth.ts` para importar `auth.config.ts`, adicionar
      `CredentialsProvider` (valida e-mail/senha contra `Usuario.senhaHash` via
      `bcrypt.compare`) e exportar `{ auth, signIn, signOut, handlers }`; verificar que
      `npm run build` compila sem erro.
- [x] 2.3 Implementar em `callbacks.jwt` a resolução de `clinicaAtivaId` no `trigger ===
      "signIn"` (busca `UsuarioClinica` do usuário; 1 vínculo → seta direto; >1 → deixa vazio)
      e verificar com um teste Vitest usando o usuário seed (1 vínculo → `clinicaAtivaId` já
      vem preenchido). Confirmado também ao vivo: login real do usuário seed (1 vínculo)
      retorna sessão já com `clinicaAtivaId`; com um 2º vínculo adicionado temporariamente,
      a sessão vem sem `clinicaAtivaId`.
- [x] 2.4 Implementar em `callbacks.jwt` o `trigger === "update"` que revalida no banco a
      existência de `UsuarioClinica` para `usuarioId` + `clinicaId` recebida antes de gravar, e
      verificar com um teste Vitest que uma `clinicaId` sem vínculo é rejeitada (token não
      muda). Confirmado também ao vivo via POST `/api/auth/session`: `clinicaId` sem vínculo
      → sessão inalterada; `clinicaId` com vínculo → sessão atualizada.
- [x] 2.5 Atualizar `src/app/api/auth/[...nextauth]/route.ts` para expor os `handlers` de
      `auth.ts` e verificar que `GET`/`POST` em `/api/auth/session` respondem sem erro.

## 3. Middleware e roteamento

- [x] 3.1 Reescrever `src/middleware.ts` para usar `auth.config.ts` (via
      `NextAuth(authConfig).auth`) e implementar os 3 casos da spec: sem sessão → `/login`;
      sessão sem `clinicaAtivaId` → `/selecionar-clinica`; ambos presentes → segue. Sem
      checagem de papel (Non-Goal do design).
- [x] 3.2 Verificar manualmente (ou com teste de middleware) os 3 redirecionamentos acima
      contra rotas do grupo `(dashboard)`. Verificado ao vivo (curl contra dev server real):
      sem sessão → 307 para `/login`; sessão sem `clinicaAtivaId` → 307 para
      `/selecionar-clinica`; sessão com `clinicaAtivaId` → 200 em `/dashboard`.

## 4. Server Action de troca de clínica

- [x] 4.1 Implementar `selecionarClinica(clinicaId: string)` (Server Action) que dispara o
      update de sessão do Auth.js (trigger `"update"`) e verificar com um teste Vitest que,
      chamada com uma `clinicaId` válida para o usuário, a sessão retornada por `auth()`
      reflete a nova `clinicaAtivaId`. Mecanismo completo (Server Action + refresh via sessão)
      confirmado ao vivo ponta a ponta — ver 2.4.
- [x] 4.2 Verificar com um teste Vitest que `selecionarClinica` chamada com uma `clinicaId`
      sem vínculo não altera a sessão (mesma checagem de 2.4, agora fim-a-fim pela Server
      Action).

## 5. Telas (login e seleção de clínica)

- [x] 5.1 Implementar `src/app/(auth)/login/page.tsx` com formulário e-mail + senha chamando
      `signIn("credentials", ...)`, sem os elementos fora de escopo (Google, esqueci senha,
      cadastro de clínica, manter conectado — ver Non-Goals do design); verificar login bem-
      sucedido com o usuário seed e mensagem genérica de erro em senha incorreta (sem indicar
      se o e-mail existe). Confirmado ao vivo: login com o usuário seed funciona; senha errada
      e e-mail inexistente retornam exatamente o mesmo erro (`CredentialsSignin`).
- [x] 5.2 Criar `src/app/(auth)/selecionar-clinica/page.tsx` listando as clínicas do usuário
      (nome + papel, com base em `UsuarioClinica`) e chamando `selecionarClinica` ao escolher;
      verificar que só aparece quando há >1 vínculo (usuário com 1 vínculo nunca a vê, por
      força do middleware + 2.3). Confirmado ao vivo (ver 3.2 e 2.3).
- [x] 5.3 Adicionar o seletor de clínica no painel (equivalente ao `clinic-pill` do
      protótipo) reutilizando a mesma lista/ação de 5.2, e verificar que trocar de clínica no
      painel não desloga o usuário. Confirmado ao vivo: após a troca de sessão bem-sucedida,
      `/dashboard` continua respondendo 200 com o mesmo cookie de sessão (sem novo login).

## 6. Isolamento entre clínicas

- [x] 6.1 Escrever o teste de integração de referência (Vitest): login na Clínica A (seed),
      tentar buscar (via query direta com `getClinicaAtual()`) um Paciente pertencente a uma
      Clínica B criada só para o teste, e verificar que o resultado é `null`/404 — nunca um
      erro de 403 nem o dado da Clínica B.
- [x] 6.2 Documentar no próprio teste (comentário) que este é o padrão de referência a ser
      repetido pelas capabilities `clientes`, `agendamento`, `atendimento-comanda` etc. quando
      forem implementadas.

## 7. Limpeza dos stubs

- [x] 7.1 Remover os comentários `TODO (capability: autenticacao-multi-clinica)` de
      `src/lib/tenant.ts`, `src/lib/auth.ts` (antigo stub, já reescrito em 2.2),
      `src/middleware.ts` e `src/types/next-auth.d.ts`, e verificar (`grep`) que nenhum
      arquivo do projeto ainda referencia esta capability como pendente.
- [x] 7.2 Rodar a suíte de testes completa (`npm test`) e o `npm run build` uma última vez
      para confirmar que nada dos stubs anteriores ficou quebrado. `npm test`: 3 arquivos,
      9 testes, todos passando. `npm run build`: compila sem erro, 13 rotas geradas,
      middleware em 78.3 kB.
