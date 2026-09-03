// ============================================================================
// Config completa do Auth.js (Node runtime): providers + callbacks.jwt que
// consultam o banco. Usado pela route handler /api/auth/[...nextauth] e por
// Server Components/Actions (nunca pelo middleware — ver auth.config.ts).
//
// Capability: autenticacao-multi-clinica. Ver openspec/specs/autenticacao-
// multi-clinica/spec.md para os requirements e design.md para as decisões.
// ============================================================================

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/prisma";
import { resolverClinicaAtivaNoLogin, usuarioTemVinculoComClinica } from "@/lib/clinica-selecao";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "E-mail", type: "email" },
        senha: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const senha = credentials?.senha;
        if (typeof email !== "string" || typeof senha !== "string") return null;

        const usuario = await prisma.usuario.findUnique({ where: { email } });
        // Mesma resposta (null) tanto para e-mail inexistente quanto para
        // senha errada — spec: "nunca indicar se o e-mail existe ou não".
        if (!usuario) return null;

        const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);
        if (!senhaValida) return null;

        // usuario.id é Int (PK) — a sessão/JWT do Auth.js guarda ids como
        // string por convenção (ver src/types/next-auth.d.ts), então
        // converte aqui, na fronteira única entre Prisma e sessão.
        return { id: String(usuario.id), email: usuario.email, name: usuario.nome };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user, trigger, session }) {
      // Primeiro login: `user` só vem preenchido aqui (retorno de authorize()).
      if (user?.id) {
        token.id = user.id;
        token.email = user.email ?? undefined;
        token.clinicaAtivaId = await resolverClinicaAtivaNoLogin(user.id);
      }

      // Troca de clínica: disparado por useSession().update({ clinicaAtivaId })
      // no client (ver design.md, Decisão 3). Revalida no banco antes de
      // aceitar — nunca confia no valor vindo do client sem essa checagem,
      // mesmo que uma Server Action já tenha validado antes.
      if (trigger === "update" && typeof session?.clinicaAtivaId === "string" && typeof token.id === "string") {
        const podeTrocar = await usuarioTemVinculoComClinica(token.id, session.clinicaAtivaId);
        if (podeTrocar) {
          token.clinicaAtivaId = session.clinicaAtivaId;
        }
        // Sem vínculo: ignora silenciosamente — token não muda.
      }

      return token;
    },
  },
});
