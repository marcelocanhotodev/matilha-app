"use client";

// Lista clicável de clínicas (capability: autenticacao-multi-clinica).

import { useTrocarClinica } from "@/lib/hooks/use-trocar-clinica";
import type { ClinicaDoUsuario } from "@/lib/clinica-selecao";

const PAPEL_LABEL: Record<ClinicaDoUsuario["papel"], string> = {
  ADMIN: "Administrador(a)",
  VETERINARIO: "Veterinário(a)",
  RECEPCAO: "Recepção",
};

export function ClinicOptionList({ clinicas }: { clinicas: ClinicaDoUsuario[] }) {
  const { trocar, erro, pendente } = useTrocarClinica();

  return (
    <div className="flex flex-col gap-2">
      {erro && <p className="text-sm text-red-700">{erro}</p>}
      {clinicas.map((clinica) => (
        <button
          key={clinica.clinicaId}
          type="button"
          disabled={pendente}
          onClick={() => trocar(clinica.clinicaId)}
          className="flex items-center justify-between rounded-md border border-sage-300 bg-white px-4 py-3 text-left hover:border-sage-500 disabled:opacity-60"
        >
          <span>
            <span className="block font-medium text-pine-900">{clinica.clinicaNome}</span>
            <span className="block text-sm text-pine-700">{PAPEL_LABEL[clinica.papel]}</span>
          </span>
          <span className="text-sage-500">›</span>
        </button>
      ))}
    </div>
  );
}
