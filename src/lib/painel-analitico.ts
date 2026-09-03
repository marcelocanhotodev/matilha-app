// Agregações para os gráficos do Painel (capability: painel-analitico).
// Cada função recebe a `clinicaId` já resolvida pelo chamador (Server
// Component `dashboard/page.tsx` via `getClinicaAtual()`) — nunca resolve
// sessão sozinha, e nunca é "use server" (não é uma Server Action, é um
// módulo de consulta puro, testável direto como src/lib/clinica-selecao.ts).
//
// Todas as 4 agregações consideram só Comanda com status "FINALIZADA" da
// clínica ativa (Requirements da spec desta capability) — nunca comandas
// abertas ou canceladas.

import { prisma } from "@/lib/prisma";
import { adicionarDias, fimDoDiaClinica, inicioDoDiaClinica, paraChaveDeData, paraDiaCalendario } from "@/lib/timezone";

export interface ItemRanking {
  itemCatalogoId: number;
  nome: string;
  quantidade: number;
}

/**
 * Requirement "Gráfico de itens mais vendidos": top 5 itens de catálogo
 * (serviço ou produto) por quantidade total vendida em comandas
 * finalizadas, empate em ordem alfabética pelo nome.
 */
export async function itensMaisVendidos(clinicaId: number): Promise<ItemRanking[]> {
  const comandaItens = await prisma.comandaItem.findMany({
    where: { itemCatalogoId: { not: null }, comanda: { clinicaId, status: "FINALIZADA" } },
    select: { itemCatalogoId: true, quantidade: true },
  });

  const quantidadePorItem = new Map<number, number>();
  for (const item of comandaItens) {
    const id = item.itemCatalogoId!;
    quantidadePorItem.set(id, (quantidadePorItem.get(id) ?? 0) + item.quantidade);
  }

  if (quantidadePorItem.size === 0) return [];

  const catalogo = await prisma.itemCatalogo.findMany({
    where: { id: { in: Array.from(quantidadePorItem.keys()) } },
    select: { id: true, nome: true },
  });
  const nomePorId = new Map(catalogo.map((i) => [i.id, i.nome]));

  return Array.from(quantidadePorItem.entries())
    .map(([itemCatalogoId, quantidade]) => ({
      itemCatalogoId,
      nome: nomePorId.get(itemCatalogoId) ?? "Item removido",
      quantidade,
    }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 5);
}

export interface ClienteRanking {
  clienteId: number;
  nome: string;
  total: number;
}

/**
 * Requirement "Gráfico de clientes com mais consumo": top 5 clientes por
 * soma do valor total em comandas finalizadas vinculadas a esse cliente —
 * inclui clientes inativos (reflete histórico, não cadastro atual);
 * comandas avulsas sem `clienteId` não entram no ranking; empate em ordem
 * alfabética pelo nome.
 */
export async function clientesComMaisConsumo(clinicaId: number): Promise<ClienteRanking[]> {
  const comandas = await prisma.comanda.findMany({
    where: { clinicaId, status: "FINALIZADA", clienteId: { not: null } },
    select: { clienteId: true, total: true },
  });

  const totalPorCliente = new Map<number, number>();
  for (const c of comandas) {
    const id = c.clienteId!;
    totalPorCliente.set(id, (totalPorCliente.get(id) ?? 0) + Number(c.total));
  }

  if (totalPorCliente.size === 0) return [];

  const clientes = await prisma.cliente.findMany({
    where: { id: { in: Array.from(totalPorCliente.keys()) } },
    select: { id: true, nome: true },
  });
  const nomePorId = new Map(clientes.map((c) => [c.id, c.nome]));

  return Array.from(totalPorCliente.entries())
    .map(([clienteId, total]) => ({
      clienteId,
      nome: nomePorId.get(clienteId) ?? "Cliente removido",
      total,
    }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, "pt-BR"))
    .slice(0, 5);
}

export interface FaturamentoPorFormaPagamento {
  formaPagamento: string;
  total: number;
}

/**
 * Requirement "Gráfico de faturamento por forma de pagamento": soma do
 * valor total faturado, agrupada por forma de pagamento, só comandas
 * finalizadas. Formas sem nenhuma venda simplesmente não aparecem no
 * array — a atribuição de cor/rótulo por forma de pagamento (ordem fixa,
 * nunca ciclada) é responsabilidade do componente, não desta agregação.
 */
export async function faturamentoPorFormaPagamento(clinicaId: number): Promise<FaturamentoPorFormaPagamento[]> {
  const comandas = await prisma.comanda.findMany({
    where: { clinicaId, status: "FINALIZADA" },
    select: { formaPagamento: true, total: true },
  });

  const totalPorForma = new Map<string, number>();
  for (const c of comandas) {
    if (!c.formaPagamento) continue; // defensivo — finalizada sempre grava forma de pagamento
    totalPorForma.set(c.formaPagamento, (totalPorForma.get(c.formaPagamento) ?? 0) + Number(c.total));
  }

  return Array.from(totalPorForma.entries()).map(([formaPagamento, total]) => ({ formaPagamento, total }));
}

export interface FaturamentoDoDia {
  data: string; // yyyy-mm-dd, no fuso da clínica (src/lib/timezone.ts)
  total: number;
}

/**
 * Requirement "Gráfico de faturamento por dia": soma do valor total
 * faturado por dia, últimos 14 dias corridos (incluindo hoje) no fuso da
 * clínica, só comandas finalizadas. Sempre retorna os 14 dias — um dia
 * sem venda entra com `total: 0`, nunca é omitido (ver
 * openspec/changes/corrigir-fuso-horario-agenda/ — nunca bucketizar por
 * dia usando o fuso do processo/navegador diretamente).
 */
export async function faturamentoPorDia(clinicaId: number): Promise<FaturamentoDoDia[]> {
  const hoje = paraDiaCalendario(new Date());
  const primeiroDia = adicionarDias(hoje, -13);
  const inicio = inicioDoDiaClinica(primeiroDia);
  const fim = fimDoDiaClinica(hoje);

  const comandas = await prisma.comanda.findMany({
    where: { clinicaId, status: "FINALIZADA", criadoEm: { gte: inicio, lte: fim } },
    select: { criadoEm: true, total: true },
  });

  const totalPorDia = new Map<string, number>();
  for (const c of comandas) {
    const chave = paraChaveDeData(paraDiaCalendario(c.criadoEm));
    totalPorDia.set(chave, (totalPorDia.get(chave) ?? 0) + Number(c.total));
  }

  return Array.from({ length: 14 }, (_, i) => {
    const chave = paraChaveDeData(adicionarDias(primeiroDia, i));
    return { data: chave, total: totalPorDia.get(chave) ?? 0 };
  });
}
