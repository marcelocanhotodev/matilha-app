"use client";

// Seletor de clínica no painel (capability: autenticacao-multi-clinica) —
// equivalente ao "clinic-pill" do protótipo. Versão mínima: mostra a clínica
// ativa e um dropdown simples para trocar; a navegação lateral completa do
// protótipo pertence às telas de cada capability, não a esta.

import { useState } from "react";
import { useTrocarClinica } from "@/lib/hooks/use-trocar-clinica";
import type { ClinicaDoUsuario } from "@/lib/clinica-selecao";

export function ClinicSwitcher({
  clinicas,
  clinicaAtivaId,
}: {
  clinicas: ClinicaDoUsuario[];
  clinicaAtivaId: string;
}) {
  const [aberto, setAberto] = useState(false);
  const { trocar, erro, pendente } = useTrocarClinica();
  const clinicaAtiva = clinicas.find((c) => c.clinicaId === clinicaAtivaId);
  const outras = clinicas.filter((c) => c.clinicaId !== clinicaAtivaId);

  if (!clinicaAtiva) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        title="Trocar de clínica"
        className="flex items-center gap-2 rounded-md border border-sage-300 bg-white px-3 py-1.5 text-sm hover:border-sage-500"
      >
        <span className="font-medium text-pine-900">{clinicaAtiva.clinicaNome}</span>
        <span className="text-pine-700">▾</span>
      </button>

      {aberto && (
        <div className="absolute right-0 mt-1 w-64 rounded-md border border-sage-300 bg-white p-2 shadow-lg">
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
