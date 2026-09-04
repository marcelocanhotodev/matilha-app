// Consultas de histórico financeiro (capability: historico-financeiro). Cada
// função recebe a `clinicaId` já resolvida pelo chamador (Server Component
// via `getClinicaAtual()`) — nunca resolve sessão sozinha, e nunca é "use
// server" (não é uma Server Action, é um módulo de consulta puro, mesmo
// espírito de src/lib/painel-analitico.ts).
//
// Todas as consultas consideram só Comanda com status "FINALIZADA" da
// clínica ativa — nunca comandas abertas ou canceladas (histórico só existe
// pra atendimentos já fechados).

import { prisma } from "@/lib/prisma";

export interface ComandaHistoricoResumo {
  id: number;
  criadoEm: Date;
  pacienteNome: string | null;
  clienteNome: string | null;
  formaPagamento: string | null;
  total: number;
}

export interface ListaHistorico {
  comandas: ComandaHistoricoResumo[];
  totalPaginas: number;
}

/** Intervalo de datas (ambas inclusive), já resolvido em `Date` pelo
 * caller — nunca strings cruas chegam até aqui (ver
 * openspec/changes/adicionar-filtro-periodo-historico/design.md,
 * Decisão do helper `paraDiaCalendarioDeChave`). Filtra pelo mesmo campo
 * que já ordena a listagem (Requirement: Listagem de comandas
 * finalizadas) — `Comanda` não tem um campo separado de "finalizado em". */
export interface PeriodoHistorico {
  inicio: Date;
  fim: Date;
}

/**
 * Requirement "Listagem de comandas finalizadas": página da listagem, mais
 * recentes primeiro. `totalPaginas` vem de um `count()` sobre o mesmo
 * `where` — página além do total simplesmente retorna `comandas: []` (skip
 * maior que o total de linhas não é erro pro Prisma). Com `periodo`,
 * Requirement "Filtro por período" — sem ele, comportamento idêntico ao
 * histórico inteiro.
 */
export async function listarHistorico(
  clinicaId: number,
  { page, porPagina, periodo }: { page: number; porPagina: number; periodo?: PeriodoHistorico }
): Promise<ListaHistorico> {
  const skip = (page - 1) * porPagina;
  const where = {
    clinicaId,
    status: "FINALIZADA" as const,
    ...(periodo ? { criadoEm: { gte: periodo.inicio, lte: periodo.fim } } : {}),
  };

  const [comandas, total] = await Promise.all([
    prisma.comanda.findMany({
      where,
      orderBy: { criadoEm: "desc" },
      skip,
      take: porPagina,
      include: {
        paciente: { select: { nome: true } },
        cliente: { select: { nome: true } },
      },
    }),
    prisma.comanda.count({ where }),
  ]);

  return {
    comandas: comandas.map((c) => ({
      id: c.id,
      criadoEm: c.criadoEm,
      pacienteNome: c.paciente?.nome ?? null,
      clienteNome: c.cliente?.nome ?? null,
      formaPagamento: c.formaPagamento,
      total: Number(c.total),
    })),
    // Math.max(1, ...) — "página 1 de 1" no estado vazio, nunca "de 0".
    totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
  };
}

export interface TotaisHistorico {
  arrecadado: number;
  quantidade: number;
  ticketMedio: number | null;
  formaMaisFrequente: string | null;
}

// Ordem fixa de desempate entre formas de pagamento com a mesma contagem —
// ver openspec/changes/implementar-historico/design.md, Decisão "Desempate
// de forma de pagamento mais frequente". Mesma ordem (e mesmo motivo:
// estabilidade) que forma-pagamento-chart.tsx (capability painel-analitico)
// já usa pra essa dimensão; coincide com a ordem de declaração do enum
// FormaPagamento no schema.prisma.
const ORDEM_FORMA_PAGAMENTO = ["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO"] as const;

