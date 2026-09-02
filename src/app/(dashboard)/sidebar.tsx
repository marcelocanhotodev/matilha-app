// Sidebar do painel (capability: navegacao). Server Component: recebe as
// clínicas do usuário já buscadas pelo layout e monta a casca visual — marca
// "Matilha", <SidebarNav> (estado de rota ativa, client) e o
// <ClinicSwitcher variant="sidebar"> no rodapé. Reproduz `.sidebar` do
// protótipo (openspec/reference/prototipo.html) com Tailwind; comportamento
// responsivo (coluna fixa ≥1024px / barra horizontal abaixo disso) segue
// openspec/specs/navegacao/spec.md — Requirement: Navegação adaptada a telas
// estreitas (ver design.md, Decisão de breakpoint, para o porquê de 1024px
// em vez dos 980px do protótipo).

import { ClinicSwitcher } from "./clinic-switcher";
import { SidebarNav } from "./sidebar-nav";
import type { ClinicaDoUsuario } from "@/lib/clinica-selecao";

export function Sidebar({
  clinicas,
  clinicaAtivaId,
}: {
  clinicas: ClinicaDoUsuario[];
  clinicaAtivaId: string;
}) {
  return (
    <aside
      className="flex items-center gap-3 overflow-x-auto bg-gradient-to-b from-pine-800 to-pine-900 px-4 py-3 text-sand-100
                 lg:sticky lg:top-0 lg:h-screen lg:w-[248px] lg:flex-shrink-0 lg:flex-col lg:items-stretch
                 lg:gap-0 lg:overflow-visible lg:px-[18px] lg:py-[26px]"
    >
      <div className="flex flex-shrink-0 items-center gap-2.5 pr-3 lg:pb-6 lg:pr-0">
        <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] bg-gold-500 text-[17px]">
          🐾
        </div>
        <div>
          <div className="font-display text-xl font-semibold leading-tight">Matilha</div>
          <div className="-mt-0.5 whitespace-nowrap text-[10.5px] uppercase tracking-wider text-sage-300">
            Agenda veterinária
          </div>
        </div>
      </div>

      <SidebarNav />

      <div className="mt-auto hidden border-t border-white/10 pt-[18px] lg:block">
        <ClinicSwitcher clinicas={clinicas} clinicaAtivaId={clinicaAtivaId} variant="sidebar" />
      </div>
    </aside>
  );
}
