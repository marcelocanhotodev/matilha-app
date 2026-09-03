"use server";

// Server Actions de Paciente (capability: pacientes). Todas resolvem a
// `clinicaId` ativa via `getClinicaAtual()` — nunca aceitam `clinicaId` como
// parâmetro vindo do client, e toda leitura/escrita é filtrada por ela (ver
// openspec/project.md, "Padrão de multi-tenancy").
//
// Exclusão é sempre lógica (toggle de `ativo`) — não existe exclusão física
// de Paciente no produto (ver openspec/changes/implementar-pacientes/
// design.md, Decisão 1). Inativar/reativar nunca checa vínculo com
// Agendamento/Comanda: nada é apagado ou desvinculado, então não há nada a
// bloquear.
//
// Sem `revalidatePath` aqui de propósito, mesmo padrão de
// src/lib/actions/cliente.ts: o client chama `router.refresh()` após a
// action resolver.

import { prisma } from "@/lib/prisma";
import { getClinicaAtual } from "@/lib/tenant";
import { pacienteInputSchema, type PacienteInput } from "@/lib/validators/paciente";

export interface SalvarPacienteResultado {
  ok: boolean;
  erro?: string;
  pacienteId?: number;
}

export interface ToggleAtivoResultado {
  ok: boolean;
  erro?: string;
}

/** Normaliza o `PacienteInput` (já validado) para o shape completo do
 * Prisma. Sempre grava um objeto completo (nunca `undefined` em campo
 * opcional) para que editar um paciente sempre sobrescreva o valor anterior
 * — inclusive limpando um campo que o usuário apagou — em vez de deixá-lo
 * intocado (mesmo padrão de `paraDadosPrisma` em src/lib/actions/cliente.ts). */
function paraDadosPrisma(dados: PacienteInput) {
  return {
    clienteId: dados.clienteId,
    nome: dados.nome,
    especie: dados.especie,
    raca: dados.raca,
    sexo: dados.sexo,
    nascimento: dados.nascimento ?? null,
    peso: dados.peso ?? null,
    cor: dados.cor ?? null,
    porte: dados.porte ?? null,
    castrado: dados.castrado,
    microchip: dados.microchip ?? null,
    observacoes: dados.observacoes ?? null,
  };
}

/** Todo paciente SHALL pertencer a exatamente um Cliente já cadastrado
 * (Requirement "Vínculo obrigatório com um cliente existente") — verifica
 * que o `clienteId` informado existe, está ativo e pertence à mesma
 * clínica, nunca confiando num ID vindo do client sem checagem. */
async function clienteValido(clinicaId: number, clienteId: number): Promise<boolean> {
  const cliente = await prisma.cliente.findFirst({
    where: { id: clienteId, clinicaId, ativo: true },
    select: { id: true },
  });
  return cliente !== null;
}

export async function criarPaciente(dadosBrutos: unknown): Promise<SalvarPacienteResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = pacienteInputSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  if (!(await clienteValido(clinicaId, dados.clienteId))) {
    return { ok: false, erro: "Tutor não encontrado. Cadastre o cliente antes de cadastrar o paciente." };
  }

  const paciente = await prisma.paciente.create({
    data: { clinicaId, ...paraDadosPrisma(dados) },
  });

  return { ok: true, pacienteId: paciente.id };
}

export async function editarPaciente(pacienteId: number, dadosBrutos: unknown): Promise<SalvarPacienteResultado> {
  const clinicaId = await getClinicaAtual();

  const existente = await prisma.paciente.findFirst({ where: { id: pacienteId, clinicaId } });
  if (!existente) {
    // Nunca diferenciar "não existe" de "existe em outra clínica" — mesmo
    // padrão de isolamento usado no resto do projeto (ver
    // src/lib/isolamento-clinica.test.ts).
    return { ok: false, erro: "Paciente não encontrado." };
  }

  const parse = pacienteInputSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  if (!(await clienteValido(clinicaId, dados.clienteId))) {
    return { ok: false, erro: "Tutor não encontrado. Cadastre o cliente antes de cadastrar o paciente." };
  }

  await prisma.paciente.update({
    where: { id: pacienteId },
    data: paraDadosPrisma(dados),
  });

  return { ok: true, pacienteId };
}

async function alterarAtivo(pacienteId: number, ativo: boolean): Promise<ToggleAtivoResultado> {
  const clinicaId = await getClinicaAtual();

  // `updateMany` com `clinicaId` no `where` (em vez de `update({ where: { id
  // } })`) garante isolamento: um ID de outra clínica simplesmente não
  // casa com nenhuma linha, `count` fica 0 — nunca um 403 revelando que o
  // recurso existe em outro tenant.
  const resultado = await prisma.paciente.updateMany({
    where: { id: pacienteId, clinicaId },
    data: { ativo },
  });

  if (resultado.count === 0) {
    return { ok: false, erro: "Paciente não encontrado." };
  }

  return { ok: true };
}

export async function inativarPaciente(pacienteId: number): Promise<ToggleAtivoResultado> {
  // Sem nenhuma checagem de vínculo com Agendamento/Comanda: inativar nunca
  // apaga nem desvincula dado nenhum, então não há nada a bloquear (ver
  // Requirement "Inativação lógica de paciente").
  return alterarAtivo(pacienteId, false);
}

export async function reativarPaciente(pacienteId: number): Promise<ToggleAtivoResultado> {
  return alterarAtivo(pacienteId, true);
}
