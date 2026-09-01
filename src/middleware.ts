// Middleware de autenticação/tenant (capability: autenticacao-multi-clinica).
//
// Roda em Edge runtime — por isso usa só authConfig (sem providers/bcrypt/
// Prisma, ver src/lib/auth.config.ts). As 3 regras da spec:
//   - não autenticado -> /login
//   - autenticado sem clinicaAtivaId -> /selecionar-clinica
//   - autenticado com clinicaAtivaId -> segue
// Sem checagem de papel (RBAC) — Non-Goal desta capability, ver design.md.

import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const ROTAS_PUBLICAS = ["/login"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const rotaPublica = ROTAS_PUBLICAS.some((rota) => pathname.startsWith(rota));

  if (rotaPublica) {
    return NextResponse.next();
  }

  if (!req.auth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (!req.auth.user.clinicaAtivaId && pathname !== "/selecionar-clinica") {
    return NextResponse.redirect(new URL("/selecionar-clinica", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
