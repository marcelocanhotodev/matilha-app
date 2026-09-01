// ============================================================================
// Consultas de UsuarioClinica usadas pelo fluxo de autenticação/seleção de
// clínica (capability: autenticacao-multi-clinica).
//
// Isolado num módulo próprio (em vez de inline no callback jwt) para poder
// ser testado com Vitest sem precisar montar toda a máquina do Auth.js.
//
// IMPORTANTE: este módulo importa Prisma — nunca importar a partir de
// src/lib/auth.config.ts (usado pelo middleware em Edge runtime). Só
// src/lib/auth.ts (Node) e Server Actions/Components podem importá-lo.
// ============================================================================

import { prisma } from "@/lib/prisma";
import type { PapelUsuario } from "@prisma/client";

export interface ClinicaDoUsuario {
  clinicaId: string;
  clinicaNome: string;
  papel: PapelUsuario;
}

/** Lista as clínicas vinculadas a um usuário, para a tela de seleção. */
export async function listarClinicasDoUsuario(usuarioId: string): Promise<ClinicaDoUsuario[]> {
  const vinculos = await prisma.usuarioClinica.findMany({
    where: { usuarioId },
    include: { clinica: { select: { nome: true } } },
  });

  return vinculos.map((v) => ({
    clinicaId: v.clinicaId,
    clinicaNome: v.clinica.nome,
    papel: v.papel,
  }));
}

/**
 * Resolve a clínica ativa no momento do login: se o usuário tem exatamente 1
 * vínculo, retorna essa clinicaId direto (pula a tela de seleção). Se tem 0
 * ou mais de 1, retorna undefined — a tela de seleção decide.
 */
export async function resolverClinicaAtivaNoLogin(usuarioId: string): Promise<string | undefined> {
  const vinculos = await prisma.usuarioClinica.findMany({
    where: { usuarioId },
    select: { clinicaId: true },
  });

  return vinculos.length === 1 ? vinculos[0].clinicaId : undefined;
}

/**
 * Confirma que o usuário tem vínculo (qualquer papel) com a clínica dada.
 * Usado antes de aceitar uma troca de clínica — nunca gravar clinicaAtivaId
 * na sessão sem passar por aqui primeiro.
 */
export async function usuarioTemVinculoComClinica(
  usuarioId: string,
  clinicaId: string
): Promise<boolean> {
  const vinculo = await prisma.usuarioClinica.findUnique({
    where: { usuarioId_clinicaId: { usuarioId, clinicaId } },
  });

  return vinculo !== null;
}
