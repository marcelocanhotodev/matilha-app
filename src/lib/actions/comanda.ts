"use server";

// Server Actions do ciclo de vida da Comanda (capability: atendimento-comanda).
// Todas resolvem a `clinicaId` ativa via `getClinicaAtual()` — nunca aceitam
// `clinicaId` vindo do client. Ver openspec/changes/implementar-atendimento-
// comanda/design.md para as decisões por trás do shape abaixo (a comanda
// nasce ABERTA no primeiro item — Decisão 2 —, "retomar" reaproveita a
// mesma linha via Comanda.agendamentoId @unique — Decisão 4).
//
// Sem `revalidatePath` aqui de propósito, mesmo padrão do resto do projeto:
// o client chama `router.refresh()` após a action resolver.

import { prisma } from "@/lib/prisma";
import { getClinicaAtual } from "@/lib/tenant";
import {
  itemCarrinhoInputSchema,
  descontoInputSchema,
  motivoDescarteSchema,
  formasPagamento,
  calcularDescontoETotal,
} from "@/lib/validators/comanda";
import { z } from "zod";
import type { Comanda } from "@prisma/client";

export interface ComandaActionResultado {
  ok: boolean;
  erro?: string;
  comandaId?: number;
}

/**
 * Encontra ou cria a comanda "aberta" que uma ação de carrinho deve afetar
 * (Requirement: Persistência da comanda em progresso / Retomar comanda
 * aberta). Todo caminho de escrita deste arquivo passa por aqui — é o único
 * lugar que decide "que comanda estou editando", o que também centraliza a
 * checagem de imutabilidade (Requirement: Imutabilidade de comanda
 * finalizada ou cancelada): nenhuma action separada pode esquecer essa
 * checagem porque nenhuma delas resolve a comanda de outro jeito.
 *
 * - `comandaId` presente: a comanda já foi criada nesta sessão de carrinho
 *   (o client guarda o id devolvido pela primeira chamada) — só valida que
 *   pertence à clínica ativa e está ABERTA.
 * - `agendamentoId` presente, sem `comandaId`: reaproveita a comanda já
 *   vinculada a esse agendamento, ou cria uma nova (Comanda.agendamentoId é
 *   `@unique` no schema — nunca duas comandas para o mesmo agendamento).
 * - Nenhum dos dois: comanda avulsa nova — sem chave natural para retomar
 *   (design.md, Non-Goal "Deduplicar/agrupar comandas avulsas abandonadas").
 *
 * Lança (nunca retorna null) quando o alvo não existe na clínica ativa ou já
 * não está ABERTA — as actions públicas capturam e traduzem para
 * `{ ok: false, erro }`. Mensagens nunca distinguem "não existe" de
 * "é de outra clínica" (mesmo padrão de isolamento do resto do projeto).
 */
async function obterOuCriarComandaAberta(
  clinicaId: number,
  args: { comandaId?: number; agendamentoId?: number },
): Promise<Comanda> {
  if (args.comandaId) {
    const comanda = await prisma.comanda.findFirst({ where: { id: args.comandaId, clinicaId } });
    if (!comanda) throw new Error("Comanda não encontrada.");
    if (comanda.status !== "ABERTA") throw new Error("Esta comanda já foi finalizada ou cancelada.");
    return comanda;
  }

  if (args.agendamentoId) {
    const existente = await prisma.comanda.findUnique({ where: { agendamentoId: args.agendamentoId } });
    if (existente) {
      if (existente.clinicaId !== clinicaId) throw new Error("Agendamento não encontrado.");
      if (existente.status !== "ABERTA") throw new Error("Esta comanda já foi finalizada ou cancelada.");
      return existente;
    }

    const agendamento = await prisma.agendamento.findFirst({
      where: { id: args.agendamentoId, clinicaId },
      include: { paciente: true },
    });
    if (!agendamento) throw new Error("Agendamento não encontrado.");

    return prisma.comanda.create({
      data: {
        clinicaId,
        agendamentoId: agendamento.id,
        pacienteId: agendamento.pacienteId,
        clienteId: agendamento.paciente.clienteId,
        veterinarioId: agendamento.veterinarioId,
      },
    });
  }

  // Avulso: sempre uma comanda nova.
  return prisma.comanda.create({ data: { clinicaId } });
}

