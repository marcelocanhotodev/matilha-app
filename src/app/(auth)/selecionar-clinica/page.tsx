// Tela de seleção de clínica (capability: autenticacao-multi-clinica).
// Só é alcançada por usuários autenticados sem clinicaAtivaId na sessão
// (usuários com 1 vínculo nunca chegam aqui — ver callbacks.jwt em auth.ts).
// Referência visual: openspec/reference/prototipo.html, #auth-step-clinics.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listarClinicasDoUsuario } from "@/lib/clinica-selecao";
import { ClinicOptionList } from "./clinic-option-list";

export default async function SelecionarClinicaPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (session.user.clinicaAtivaId) {
    redirect("/");
  }

  const clinicas = await listarClinicasDoUsuario(session.user.id);

  return (
    <main className="flex min-h-screen items-center justify-center bg-sand-50 p-8">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <h1 className="font-display text-2xl text-pine-900">Qual clínica?</h1>
          <p className="text-sm text-pine-700">
            Sua conta tem acesso a mais de uma unidade. Escolha onde quer trabalhar agora.
          </p>
        </div>
        <ClinicOptionList clinicas={clinicas} />
      </div>
    </main>
  );
}
