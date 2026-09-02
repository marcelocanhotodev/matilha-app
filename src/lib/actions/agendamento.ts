"use server";

// Server Actions de Agendamento (capability: agendamento). Duas frentes:
// - Ciclo de status (Requirement: Ciclo de status do agendamento — as
//   transições para "concluído"/"cancelado" moram em
//   src/lib/actions/comanda.ts, acionadas por finalizar/descartar; aqui só
//   a transição pra "em atendimento", disparada pela seleção na fila).
// - Criação (Requirement: Criação de agendamento), com a checagem de
//   conflito de horário — ver openspec/changes/implementar-agendamento/
//   design.md, Decisão 6.

import { prisma } from "@/lib/prisma";
import { getClinicaAtual } from "@/lib/tenant";
import { criarAgendamentoInputSchema } from "@/lib/validators/agendamento";
import { fimDoDiaClinica, inicioDoDiaClinica, paraComponentesClinica, paraDiaCalendario } from "@/lib/timezone";
import { z } from "zod";

export interface AgendamentoActionResultado {
  ok: boolean;
  erro?: string;
}

export interface ConflitoAgendamento {
  agendamentoId: string;
  pacienteNome: string;
  inicio: string;
  fim: string;
}

export interface CriarAgendamentoResultado {
  ok: boolean;
  erro?: string;
  agendamentoId?: string;
  /** Presente (e `ok: false`) quando há sobreposição de horário para o
   * mesmo profissional e a chamada não veio com `ignorarConflito: true` —
   * não é um erro de validação, é um aviso que o formulário deve mostrar
   * com a opção de confirmar mesmo assim (Requirement: Criação de
   * agendamento, Scenario "Conflito de horário para o mesmo
   * profissional"). */
  conflito?: ConflitoAgendamento[];
}

function formatarHora(data: Date): string {
  // Sempre no fuso da clínica — nunca no fuso do processo que roda isso
  // (ver src/lib/timezone.ts).
  const { hora, minuto } = paraComponentesClinica(data);
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
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

/**
 * Cria um agendamento. Se houver sobreposição de horário para o mesmo
 * profissional (excluindo agendamentos "cancelado" — Scenario "Agendamento
 * cancelado não conta como conflito") e a chamada não tiver
 * `ignorarConflito: true`, retorna os conflitos sem criar nada — cabe ao
 * client chamar de novo com `ignorarConflito: true` se o usuário confirmar
 * (Scenario "Confirmar mesmo com conflito"). Nunca um bloqueio duro.
 */
export async function criarAgendamento(dadosBrutos: unknown): Promise<CriarAgendamentoResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = criarAgendamentoInputSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { pacienteId, veterinarioId, itemCatalogoId, dataHoraInicio, duracaoMinutos, ignorarConflito } = parse.data;

  const paciente = await prisma.paciente.findFirst({ where: { id: pacienteId, clinicaId, ativo: true } });
  if (!paciente) {
    return { ok: false, erro: "Paciente não encontrado." };
  }

  const vinculoVet = await prisma.usuarioClinica.findUnique({
    where: { usuarioId_clinicaId: { usuarioId: veterinarioId, clinicaId } },
  });
  if (!vinculoVet) {
    return { ok: false, erro: "Veterinário não encontrado." };
  }

  if (itemCatalogoId) {
    const item = await prisma.itemCatalogo.findFirst({ where: { id: itemCatalogoId, clinicaId } });
    if (!item) {
      return { ok: false, erro: "Item de catálogo não encontrado." };
    }
  }

  const novoFim = new Date(dataHoraInicio.getTime() + duracaoMinutos * 60_000);

  if (!ignorarConflito) {
    // Janela do dia calculada no fuso da clínica (src/lib/timezone.ts) —
    // nunca com `dataHoraInicio.getFullYear()/getMonth()/getDate()`
    // direto, que leria os componentes no fuso do processo que executa a
    // action, podendo divergir do fuso da clínica.
    const diaCalendario = paraDiaCalendario(dataHoraInicio);
    const inicioDoDia = inicioDoDiaClinica(diaCalendario);
    const fimDoDia = fimDoDiaClinica(diaCalendario);

    // Busca ampla (mesmo profissional, mesmo dia, não cancelado) — o
    // overlap fino é filtrado em JS logo abaixo; volume por profissional
    // por dia é sempre pequeno (design.md, Risco aceito).
    const agendamentosDoDia = await prisma.agendamento.findMany({
      where: {
        clinicaId,
        veterinarioId,
        status: { not: "CANCELADO" },
        dataHoraInicio: { gte: inicioDoDia, lte: fimDoDia },
      },
      include: { paciente: { select: { nome: true } } },
    });

    const conflitos = agendamentosDoDia.filter((existente) => {
      const existenteFim = new Date(existente.dataHoraInicio.getTime() + existente.duracaoMinutos * 60_000);
      return existente.dataHoraInicio < novoFim && existenteFim > dataHoraInicio;
    });

    if (conflitos.length > 0) {
      return {
        ok: false,
        conflito: conflitos.map((c) => ({
          agendamentoId: c.id,
          pacienteNome: c.paciente.nome,
          inicio: formatarHora(c.dataHoraInicio),
          fim: formatarHora(new Date(c.dataHoraInicio.getTime() + c.duracaoMinutos * 60_000)),
        })),
      };
    }
  }

  const agendamento = await prisma.agendamento.create({
    data: { clinicaId, pacienteId, veterinarioId, itemCatalogoId, dataHoraInicio, duracaoMinutos },
  });

  return { ok: true, agendamentoId: agendamento.id };
}