/** Soma os itens e recalcula `subtotal`/`total` de uma comanda. O `desconto`
 * já aplicado (Requirement: Desconto configurável) é mantido como o valor
 * efetivo em reais configurado por último — não é recalculado a partir de um
 * percentual "vivo" só porque o subtotal mudou; `aplicarDesconto` é o único
 * jeito de mudar esse valor. */
async function recalcularTotais(comandaId: number): Promise<void> {
  const itens = await prisma.comandaItem.findMany({ where: { comandaId } });
  const subtotal = itens.reduce((soma, item) => soma + Number(item.subtotal), 0);

  const comanda = await prisma.comanda.findUniqueOrThrow({ where: { id: comandaId } });
  const total = Math.max(0, subtotal - Number(comanda.desconto));

  await prisma.comanda.update({ where: { id: comandaId }, data: { subtotal, total } });
}

function erroPara(erro: unknown, mensagemPadrao: string): string {
  return erro instanceof Error ? erro.message : mensagemPadrao;
}

const adicionarItemSchema = z.object({
  comandaId: z.coerce.number().int().positive().optional(),
  agendamentoId: z.coerce.number().int().positive().optional(),
  item: itemCarrinhoInputSchema,
});

export async function adicionarItem(dadosBrutos: unknown): Promise<ComandaActionResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = adicionarItemSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { comandaId, agendamentoId, item } = parse.data;

  try {
    const comanda = await obterOuCriarComandaAberta(clinicaId, { comandaId, agendamentoId });

    const itemCatalogo = await prisma.itemCatalogo.findFirst({
      where: { id: item.itemCatalogoId, clinicaId },
    });
    if (!itemCatalogo) throw new Error("Item de catálogo não encontrado.");

    const existente = await prisma.comandaItem.findFirst({
      where: { comandaId: comanda.id, itemCatalogoId: item.itemCatalogoId },
    });

    if (existente) {
      // Scenario "Adicionar item já presente na comanda": incrementa a
      // quantidade existente, nunca cria uma linha duplicada. Não
      // re-snapshota — o preço usado é o de quando o item entrou na comanda
      // pela primeira vez, mesmo que o catálogo tenha mudado desde então.
      const novaQuantidade = existente.quantidade + item.quantidade;
      await prisma.comandaItem.update({
        where: { id: existente.id },
        data: { quantidade: novaQuantidade, subtotal: Number(existente.precoSnapshot) * novaQuantidade },
      });
    } else {
      // Scenario "Preço do item é copiado no momento da adição": snapshot
      // tirado agora, nunca referência viva ao preço atual do catálogo.
      await prisma.comandaItem.create({
        data: {
          comandaId: comanda.id,
          itemCatalogoId: itemCatalogo.id,
          nomeSnapshot: itemCatalogo.nome,
          precoSnapshot: itemCatalogo.preco,
          quantidade: item.quantidade,
          subtotal: Number(itemCatalogo.preco) * item.quantidade,
        },
      });
    }

    await recalcularTotais(comanda.id);

    return { ok: true, comandaId: comanda.id };
  } catch (erro) {
    return { ok: false, erro: erroPara(erro, "Não foi possível adicionar o item.") };
  }
}

const removerItemSchema = z.object({
  comandaId: z.coerce.number().int().positive(),
  comandaItemId: z.coerce.number().int().positive(),
});

export async function removerItem(dadosBrutos: unknown): Promise<ComandaActionResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = removerItemSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { comandaId, comandaItemId } = parse.data;

  try {
    const comanda = await obterOuCriarComandaAberta(clinicaId, { comandaId });

    const resultado = await prisma.comandaItem.deleteMany({
      where: { id: comandaItemId, comandaId: comanda.id },
    });
    if (resultado.count === 0) throw new Error("Item não encontrado nesta comanda.");

    await recalcularTotais(comanda.id);

    return { ok: true, comandaId: comanda.id };
  } catch (erro) {
    return { ok: false, erro: erroPara(erro, "Não foi possível remover o item.") };
  }
}

const alterarQuantidadeSchema = z.object({
  comandaId: z.coerce.number().int().positive(),
  comandaItemId: z.coerce.number().int().positive(),
  quantidade: itemCarrinhoInputSchema.shape.quantidade,
});

