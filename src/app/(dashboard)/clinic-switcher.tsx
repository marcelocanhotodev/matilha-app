"use client";

// Seletor de clínica no painel (capability: autenticacao-multi-clinica) —
// equivalente ao "clinic-pill" do protótipo. A lógica de troca
// (useTrocarClinica, dropdown de outras clínicas) é a mesma nas duas
// variantes; só o estilo do botão-gatilho muda:
// - "header": fundo claro, usado isoladamente (ex.: antes da sidebar existir).
// - "sidebar": fundo escuro translúcido, para caber no rodapé da sidebar
//   (capability: navegacao — ver openspec/specs/navegacao/spec.md).

import { useState } from "react";
import { useTrocarClinica } from "@/lib/hooks/use-trocar-clinica";
import type { ClinicaDoUsuario } from "@/lib/clinica-selecao";
import type { PapelUsuario } from "@prisma/client";

const PAPEL_LABEL: Record<PapelUsuario, string> = {
  ADMIN: "Administrador(a)",
  VETERINARIO: "Veterinário(a)",
  RECEPCAO: "Recepção",
};

export function ClinicSwitcher({
  clinicas,
  clinicaAtivaId,
  variant = "header",
}: {
  clinicas: ClinicaDoUsuario[];
  clinicaAtivaId: string;
  variant?: "header" | "sidebar";
}) {
  const [aberto, setAberto] = useState(false);
  const { trocar, erro, pendente } = useTrocarClinica();
  const clinicaAtiva = clinicas.find((c) => c.clinicaId === clinicaAtivaId);
  const outras = clinicas.filter((c) => c.clinicaId !== clinicaAtivaId);

  if (!clinicaAtiva) return null;

  const trigger =
    variant === "sidebar" ? (
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Trocar de clínica"
        className="flex w-full items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2 text-left hover:bg-white/10"
      >
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-sage-500 text-xs font-semibold text-pine-900">
          {clinicaAtiva.clinicaNome.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate text-[13px] font-semibold text-white">
            {clinicaAtiva.clinicaNome}
          </div>
          <div className="truncate text-[11.5px] text-sage-300">
            {PAPEL_LABEL[clinicaAtiva.papel]}
          </div>
        </div>
        <span className="flex-shrink-0 text-sage-300">▾</span>
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Trocar de clínica"
        className="flex items-center gap-2 rounded-md border border-sage-300 bg-white px-3 py-1.5 text-sm hover:border-sage-500"
      >
        <span className="font-medium text-pine-900">{clinicaAtiva.clinicaNome}</span>
        <span className="text-pine-700">▾</span>
      </button>
    );

  return (
    <div className="relative">
      {trigger}

      {aberto && (
        <div
          className={
            "absolute w-64 rounded-md border border-sage-300 bg-white p-2 shadow-lg " +
            (variant === "sidebar" ? "bottom-full left-0 mb-1" : "right-0 mt-1")
          }
        >
          {erro && <p className="mb-1 text-xs text-red-700">{erro}</p>}
          {outras.length === 0 ? (
            <p className="px-2 py-1 text-xs text-pine-700">Sem outras clínicas vinculadas.</p>
          ) : (
            outras.map((clinica) => (
              <button
                key={clinica.clinicaId}
                type="button"
                disabled={pendente}
                onClick={() => trocar(clinica.clinicaId, () => setAberto(false))}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-sand-100 disabled:opacity-60"
              >
                {clinica.clinicaNome}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
