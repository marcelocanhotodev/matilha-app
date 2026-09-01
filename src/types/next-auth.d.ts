// Extensão de tipos da sessão e do JWT do Auth.js para incluir a clínica
// ativa. Ver src/lib/tenant.ts, src/lib/auth.config.ts, src/lib/auth.ts e
// openspec/specs/autenticacao-multi-clinica/spec.md.

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      /** clinicaId atualmente selecionada nesta sessão, se houver. */
      clinicaAtivaId?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    email?: string;
    /** clinicaId atualmente selecionada nesta sessão, se houver. */
    clinicaAtivaId?: string;
  }
}
