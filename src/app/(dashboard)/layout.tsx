// Layout do painel (capability: autenticacao-multi-clinica) — versão mínima:
// só o essencial para hospedar o seletor de clínica (task 5.3). A navegação
// lateral completa do protótipo (Agenda, Pacientes, Clientes...) pertence às
// telas de cada capability à medida que forem implementadas, não a esta.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listarClinicasDoUsuario } from "@/lib/clinica-selecao";
import { ClinicSwitcher } from "./clinic-switcher";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  if (!session.user.clinicaAtivaId) {
    redirect("/selecionar-clinica");
  }

  const clinicas = await listarClinicasDoUsuario(session.user.id);

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="flex items-center justify-end border-b border-sage-300 bg-white px-6 py-3">
        <ClinicSwitcher clinicas={clinicas} clinicaAtivaId={session.user.clinicaAtivaId} />
      </header>
      <div className="p-6">{children}</div>
    </div>
  );
}
