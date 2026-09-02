// Painel — ainda majoritariamente "a implementar" (resumo do dia, próximos
// atendimentos: depende de agendamento). O contador de comandas em aberto
// abaixo é o primeiro widget real (capability: atendimento-comanda,
// Requirement: Aviso de comandas em aberto no Painel) — só consome uma
// contagem que atendimento-comanda já expõe; o Painel não vira uma
// capability própria por causa disso (design.md, Decisão 9).

import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const clinicaId = await getClinicaAtual();
  const comandasAbertas = await prisma.comanda.count({ where: { clinicaId, status: "ABERTA" } });

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-pine-900">Painel</h1>

      {comandasAbertas > 0 && (
        // Scenario "Existem comandas abertas" — oculto quando a contagem é
        // zero (Scenario "Nenhuma comanda aberta"), mesma regra da seção
        // "Comandas em aberto" na tela de atendimento.
        <div className="flex items-center gap-2 rounded-md border border-gold-600 bg-gold-500/15 px-4 py-3 text-sm text-pine-900">
          <span>⚠️</span>
          <span>
            {comandasAbertas} {comandasAbertas === 1 ? "comanda em aberto" : "comandas em aberto"} — atendimentos
            iniciados que ainda não foram finalizados ou descartados.
          </span>
        </div>
      )}

      <p className="text-sm text-pine-700">
        Resto do painel — a implementar. Ver openspec/specs/agendamento/spec.md e openspec/specs/
        atendimento-comanda/spec.md.
      </p>
    </main>
  );
}
