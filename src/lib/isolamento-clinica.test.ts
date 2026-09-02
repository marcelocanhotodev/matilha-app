// Teste de referência de isolamento entre clínicas (capability:
// autenticacao-multi-clinica, tasks 6.1/6.2, design.md Decisão 4).
//
// PADRÃO DE REFERÊNCIA: quando as capabilities `clientes`, `agendamento`,
// `atendimento-comanda` etc. forem implementadas, repetir este mesmo teste
// para seus próprios recursos — login/clinicaId ativa da Clínica A, tentar
// acessar por ID direto um recurso da Clínica B, esperar `null` (a rota
// chamaria notFound() -> 404), nunca um erro de acesso negado (403) nem o
// dado da outra clínica.
//
// Este teste exercita a query diretamente via Prisma (o mesmo padrão que
// getClinicaAtual() + toda rota de recurso devem seguir), sem depender da UI
// de nenhuma capability de recurso ainda não implementada.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("isolamento entre clínicas (Paciente como recurso de referência)", () => {
  const clinicaAId = "test-isolamento-clinica-a";
  const clinicaBId = "test-isolamento-clinica-b";
  let pacienteBId: string;

  beforeAll(async () => {
    await prisma.clinica.createMany({
      data: [
        { id: clinicaAId, nome: "Test Isolamento Clínica A" },
        { id: clinicaBId, nome: "Test Isolamento Clínica B" },
      ],
      skipDuplicates: true,
    });

    const clienteB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Tutor da Clínica B",
        email: "tutor-b@teste.matilha",
      },
    });

    const pacienteB = await prisma.paciente.create({
      data: {
        clinicaId: clinicaBId,
        clienteId: clienteB.id,
        nome: "Rex",
        especie: "CAO",
        raca: "SRD",
        sexo: "MACHO",
      },
    });
    pacienteBId = pacienteB.id;
  });

  afterAll(async () => {
    await prisma.paciente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("usuário com clinicaAtiva=A não encontra Paciente da clínica B por ID direto (-> 404, nunca 403)", async () => {
    const clinicaAtivaSimulada = clinicaAId;

    const resultado = await prisma.paciente.findFirst({
      where: { id: pacienteBId, clinicaId: clinicaAtivaSimulada },
    });

    expect(resultado).toBeNull();
  });

  it("a mesma query, com a clinicaAtiva correta (B), encontra o recurso normalmente", async () => {
    const resultado = await prisma.paciente.findFirst({
      where: { id: pacienteBId, clinicaId: clinicaBId },
    });

    expect(resultado?.id).toBe(pacienteBId);
  });
});

// Repetição do mesmo padrão para Comanda (capability: atendimento-comanda,
// task 10.2 — ver comentário no topo do arquivo).
describe("isolamento entre clínicas (Comanda como recurso de referência)", () => {
  const clinicaAId = "test-isolamento-comanda-clinica-a";
  const clinicaBId = "test-isolamento-comanda-clinica-b";
  let comandaBId: string;

  beforeAll(async () => {
    await prisma.clinica.createMany({
      data: [
        { id: clinicaAId, nome: "Test Isolamento Comanda Clínica A" },
        { id: clinicaBId, nome: "Test Isolamento Comanda Clínica B" },
      ],
      skipDuplicates: true,
    });

    const comandaB = await prisma.comanda.create({
      data: { clinicaId: clinicaBId },
    });
    comandaBId = comandaB.id;
  });

  afterAll(async () => {
    await prisma.comandaItem.deleteMany({ where: { comandaId: comandaBId } });
    await prisma.comanda.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("usuário com clinicaAtiva=A não encontra Comanda da clínica B por ID direto (-> 404, nunca 403)", async () => {
    const clinicaAtivaSimulada = clinicaAId;

    const resultado = await prisma.comanda.findFirst({
      where: { id: comandaBId, clinicaId: clinicaAtivaSimulada },
    });

    expect(resultado).toBeNull();
  });

  it("a mesma query, com a clinicaAtiva correta (B), encontra o recurso normalmente", async () => {
    const resultado = await prisma.comanda.findFirst({
      where: { id: comandaBId, clinicaId: clinicaBId },
    });

    expect(resultado?.id).toBe(comandaBId);
  });
});
