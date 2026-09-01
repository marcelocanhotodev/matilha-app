// ============================================================================
// Config de Auth.js compartilhada entre src/lib/auth.ts (Node, route handler)
// e src/middleware.ts (Edge).
//
// REGRA (capability: autenticacao-multi-clinica, ver design.md, Decisão 1):
// este arquivo NUNCA pode importar `bcryptjs` nem `@/lib/prisma` (nem nada
// que os importe transitivamente, como @/lib/clinica-selecao) — o Prisma
// Client usa APIs de Node que não existem no bundle de Edge runtime, e isso
// quebra o middleware mesmo que o código nunca chegue a rodar lá. A lógica
// de `providers` e a parte de `callbacks.jwt` que consulta UsuarioClinica
// vivem só em auth.ts.
// ============================================================================

import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  // Preenchido em auth.ts — Credentials provider precisa de bcrypt (Node).
  providers: [],
  callbacks: {
    // Só remonta o shape da sessão a partir do token já decodificado — não
    // consulta banco, por isso é seguro rodar em Edge (middleware chama
    // auth() para leitura, o que passa por aqui).
    async session({ session, token }) {
      if (typeof token.id === "string") session.user.id = token.id;
      if (typeof token.email === "string") session.user.email = token.email;
      session.user.clinicaAtivaId =
        typeof token.clinicaAtivaId === "string" ? token.clinicaAtivaId : undefined;
      return session;
    },
  },
};
