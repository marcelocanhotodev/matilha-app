"use server";

// Server Action de troca/seleção de clínica (capability: autenticacao-multi-
// clinica). Ver design.md, Decisão 3: esta action é a 1ª camada de validação;
// o efetivo refresh da sessão é disparado pelo client via
// useSession().update({ clinicaAtivaId }), que aciona a 2ª camada (dentro de
// callbacks.jwt em src/lib/auth.ts) — nunca confiar só nesta 1ª camada.

import { auth } from "@/lib/auth";
import { usuarioTemVinculoComClinica } from "@/lib/clinica-selecao";

export interface SelecionarClinicaResultado {
  ok: boolean;
  erro?: string;
}

export async function selecionarClinica(clinicaId: string): Promise<SelecionarClinicaResultado> {
  const session = await auth();
  const usuarioId = session?.user?.id;

  if (!usuarioId) {
    return { ok: false, erro: "Sessão inválida." };
  }

  const temVinculo = await usuarioTemVinculoComClinica(usuarioId, clinicaId);
  if (!temVinculo) {
    return { ok: false, erro: "Você não tem acesso a esta clínica." };
  }

  return { ok: true };
}
