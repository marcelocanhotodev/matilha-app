"use server";

// Server Actions de Agendamento relacionadas ao ciclo de status (capability:
// agendamento, Requirement: Ciclo de status do agendamento — estendido por
// openspec/changes/implementar-atendimento-comanda). As transições para
// "concluído"/"cancelado" moram em src/lib/actions/comanda.ts (acionadas por
// finalizar/descartar); esta action cobre só a transição para "em
// atendimento", disparada pela seleção na fila da tela de atendimento.

import { prisma } from "@/lib/prisma";
import { getClinicaAtual } from "@/lib/tenant";
import { z } from "zod";

export interface AgendamentoActionResultado {
  ok: boolean;
  erro?: string;
}

const selecionarAgendamentoSchema = z.object({
  agendamentoId: z.string().min(1),
});

/**
 * Scenario "Selecionar na fila inicia o atendimento": AGUARDANDO ->
 * EM_ATENDIMENTO. Scenario "Selecionar agendamento já concluído ou
 * cancelado não regride o status": CONCLUIDO/CANCELADO nunca voltam — a
 * condição `status: "AGUARDANDO"` no `where` garante isso (agendamentos
 * fora desse status simplesmente não casam com nenhuma linha, `count` fica
 * 0, e a operação é tratada como sucesso sem efeito).
 */
export async function selecionarAgendamento(dadosBrutos: unknown): Promise<AgendamentoActionResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = selecionarAgendamentoSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { agendamentoId } = parse.data;

  const agendamento = await prisma.agendamento.findFirst({ where: { id: agendamentoId, clinicaId } });
  if (!agendamento) {
    return { ok: false, erro: "Agendamento não encontrado." };
  }

  if (agendamento.status === "AGUARDANDO") {
    await prisma.agendamento.update({
      where: { id: agendamentoId },
      data: { status: "EM_ATENDIMENTO" },
    });
  }
  // EM_ATENDIMENTO selecionado de novo: sem efeito (já está no estado certo).
  // CONCLUIDO/CANCELADO: sem efeito — nunca regride.

  return { ok: true };
}
