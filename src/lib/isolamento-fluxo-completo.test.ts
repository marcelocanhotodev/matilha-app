// Teste de integração do fluxo completo entre duas clínicas (capability:
// nenhuma nova — ver openspec/changes/testar-fluxo-multiclinica/). Diferente
// dos `isolamento-*.test.ts` existentes (um model por vez, sequencial: cria
// tudo na clínica B, depois tenta acessar da A), este teste alterna clínica
// A / clínica B a cada passo de um fluxo real — cliente → paciente →
// agendamento → comanda — pra pegar bugs de "esqueceu de reatribuir o
// contexto" que um teste sequencial-por-clínica não pegaria.
//
// Alternância sequencial, nunca `Promise.all` (design.md, Decisão 1):
// `clinicaAtivaMock.current` é uma única variável mutável compartilhada: rodar
// as duas trilhas de verdade em paralelo tornaria o resultado dependente da
// ordem de resolução de microtasks.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const clinicaAtivaMock = { current: "" };

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "usuario-teste", clinicaAtivaId: clinicaAtivaMock.current } }),
}));

const { criarCliente } = await import("@/lib/actions/cliente");
const { criarPaciente } = await import("@/lib/actions/paciente");
const { criarAgendamento } = await import("@/lib/actions/agendamento");
const { adicionarItem } = await import("@/lib/actions/comanda");