/**
 * Requirement "Listagem de comandas finalizadas" (cards de totais): 4
 * estatísticas sobre TODAS as comandas finalizadas da clínica, nunca só a
 * página visível (ver design.md, Decisão "Totais agregados são uma query
 * separada") — senão ticket médio e forma mais usada mudariam a cada página.
 * Com `periodo`, os totais são só sobre o período (Requirement "Totais
 * agregados", cenário "Totais recalculados pelo período ativo"); sem
 * `periodo`, sobre o histórico inteiro.
 *
 * "Forma mais frequente" é contagem de comandas por forma de pagamento (a
 * mais usada), não soma de valor — diferente de
 * `faturamentoPorFormaPagamento` (painel-analitico.ts).
 */
export async function totaisHistorico(clinicaId: number, periodo?: PeriodoHistorico): Promise<TotaisHistorico> {
  const comandas = await prisma.comanda.findMany({
    where: {
      clinicaId,
      status: "FINALIZADA",
      ...(periodo ? { criadoEm: { gte: periodo.inicio, lte: periodo.fim } } : {}),
    },
    select: { total: true, formaPagamento: true },
  });

  const quantidade = comandas.length;
  const arrecadado = comandas.reduce((soma, c) => soma + Number(c.total), 0);
  const ticketMedio = quantidade > 0 ? arrecadado / quantidade : null;

  const contagemPorForma = new Map<string, number>();
  for (const c of comandas) {
    if (!c.formaPagamento) continue; // defensivo — finalizada sempre grava forma de pagamento
    contagemPorForma.set(c.formaPagamento, (contagemPorForma.get(c.formaPagamento) ?? 0) + 1);
  }

  // Maior contagem vence; `>` estrito (nunca `>=`) faz a primeira forma da
  // ordem fixa vencer em caso de empate, sem lógica de desempate separada.
  let formaMaisFrequente: string | null = null;
  let maiorContagem = 0;
  for (const forma of ORDEM_FORMA_PAGAMENTO) {
    const contagem = contagemPorForma.get(forma) ?? 0;
    if (contagem > maiorContagem) {
      maiorContagem = contagem;
      formaMaisFrequente = forma;
    }
  }

  return { arrecadado, quantidade, ticketMedio, formaMaisFrequente };
}

export interface ItemComandaHistorico {
  id: number;
  nomeSnapshot: string;
  precoSnapshot: number;
  quantidade: number;
  subtotal: number;
}

export interface ComandaFinalizadaDetalhe {
  id: number;
  criadoEm: Date;
  subtotal: number;
  desconto: number;
  total: number;
  formaPagamento: string | null;
  paciente: { nome: string } | null;
  cliente: { nome: string } | null;
  veterinario: { nome: string } | null;
  agendamento: { dataHoraInicio: Date } | null;
  itens: ItemComandaHistorico[];
}

/**
 * Requirement "Tela de detalhes do atendimento". `id`/`clinicaId`/`status`
 * no mesmo `where` (nunca checados em branches separados) cobre em uma
 * única condição os três casos que precisam dar 404: id inexistente, id de
 * outra clínica, e comanda que existe mas não está FINALIZADA — ver
 * design.md, Decisão "Rota /historico/[id]...".
 */
export async function buscarComandaFinalizada(
  id: number,
  clinicaId: number
): Promise<ComandaFinalizadaDetalhe | null> {
  const comanda = await prisma.comanda.findFirst({
    where: { id, clinicaId, status: "FINALIZADA" },
    include: {
      paciente: { select: { nome: true } },
      cliente: { select: { nome: true } },
      veterinario: { select: { nome: true } },
      agendamento: { select: { dataHoraInicio: true } },
      itens: true,
    },
  });

  if (!comanda) return null;

  return {
    id: comanda.id,
    criadoEm: comanda.criadoEm,
    subtotal: Number(comanda.subtotal),
    desconto: Number(comanda.desconto),
    total: Number(comanda.total),
    formaPagamento: comanda.formaPagamento,
    paciente: comanda.paciente,
    cliente: comanda.cliente,
    veterinario: comanda.veterinario,
    agendamento: comanda.agendamento,
    itens: comanda.itens.map((item) => ({
      id: item.id,
      nomeSnapshot: item.nomeSnapshot,
      precoSnapshot: Number(item.precoSnapshot),
      quantidade: item.quantidade,
      subtotal: Number(item.subtotal),
    })),
  };
}
