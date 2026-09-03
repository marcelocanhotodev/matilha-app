"use client";

// Hook usado pela tela de seleção de clínica (`/selecionar-clinica`,
// capability: autenticacao-multi-clinica) — encapsula o fluxo de validação
// (Server Action) + refresh de sessão (design.md, Decisão 3). Não usado
// dentro do painel: trocar a clínica ativa de uma sessão já autenticada
// exige logout (ver Requirement: Troca de clínica exige logout e novo
// login) — este hook só cobre a escolha inicial, quando a sessão ainda não
// tem `clinicaAtivaId`.

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