describe("fluxo completo alternado entre duas clínicas (cliente → paciente → agendamento → comanda)", () => {
  const clinicaAId = "test-fluxo-completo-clinica-a";
  const clinicaBId = "test-fluxo-completo-clinica-b";
  let veterinarioAId: string;
  let veterinarioBId: string;
  let itemCatalogoAId: string;
  let itemCatalogoBId: string;

  // Preenchidos durante o fluxo, um lado por vez.
  let clienteAId: string, clienteBId: string;
  let pacienteAId: string, pacienteBId: string;
  let agendamentoAId: string, agendamentoBId: string;
  let comandaAId: string, comandaBId: string;

  beforeAll(async () => {
    await prisma.clinica.createMany({
      data: [
        { id: clinicaAId, nome: "Test Fluxo Completo Clínica A" },
        { id: clinicaBId, nome: "Test Fluxo Completo Clínica B" },
      ],
      skipDuplicates: true,
    });

    const veterinarioA = await prisma.usuario.create({
      data: { nome: "Vet Fluxo A", email: `vet-fluxo-a-${Date.now()}@teste.matilha`, senhaHash: "x" },
    });
    veterinarioAId = veterinarioA.id;
    const veterinarioB = await prisma.usuario.create({
      data: { nome: "Vet Fluxo B", email: `vet-fluxo-b-${Date.now()}@teste.matilha`, senhaHash: "x" },
    });
    veterinarioBId = veterinarioB.id;

    await prisma.usuarioClinica.createMany({
      data: [
        { usuarioId: veterinarioAId, clinicaId: clinicaAId, papel: "VETERINARIO" },
        { usuarioId: veterinarioBId, clinicaId: clinicaBId, papel: "VETERINARIO" },
      ],
    });

    const itemA = await prisma.itemCatalogo.create({
      data: { clinicaId: clinicaAId, nome: "Consulta Fluxo A", categoria: "SERVICO", preco: 100 },
    });
    itemCatalogoAId = itemA.id;
    const itemB = await prisma.itemCatalogo.create({
      data: { clinicaId: clinicaBId, nome: "Consulta Fluxo B", categoria: "SERVICO", preco: 150 },
    });
    itemCatalogoBId = itemB.id;
  });

  afterAll(async () => {
    await prisma.comandaItem.deleteMany({ where: { comanda: { clinicaId: { in: [clinicaAId, clinicaBId] } } } });
    await prisma.comanda.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.agendamento.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.paciente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.itemCatalogo.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.usuarioClinica.deleteMany({ where: { usuarioId: { in: [veterinarioAId, veterinarioBId] } } });
    await prisma.usuario.deleteMany({ where: { id: { in: [veterinarioAId, veterinarioBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("passo 1 — criarCliente: A e B, cada um só visível na própria clínica", async () => {
    clinicaAtivaMock.current = clinicaAId;
    const resultadoA = await criarCliente({
      tipo: "FISICA",
      nome: "Tutor Fluxo A",
      cpf: "11144477735",
      email: `tutor-fluxo-a-${Date.now()}@teste.matilha`,
    });
    expect(resultadoA.ok).toBe(true);
    clienteAId = resultadoA.clienteId!;

    clinicaAtivaMock.current = clinicaBId;
    const resultadoB = await criarCliente({
      tipo: "FISICA",
      nome: "Tutor Fluxo B",
      cpf: "22255588846",
      email: `tutor-fluxo-b-${Date.now()}@teste.matilha`,
    });
    expect(resultadoB.ok).toBe(true);
    clienteBId = resultadoB.clienteId!;

    // Isolamento: cada cliente só aparece com a clinicaId certa.
    expect(await prisma.cliente.findFirst({ where: { id: clienteAId, clinicaId: clinicaBId } })).toBeNull();
    expect(await prisma.cliente.findFirst({ where: { id: clienteBId, clinicaId: clinicaAId } })).toBeNull();
    expect((await prisma.cliente.findFirst({ where: { id: clienteAId, clinicaId: clinicaAId } }))?.id).toBe(clienteAId);
    expect((await prisma.cliente.findFirst({ where: { id: clienteBId, clinicaId: clinicaBId } }))?.id).toBe(clienteBId);
  });

  it("passo 2 — criarPaciente: A e B, cada um só visível na própria clínica", async () => {
    clinicaAtivaMock.current = clinicaAId;
    const resultadoA = await criarPaciente({
      clienteId: clienteAId,
      nome: "Pet Fluxo A",
      especie: "CAO",
      raca: "SRD",
      sexo: "MACHO",
    });
    expect(resultadoA.ok).toBe(true);
    pacienteAId = resultadoA.pacienteId!;

    clinicaAtivaMock.current = clinicaBId;
    const resultadoB = await criarPaciente({
      clienteId: clienteBId,
      nome: "Pet Fluxo B",
      especie: "GATO",
      raca: "SRD",
      sexo: "FEMEA",
    });
    expect(resultadoB.ok).toBe(true);
    pacienteBId = resultadoB.pacienteId!;

    expect(await prisma.paciente.findFirst({ where: { id: pacienteAId, clinicaId: clinicaBId } })).toBeNull();
    expect(await prisma.paciente.findFirst({ where: { id: pacienteBId, clinicaId: clinicaAId } })).toBeNull();
    expect((await prisma.paciente.findFirst({ where: { id: pacienteAId, clinicaId: clinicaAId } }))?.id).toBe(pacienteAId);
    expect((await prisma.paciente.findFirst({ where: { id: pacienteBId, clinicaId: clinicaBId } }))?.id).toBe(pacienteBId);

    // Um paciente de A não pode ter sido acidentalmente vinculado ao
    // cliente de B (nem o contrário) — checagem cruzada de FK, não só de
    // clinicaId.
    expect((await prisma.paciente.findUniqueOrThrow({ where: { id: pacienteAId } })).clienteId).toBe(clienteAId);
    expect((await prisma.paciente.findUniqueOrThrow({ where: { id: pacienteBId } })).clienteId).toBe(clienteBId);
  });

  it("passo 3 — criarAgendamento: A e B, cada um só visível na própria clínica", async () => {
    clinicaAtivaMock.current = clinicaAId;
    const resultadoA = await criarAgendamento({
      pacienteId: pacienteAId,
      veterinarioId: veterinarioAId,
      data: "2026-09-15",
      hora: "09:00",
      duracaoMinutos: 30,
    });
    expect(resultadoA.ok).toBe(true);
    agendamentoAId = resultadoA.agendamentoId!;

    clinicaAtivaMock.current = clinicaBId;
    const resultadoB = await criarAgendamento({
      pacienteId: pacienteBId,
      veterinarioId: veterinarioBId,
      data: "2026-09-15",
      hora: "09:00", // mesmo horário da clínica A — clínicas diferentes, sem conflito
      duracaoMinutos: 30,
    });
    expect(resultadoB.ok).toBe(true);
    agendamentoBId = resultadoB.agendamentoId!;

    expect(await prisma.agendamento.findFirst({ where: { id: agendamentoAId, clinicaId: clinicaBId } })).toBeNull();
    expect(await prisma.agendamento.findFirst({ where: { id: agendamentoBId, clinicaId: clinicaAId } })).toBeNull();
    expect((await prisma.agendamento.findFirst({ where: { id: agendamentoAId, clinicaId: clinicaAId } }))?.pacienteId).toBe(pacienteAId);
    expect((await prisma.agendamento.findFirst({ where: { id: agendamentoBId, clinicaId: clinicaBId } }))?.pacienteId).toBe(pacienteBId);
  });

  it("passo 4 — adicionarItem (abre comanda pelo agendamento): A e B, cada uma só visível na própria clínica", async () => {
    clinicaAtivaMock.current = clinicaAId;
    const resultadoA = await adicionarItem({
      agendamentoId: agendamentoAId,
      item: { itemCatalogoId: itemCatalogoAId, quantidade: 1 },
    });
    expect(resultadoA.ok).toBe(true);
    comandaAId = resultadoA.comandaId!;

    clinicaAtivaMock.current = clinicaBId;
    const resultadoB = await adicionarItem({
      agendamentoId: agendamentoBId,
      item: { itemCatalogoId: itemCatalogoBId, quantidade: 2 },
    });
    expect(resultadoB.ok).toBe(true);
    comandaBId = resultadoB.comandaId!;

    expect(await prisma.comanda.findFirst({ where: { id: comandaAId, clinicaId: clinicaBId } })).toBeNull();
    expect(await prisma.comanda.findFirst({ where: { id: comandaBId, clinicaId: clinicaAId } })).toBeNull();

    const comandaA = await prisma.comanda.findFirstOrThrow({ where: { id: comandaAId, clinicaId: clinicaAId } });
    const comandaB = await prisma.comanda.findFirstOrThrow({ where: { id: comandaBId, clinicaId: clinicaBId } });
    expect(Number(comandaA.subtotal)).toBe(100); // 1x item A (preco 100)
    expect(Number(comandaB.subtotal)).toBe(300); // 2x item B (preco 150)

    // ComandaItem não tem clinicaId próprio — isolamento vem de só existir
    // pendurado numa comanda já provada pertencer à clínica certa.
    const itensA = await prisma.comandaItem.findMany({ where: { comandaId: comandaAId } });
    const itensB = await prisma.comandaItem.findMany({ where: { comandaId: comandaBId } });
    expect(itensA).toHaveLength(1);
    expect(itensB).toHaveLength(1);
    expect(itensA[0].itemCatalogoId).toBe(itemCatalogoAId);
    expect(itensB[0].itemCatalogoId).toBe(itemCatalogoBId);
  });

  it("ao final do fluxo, listagem por clínica retorna exatamente os registros esperados de cada lado", async () => {
    const clientesA = await prisma.cliente.findMany({ where: { clinicaId: clinicaAId } });
    const clientesB = await prisma.cliente.findMany({ where: { clinicaId: clinicaBId } });
    expect(clientesA.map((c) => c.id)).toEqual([clienteAId]);
    expect(clientesB.map((c) => c.id)).toEqual([clienteBId]);

    const pacientesA = await prisma.paciente.findMany({ where: { clinicaId: clinicaAId } });
    const pacientesB = await prisma.paciente.findMany({ where: { clinicaId: clinicaBId } });
    expect(pacientesA.map((p) => p.id)).toEqual([pacienteAId]);
    expect(pacientesB.map((p) => p.id)).toEqual([pacienteBId]);

    const agendamentosA = await prisma.agendamento.findMany({ where: { clinicaId: clinicaAId } });
    const agendamentosB = await prisma.agendamento.findMany({ where: { clinicaId: clinicaBId } });
    expect(agendamentosA.map((a) => a.id)).toEqual([agendamentoAId]);
    expect(agendamentosB.map((a) => a.id)).toEqual([agendamentoBId]);

    const comandasA = await prisma.comanda.findMany({ where: { clinicaId: clinicaAId } });
    const comandasB = await prisma.comanda.findMany({ where: { clinicaId: clinicaBId } });
    expect(comandasA.map((c) => c.id)).toEqual([comandaAId]);
    expect(comandasB.map((c) => c.id)).toEqual([comandaBId]);
  });
});