export async function alterarQuantidade(dadosBrutos: unknown): Promise<ComandaActionResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = alterarQuantidadeSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { comandaId, comandaItemId, quantidade } = parse.data;

  try {
    const comanda = await obterOuCriarComandaAberta(clinicaId, { comandaId });

    const item = await prisma.comandaItem.findFirst({ where: { id: comandaItemId, comandaId: comanda.id } });
    if (!item) throw new Error("Item não encontrado nesta comanda.");

    await prisma.comandaItem.update({
      where: { id: item.id },
      data: { quantidade, subtotal: Number(item.precoSnapshot) * quantidade },
    });
    await recalcularTotais(comanda.id);

    return { ok: true, comandaId: comanda.id };
  } catch (erro) {
    return { ok: false, erro: erroPara(erro, "Não foi possível alterar a quantidade.") };
  }
}

const aplicarDescontoSchema = z.object({
  comandaId: z.coerce.number().int().positive(),
  desconto: descontoInputSchema,
});

export async function aplicarDesconto(dadosBrutos: unknown): Promise<ComandaActionResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = aplicarDescontoSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { comandaId, desconto } = parse.data;

  try {
    const comanda = await obterOuCriarComandaAberta(clinicaId, { comandaId });
    const { descontoEmReais, total } = calcularDescontoETotal(Number(comanda.subtotal), desconto);

    await prisma.comanda.update({
      where: { id: comanda.id },
      data: { desconto: descontoEmReais, total },
    });

    return { ok: true, comandaId: comanda.id };
  } catch (erro) {
    return { ok: false, erro: erroPara(erro, "Não foi possível aplicar o desconto.") };
  }
}

const finalizarComandaSchema = z.object({
  comandaId: z.coerce.number().int().positive(),
  formaPagamento: z.enum(formasPagamento, { required_error: "Forma de pagamento é obrigatória." }),
});

export async function finalizarComanda(dadosBrutos: unknown): Promise<ComandaActionResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = finalizarComandaSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { comandaId, formaPagamento } = parse.data;

  try {
    const comanda = await obterOuCriarComandaAberta(clinicaId, { comandaId });

    // Scenario "Finalizar sem itens".
    const quantidadeItens = await prisma.comandaItem.count({ where: { comandaId: comanda.id } });
    if (quantidadeItens === 0) {
      return { ok: false, erro: "Adicione ao menos um item antes de finalizar." };
    }

    await prisma.$transaction(async (tx) => {
      // (1) os snapshots já foram capturados em adicionarItem — nada a
      // copiar aqui. (2)-(5): ver Requirement: Finalização da comanda.
      await tx.comanda.update({
        where: { id: comanda.id },
        data: { status: "FINALIZADA", formaPagamento },
      });

      if (comanda.agendamentoId) {
        await tx.agendamento.update({
          where: { id: comanda.agendamentoId },
          data: { status: "CONCLUIDO" },
        });
      }
    });

    return { ok: true, comandaId: comanda.id };
  } catch (erro) {
    return { ok: false, erro: erroPara(erro, "Não foi possível finalizar a comanda.") };
  }
}

const descartarComandaSchema = motivoDescarteSchema.extend({
  comandaId: z.coerce.number().int().positive(),
});

export async function descartarComanda(dadosBrutos: unknown): Promise<ComandaActionResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = descartarComandaSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    // Cobre também o Scenario "Descartar sem motivo".
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { comandaId, motivo } = parse.data;

  try {
    const comanda = await obterOuCriarComandaAberta(clinicaId, { comandaId });

    await prisma.$transaction(async (tx) => {
      await tx.comanda.update({
        where: { id: comanda.id },
        data: { status: "CANCELADA", motivoCancelamento: motivo },
      });

      if (comanda.agendamentoId) {
        await tx.agendamento.update({
          where: { id: comanda.agendamentoId },
          data: { status: "CANCELADO" },
        });
      }
    });

    return { ok: true, comandaId: comanda.id };
  } catch (erro) {
    return { ok: false, erro: erroPara(erro, "Não foi possível descartar a comanda.") };
  }
}
