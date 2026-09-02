"use client";

// Seção "Comandas em aberto" (Requirement: Comandas em aberto) — comandas
// ABERTA vinculadas a agendamento de outro dia, ou avulsas. Oculta quando
// vazia (a lista chega já filtrada de page.tsx). Puramente apresentacional;
// "Retomar"/"Descartar" disparam callbacks tratados em
// atendimento-workspace.tsx.

import type { ComandaForaDaFila } from "./types";

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function haQuanto(data: Date): string {
  const minutos = Math.round((Date.now() - new Date(data).getTime()) / 60000);
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.round(horas / 24);
  return `há ${dias}d`;
}

export function ComandasAbertas({
  comandas,
  disabled,
  onRetomar,
  onDescartar,
}: {
  comandas: ComandaForaDaFila[];
  disabled: boolean;
  onRetomar: (comanda: ComandaForaDaFila) => void;
  onDescartar: (comanda: ComandaForaDaFila) => void;
}) {
  if (comandas.length === 0) return null;

  return (
    <section className="flex flex-col gap-2 rounded-md border border-sage-300 bg-white p-4">
      <h2 className="font-display text-lg text-pine-900">Comandas em aberto</h2>
      <div className="flex flex-col divide-y divide-sage-300">
        {comandas.map((comanda) => (
          <div key={comanda.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="font-medium text-pine-900">
                {comanda.agendamento ? comanda.agendamento.paciente.nome : "Avulso"}
              </div>
              <div className="text-xs text-pine-700">
                {haQuanto(comanda.criadoEm)} · {comanda.itens.length}{" "}
                {comanda.itens.length === 1 ? "item" : "itens"} · {moeda(Number(comanda.total))}
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRetomar(comanda)}
                className="rounded-md border border-sage-300 px-3 py-1.5 text-xs text-pine-800 hover:bg-sand-100 disabled:opacity-60"
              >
                Retomar
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDescartar(comanda)}
                className="rounded-md border border-sage-300 px-3 py-1.5 text-xs text-pine-800 hover:bg-sand-100 disabled:opacity-60"
              >
                Descartar
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
