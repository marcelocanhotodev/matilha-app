// Tela de atendimento / comanda (capability: atendimento-comanda). Server
// Component: busca a fila do dia (com a comanda já vinculada, se existir —
// evita um round-trip extra pra "retomar" no mesmo dia), o catálogo ativo
// (Requirement "ativo: true" — alerta deixado em implementar-catalogo-
// produtos-servicos/design.md) e as comandas abertas que não pertencem à
// fila de hoje (Requirement: Comandas em aberto). Todo estado interativo
// (carrinho, autosave, fila, descarte) fica isolado em
// <AtendimentoWorkspace>.
//
// Ver openspec/specs/atendimento-comanda/spec.md, openspec/specs/
// agendamento/spec.md (Requirement: Ciclo de status do agendamento) e
// openspec/changes/archive/2026-.../implementar-atendimento-comanda/ (uma
// vez arquivado) para as decisões por trás do shape abaixo.

import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { AtendimentoWorkspace } from "./atendimento-workspace";

function limitesDeHoje(): { inicio: Date; fim: Date } {
  const agora = new Date();
  const inicio = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 0, 0, 0, 0);
  const fim = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 59, 59, 999);
  return { inicio, fim };
}

export default async function AtendimentoPage() {
  const clinicaId = await getClinicaAtual();
  const { inicio, fim } = limitesDeHoje();

  const [agendamentosHoje, catalogoAtivo, comandasAbertas] = await Promise.all([
    prisma.agendamento.findMany({
      where: { clinicaId, dataHoraInicio: { gte: inicio, lte: fim } },
      include: {
        paciente: { select: { nome: true, cliente: { select: { nome: true } } } },
        itemCatalogo: true,
        comanda: { include: { itens: true } },
      },
      orderBy: { dataHoraInicio: "asc" },
    }),
    prisma.itemCatalogo.findMany({
      where: { clinicaId, ativo: true },
      orderBy: { nome: "asc" },
    }),
    prisma.comanda.findMany({
      where: { clinicaId, status: "ABERTA" },
      include: {
        itens: true,
        agendamento: { select: { id: true, paciente: { select: { nome: true } } } },
      },
      orderBy: { criadoEm: "asc" },
    }),
  ]);

  // Requirement "Comandas em aberto": só as que não pertencem à fila de hoje
  // (agendamento de outro dia, ou avulsa) — as de hoje já vêm embutidas em
  // `agendamentosHoje[].comanda`.
  const idsAgendamentosHoje = new Set(agendamentosHoje.map((a) => a.id));
  const comandasForaDaFila = comandasAbertas.filter(
    (c) => !c.agendamentoId || !idsAgendamentosHoje.has(c.agendamentoId),
  );

  return (
    <main className="flex flex-col gap-5">
      <h1 className="font-display text-2xl text-pine-900">Atendimento</h1>
      <AtendimentoWorkspace
        agendamentosHoje={agendamentosHoje}
        catalogo={catalogoAtivo}
        comandasForaDaFila={comandasForaDaFila}
      />
    </main>
  );
}
