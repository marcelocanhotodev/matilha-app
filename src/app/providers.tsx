"use client";

// Provider de sessão do Auth.js (capability: autenticacao-multi-clinica).
// Necessário para useSession()/update() funcionarem em Client Components
// (tela de seleção de clínica, seletor de clínica no painel).

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
