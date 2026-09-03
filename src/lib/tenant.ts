// ============================================================================
// Helper central de multi-tenancy.
//
// REGRA DO PROJETO (ver openspec/project.md e openspec/AGENTS.md):
// nenhuma query do Prisma sobre Cliente, Paciente, Agendamento, ItemCatalogo,
// Comanda ou ComandaItem pode ser escrita sem passar por `clinicaId`. Este
// arquivo existe para que essa checagem tenha um único ponto de verdade —
// nunca leia a clinicaId "na mão" de um cookie ou header espalhado pelo código.
// ============================================================================

import { auth } from "@/lib/auth";

export class SemClinicaAtivaError extends Error {
  constructor() {
    super("Nenhuma clínica ativa na sessão — usuário precisa selecionar uma clínica.");
    this.name = "SemClinicaAtivaError";
  }
}

/**
 * Retorna a clinicaId ativa na sessão do usuário autenticado.
 * Lança SemClinicaAtivaError se não houver clínica selecionada — isso deve
 * ser tratado pela camada de UI redirecionando para a tela de seleção de
 * clínica, nunca silenciosamente ignorado.
 *
 * A sessão/JWT guarda `clinicaAtivaId` como string (padrão do Auth.js — ver
 * src/types/next-auth.d.ts) mas a PK de Clinica é Int; esta função é o único
 * ponto de conversão string->number, então todo o resto do código de negócio
 * já recebe um `number` pronto.
 *
 * Uso esperado em toda query de dados de negócio:
 *
 *   const clinicaId = await getClinicaAtual();
 *   const pacientes = await prisma.paciente.findMany({ where: { clinicaId } });
 */
export async function getClinicaAtual(): Promise<number> {
  const session = await auth();
  const clinicaId = session?.user?.clinicaAtivaId;

  if (!clinicaId) {
    throw new SemClinicaAtivaError();
  }

  return Number(clinicaId);
}
