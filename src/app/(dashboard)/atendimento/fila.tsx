"use client";

// Fila de agendamentos do dia (Requirement: Fila de agendamentos do dia).
// Puramente apresentacional — o estado da sessão de atendimento vive em
// <AtendimentoWorkspace>. Card não clicável quando o agendamento já está
// "concluído" ou "cancelado" (Requirement: Imutabilidade de comanda
// finalizada ou cancelada — o clique nem chega a tentar reabrir edição).

import type { AgendamentoFila } from "./types";

const STATUS_LABEL: Record<string, string> = {
  AGUARDANDO: "Aguardando",
  EM_ATENDIMENTO: "Em atendimento",
  CONCLUIDO: "Concluído",
  CANCELADO: "Cancelado",
};

function horario(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(data));
}

export function Fila({
  agendamentos,
  selecionadoId,
  onSelecionarAgendamento,
  onSelecionarAvulso,
  disabled,
}: {
  agendamentos: AgendamentoFila[];
  selecionadoId: string | null; // agendamentoId selecionado, ou "avulso"
  onSelecionarAgendamento: (agendamento: AgendamentoFila) => void;
  onSelecionarAvulso: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={onSelecionarAvulso}
        className={`flex flex-col items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:opacity-60 ${
          selecionadoId === "avulso" ? "border-gold-600 bg-gold-500/15" : "border-sage-300 bg-white"
        }`}
      >
        <span className="text-lg">➕</span>
        <span className="font-medium text-pine-900">Avulso</span>
      </button>

      {agendamentos.length === 0 && (
        <p className="self-center px-2 text-sm text-pine-700">Nenhum agendamento para hoje.</p>
      )}

      {agendamentos.map((agendamento) => {
        const interativel = agendamento.status === "AGUARDANDO" || agendamento.status === "EM_ATENDIMENTO";
        const selecionado = selecionadoId === agendamento.id;
        return (
          <button
            key={agendamento.id}
            type="button"
            disabled={disabled || !interativel}
            title={
              interativel
                ? undefined
                : `${STATUS_LABEL[agendamento.status]} — não pode mais ser editado`
            }
            onClick={() => onSelecionarAgendamento(agendamento)}
            className={`flex min-w-[110px] flex-col items-center gap-1 rounded-md border px-3 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
              selecionado ? "border-gold-600 bg-gold-500/15" : "border-sage-300 bg-white"
            }`}
          >
            <span className="font-mono text-[11px] text-pine-700">{horario(agendamento.dataHoraInicio)}</span>
            <span className="font-medium text-pine-900">{agendamento.paciente.nome}</span>
            <span className="text-[10px] uppercase tracking-wide text-pine-700">
              {STATUS_LABEL[agendamento.status] ?? agendamento.status}
            </span>
          </button>
        );
      })}
    </div>
  );
}
