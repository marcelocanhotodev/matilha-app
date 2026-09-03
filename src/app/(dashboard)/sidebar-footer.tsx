"use client";

// Rodapé da sidebar (capability: navegacao) — cartão informativo da clínica
// ativa + botão de logout. Troca de clínica pelo painel foi removida
// (capability: autenticacao-multi-clinica — Requirement: Troca de clínica
// exige logout e novo login); este componente não abre mais nenhum
// dropdown, só mostra o nome/papel da clínica ativa e sai da conta.

import { signOut } from "next-auth/react";
import type { PapelUsuario } from "@prisma/client";

const PAPEL_LABEL: Record<PapelUsuario, string> = {
  ADMIN: "Administrador(a)",
  VETERINARIO: "Veterinário(a)",
  RECEPCAO: "Recepção",
};

export function SidebarFooter({
  clinicaNome,
  papel,
}: {
  clinicaNome: string;
  papel: PapelUsuario;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-2.5 py-2">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[9px] bg-sage-500 text-xs font-semibold text-pine-900">
        {clinicaNome.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[13px] font-semibold text-white">{clinicaNome}</div>
        <div className="truncate text-[11.5px] text-sage-300">{PAPEL_LABEL[papel]}</div>
      </div>
      <button
        type="button"
        onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
        title="Sair"
        className="flex-shrink-0 rounded-lg px-2 py-1 text-[12.5px] font-medium text-sage-300 hover:bg-white/10 hover:text-white"
      >
        Sair
      </button>
    </div>
  );
}
