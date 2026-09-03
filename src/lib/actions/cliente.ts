"use server";

// Server Actions de Cliente (capability: clientes). Todas resolvem a
// `clinicaId` ativa via `getClinicaAtual()` — nunca aceitam `clinicaId` como
// parâmetro vindo do client, e toda leitura/escrita é filtrada por ela (ver
// openspec/project.md, "Padrão de multi-tenancy").
//
// Exclusão é sempre lógica (toggle de `ativo`) — não existe exclusão física
// de Cliente no produto (ver design.md, Decisão 1). Inativar/reativar nunca
// checa vínculo com Paciente/Comanda: nada é apagado ou desvinculado, então
// não há nada a bloquear.
//
// Sem `revalidatePath` aqui de propósito: o mesmo padrão de
// src/lib/hooks/use-trocar-clinica.ts é seguido — o client chama
// `router.refresh()` após a action resolver, em vez da action tentar
// revalidar sozinha (o que também quebraria chamando a action fora de um
// request Next.js real, como nos testes abaixo).

import { prisma } from "@/lib/prisma";
import { getClinicaAtual } from "@/lib/tenant";
import { clienteInputSchema, type ClienteInput } from "@/lib/validators/cliente";

export interface SalvarClienteResultado {
  ok: boolean;
  erro?: string;
  clienteId?: number;
}

export interface ToggleAtivoResultado {
  ok: boolean;
  erro?: string;
}

/** Normaliza o `ClienteInput` (já validado) para o shape completo do Prisma,
 * zerando explicitamente os campos do "outro" tipo de pessoa — evita que um
 * CNPJ antigo sobreviva numa edição que trocou o cliente para física, e
 * vice-versa. */
function paraDadosPrisma(dados: ClienteInput) {
  const enderecoEContato = {
    email: dados.email,
    celular: dados.celular ?? null,
    cep: dados.cep ?? null,
    logradouro: dados.logradouro ?? null,
    numero: dados.numero ?? null,
    complemento: dados.complemento ?? null,
    bairro: dados.bairro ?? null,
    cidade: dados.cidade ?? null,
    uf: dados.uf ?? null,
  };

  if (dados.tipo === "FISICA") {
    return {
      tipo: "FISICA" as const,
      nome: dados.nome,
      cpf: dados.cpf,
      nascimento: dados.nascimento ?? null,
      cnpj: null,
      ie: null,
      ...enderecoEContato,
    };
  }

  return {
    tipo: "JURIDICA" as const,
    nome: dados.nome,
    cnpj: dados.cnpj,
    ie: dados.ie ?? null,
    cpf: null,
    nascimento: null,
    ...enderecoEContato,
  };
}

function mensagemDuplicidade(dados: ClienteInput, duplicado: { ativo: boolean }): string {
  const documento = dados.tipo === "FISICA" ? "CPF" : "CNPJ";
  if (duplicado.ativo) {
    return `Já existe um cliente cadastrado com este ${documento}.`;
  }
  return `Este ${documento} pertence a um cliente inativo. Reative-o em vez de cadastrar de novo.`;
}

async function buscarDuplicado(clinicaId: number, dados: ClienteInput, ignorarClienteId?: number) {
  const filtroDocumento = dados.tipo === "FISICA" ? { cpf: dados.cpf } : { cnpj: dados.cnpj };
  return prisma.cliente.findFirst({
    where: {
      clinicaId,
      ...filtroDocumento,
      ...(ignorarClienteId ? { id: { not: ignorarClienteId } } : {}),
    },
    select: { id: true, ativo: true },
  });
}

export async function criarCliente(dadosBrutos: unknown): Promise<SalvarClienteResultado> {
  const clinicaId = await getClinicaAtual();

  const parse = clienteInputSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  // Duplicidade é checada aqui (comparando o CPF/CNPJ já normalizado) em vez
  // de deixar a constraint única do Postgres estourar — dá um erro claro em
  // vez de uma exceção genérica (Scenario "Tentativa de cadastro com CPF já
  // existente em formatação diferente").
  const duplicado = await buscarDuplicado(clinicaId, dados);
  if (duplicado) {
    return { ok: false, erro: mensagemDuplicidade(dados, duplicado) };
  }

  const cliente = await prisma.cliente.create({
    data: { clinicaId, ...paraDadosPrisma(dados) },
  });

  return { ok: true, clienteId: cliente.id };
}

export async function editarCliente(clienteId: number, dadosBrutos: unknown): Promise<SalvarClienteResultado> {
  const clinicaId = await getClinicaAtual();

  const existente = await prisma.cliente.findFirst({ where: { id: clienteId, clinicaId } });
  if (!existente) {
    // Nunca diferenciar "não existe" de "existe em outra clínica" — mesmo
    // padrão de isolamento usado no resto do projeto (ver
    // src/lib/isolamento-clinica.test.ts).
    return { ok: false, erro: "Cliente não encontrado." };
  }

  const parse = clienteInputSchema.safeParse(dadosBrutos);
  if (!parse.success) {
    return { ok: false, erro: parse.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const dados = parse.data;

  const duplicado = await buscarDuplicado(clinicaId, dados, clienteId);
  if (duplicado) {
    return { ok: false, erro: mensagemDuplicidade(dados, duplicado) };
  }

  await prisma.cliente.update({
    where: { id: clienteId },
    data: paraDadosPrisma(dados),
  });

  return { ok: true, clienteId };
}

async function alterarAtivo(clienteId: number, ativo: boolean): Promise<ToggleAtivoResultado> {
  const clinicaId = await getClinicaAtual();

  // `updateMany` com `clinicaId` no `where` (em vez de `update({ where: { id
  // } })`) garante isolamento: um ID de outra clínica simplesmente não
  // casa com nenhuma linha, `count` fica 0 — nunca um 403 revelando que o
  // recurso existe em outro tenant.
  const resultado = await prisma.cliente.updateMany({
    where: { id: clienteId, clinicaId },
    data: { ativo },
  });

  if (resultado.count === 0) {
    return { ok: false, erro: "Cliente não encontrado." };
  }

  return { ok: true };
}

export async function inativarCliente(clienteId: number): Promise<ToggleAtivoResultado> {
  // Sem nenhuma checagem de vínculo com Paciente/Comanda: inativar nunca
  // apaga nem desvincula dado nenhum, então não há nada a bloquear (ver
  // Requirement "Inativação lógica de cliente").
  return alterarAtivo(clienteId, false);
}

export async function reativarCliente(clienteId: number): Promise<ToggleAtivoResultado> {
  return alterarAtivo(clienteId, true);
}
