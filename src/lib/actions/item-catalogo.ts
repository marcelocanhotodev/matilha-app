"use server";

// Server Actions de ItemCatalogo (capability: catalogo-produtos-servicos).
// Todas resolvem a `clinicaId` ativa via `getClinicaAtual()` — nunca aceitam
// `clinicaId` como parâmetro vindo do client, e toda leitura/escrita é
// filtrada por ela (ver openspec/project.md, "Padrão de multi-tenancy").
//
// Exclusão é sempre lógica (toggle de `ativo`) — não existe exclusão física
// de item de catálogo no produto (ver openspec/changes/
// implementar-catalogo-produtos-servicos/design.md, Decisão 1). Inativar/
// reativar nunca checa vínculo com Agendamento/ComandaItem: nada é apagado
// ou desvinculado, então não há nada a bloquear.
//
// Sem `revalidatePath` aqui de propósito, mesmo padrão de
// src/lib/actions/paciente.ts: o client chama `router.refresh()` após a
// action resolver.

import { prisma } from "@/lib/prisma";
import { getClinicaAtual } from "@/lib/tenant";
import { itemCatalogoInputSchema, type ItemCatalogoInput } from "@/lib/validators/item-catalogo";

export interface SalvarItemCatalogoResultado {
  ok: boolean;
  erro?: string;
  itemCatalogoId?: number;
}

export interface ToggleAtivoResultado {
  ok: boolean;
  erro?: string;
}

/** Normaliza o `ItemCatalogoInput` (já validado) para o shape completo do
 * Prisma. Sempre grava um objeto completo (nunca `undefined` em campo
 * opcional) para que editar um item sempre sobrescreva o valor anterior —
 * inclusive limpando um ícone que o usuário apagou — em vez de deixá-lo
 * intocado (mesmo padrão de `paraDadosPrisma` em src/lib/actions/paciente.ts). */
function paraDadosPrisma(dados: ItemCatalogoInput) {
  return {
    nome: dados.nome,
    categoria: dados.categoria,
    preco: dados.preco,
    icone: dados.icone ?? null,
    // Já normalizado pelo schema (itemCatalogoInputSchema): nunca definido
    // fora de categoria SERVICO, mesmo que o client tenha enviado algo.
    duracaoPadraoMinutos: dados.duracaoPadraoMinutos ?? null,
  };
}

export async function criarItemCatalogo(dadosBrutos: unknown): Promise<SalvarItemCatalogoResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = itemCatalogoInputSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  const item = await prisma.itemCatalogo.create({
    data: { clinicaId, ...paraDadosPrisma(dados) },
  });

  return { ok: true, itemCatalogoId: item.id };
}

export async function editarItemCatalogo(
  itemCatalogoId: number,
  dadosBrutos: unknown,
): Promise<SalvarItemCatalogoResultado> {
  const clinicaId = await getClinicaAtual();

  const existente = await prisma.itemCatalogo.findFirst({ where: { id: itemCatalogoId, clinicaId } });
  if (!existente) {
    // Nunca diferenciar "não existe" de "existe em outra clínica" — mesmo
    // padrão de isolamento usado no resto do projeto (ver
    // src/lib/isolamento-clinica.test.ts).
    return { ok: false, erro: "Item de catálogo não encontrado." };
  }

  const parse = itemCatalogoInputSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  await prisma.itemCatalogo.update({
    where: { id: itemCatalogoId },
    data: paraDadosPrisma(dados),
  });

  return { ok: true, itemCatalogoId };
}

async function alterarAtivo(itemCatalogoId: number, ativo: boolean): Promise<ToggleAtivoResultado> {
  const clinicaId = await getClinicaAtual();

  // `updateMany` com `clinicaId` no `where` (em vez de `update({ where: { id
  // } })`) garante isolamento: um ID de outra clínica simplesmente não casa
  // com nenhuma linha, `count` fica 0 — nunca um 403 revelando que o recurso
  // existe em outro tenant.
  const resultado = await prisma.itemCatalogo.updateMany({
    where: { id: itemCatalogoId, clinicaId },
    data: { ativo },
  });

  if (resultado.count === 0) {
    return { ok: false, erro: "Item de catálogo não encontrado." };
  }

  return { ok: true };
}

export async function inativarItemCatalogo(itemCatalogoId: number): Promise<ToggleAtivoResultado> {
  // Sem nenhuma checagem de vínculo com Agendamento/ComandaItem: inativar
  // nunca apaga nem desvincula dado nenhum, então não há nada a bloquear
  // (ver Requirement "Inativação lógica de item de catálogo").
  return alterarAtivo(itemCatalogoId, false);
}

export async function reativarItemCatalogo(itemCatalogoId: number): Promise<ToggleAtivoResultado> {
  return alterarAtivo(itemCatalogoId, true);
}
