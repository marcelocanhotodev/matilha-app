// Layout do painel: resolve sessão/clínica ativa e monta a casca da sidebar
// (capability: navegacao) em volta das telas de cada capability. Ver
// openspec/specs/navegacao/spec.md.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listarClinicasDoUsuario } from "@/lib/clinica-selecao";
import { Sidebar } from "./sidebar";

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
    <div className="flex min-h-screen flex-col bg-sand-50 lg:flex-row">
      <Sidebar clinicas={clinicas} clinicaAtivaId={session.user.clinicaAtivaId} />
      <main className="min-w-0 flex-1 p-6">{children}</main>
    </div>
  );
}
