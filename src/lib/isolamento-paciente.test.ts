// Teste de isolamento entre clínicas para o recurso Paciente (capability:
// pacientes, task 6.1) — replica o padrão de referência estabelecido em
// src/lib/isolamento-clinica.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("isolamento entre clínicas (Paciente como recurso)", () => {
  let clinicaAId: number;
  let clinicaBId: number;
  let pacienteBId: number;

  beforeAll(async () => {
    const clinicaA = await prisma.clinica.create({ data: { nome: "Test Isolamento Paciente Clínica A" } });
    const clinicaB = await prisma.clinica.create({ data: { nome: "Test Isolamento Paciente Clínica B" } });
    clinicaAId = clinicaA.id;
    clinicaBId = clinicaB.id;

    const clienteB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Tutor da Clínica B",
        email: "tutor-paciente-b@teste.matilha",
      },
    });

    const pacienteB = await prisma.paciente.create({
      data: {
        clinicaId: clinicaBId,
        clienteId: clienteB.id,
        nome: "Rex",
        especie: "CAO",
        raca: "Pastor Alemão",
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
