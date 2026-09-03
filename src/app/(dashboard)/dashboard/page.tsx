// Painel — ainda majoritariamente "a implementar" (resumo do dia, próximos
// atendimentos: depende de agendamento). O contador de comandas em aberto
// abaixo é o primeiro widget real (capability: atendimento-comanda,
// Requirement: Aviso de comandas em aberto no Painel) — só consome uma
// contagem que atendimento-comanda já expõe; o Painel não vira uma
// capability própria por causa disso (design.md, Decisão 9, de
// implementar-atendimento-comanda).
//
// Os 4 gráficos abaixo SÃO uma capability própria (painel-analitico) —
// diferente do resto do Painel, eles têm requirements e agregações
// próprias, não só consomem contagem de outra capability (ver
// openspec/changes/painel-analitico/design.md).

import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  clientesComMaisConsumo,
  faturamentoPorDia,
  faturamentoPorFormaPagamento,
  itensMaisVendidos,
} from "@/lib/painel-analitico";
import { RankingBarChart } from "./ranking-bar-chart";
import { FormaPagamentoChart } from "./forma-pagamento-chart";
import { FaturamentoPorDiaChart } from "./faturamento-por-dia-chart";

export default async function DashboardPage() {
  const clinicaId = await getClinicaAtual();

  const [comandasAbertas, itensRanking, clientesRanking, faturamentoForma, faturamentoDia] = await Promise.all([
    prisma.comanda.count({ where: { clinicaId, status: "ABERTA" } }),
    itensMaisVendidos(clinicaId),
    clientesComMaisConsumo(clinicaId),
    faturamentoPorFormaPagamento(clinicaId),
    faturamentoPorDia(clinicaId),
  ]);

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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="flex flex-col gap-3 rounded-md border border-sage-300 bg-white p-4">
          <h2 className="font-display text-lg text-pine-900">Itens mais vendidos</h2>
          <RankingBarChart
            dados={itensRanking.map((r) => ({ label: r.nome, valor: r.quantidade }))}
            unidade="quantidade"
            vazioLabel="Nenhuma venda registrada ainda."
          />
        </section>

        <section className="flex flex-col gap-3 rounded-md border border-sage-300 bg-white p-4">
          <h2 className="font-display text-lg text-pine-900">Clientes com mais consumo</h2>
          <RankingBarChart
            dados={clientesRanking.map((r) => ({ label: r.nome, valor: r.total }))}
            unidade="moeda"
            vazioLabel="Nenhum consumo registrado ainda."
          />
        </section>

        <section className="flex flex-col gap-3 rounded-md border border-sage-300 bg-white p-4">
          <h2 className="font-display text-lg text-pine-900">Faturamento por forma de pagamento</h2>
          <FormaPagamentoChart dados={faturamentoForma} vazioLabel="Nenhum faturamento registrado ainda." />
        </section>

        <section className="flex flex-col gap-3 rounded-md border border-sage-300 bg-white p-4">
          <h2 className="font-display text-lg text-pine-900">Faturamento por dia (últimos 14 dias)</h2>
          <FaturamentoPorDiaChart dados={faturamentoDia} />
        </section>
      </div>

      <p className="text-sm text-pine-700">
        Resto do painel — a implementar. Ver openspec/specs/agendamento/spec.md e openspec/specs/
        atendimento-comanda/spec.md.
      </p>
    </main>
  );
}
