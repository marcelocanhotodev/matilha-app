"use client";

// Hook compartilhado entre a tela de seleção de clínica e o seletor do
// painel (capability: autenticacao-multi-clinica) — evita duplicar o fluxo
// de validação (Server Action) + refresh de sessão (design.md, Decisão 3).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { selecionarClinica } from "@/lib/actions/clinica";

export function useTrocarClinica() {
  const router = useRouter();
  const { update } = useSession();
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciarTransicao] = useTransition();

  function trocar(clinicaId: string, aoConcluir?: () => void) {
    setErro(null);
    iniciarTransicao(async () => {
      const resultado = await selecionarClinica(clinicaId);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível trocar de clínica.");
        return;
      }

      await update({ clinicaAtivaId: clinicaId });
      aoConcluir?.();
      router.push("/");
      router.refresh();
    });
  }

  return { trocar, erro, pendente };
}
