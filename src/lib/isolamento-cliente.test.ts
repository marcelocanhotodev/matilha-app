// Teste de isolamento entre clínicas para o recurso Cliente (capability:
// clientes, task 7.1) — replica o padrão de referência estabelecido em
// src/lib/isolamento-clinica.test.ts, usando Cliente em vez de Paciente.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("isolamento entre clínicas (Cliente como recurso)", () => {
  let clinicaAId: number;
  let clinicaBId: number;
  let clienteBId: number;

  beforeAll(async () => {
    const clinicaA = await prisma.clinica.create({ data: { nome: "Test Isolamento Cliente Clínica A" } });
    const clinicaB = await prisma.clinica.create({ data: { nome: "Test Isolamento Cliente Clínica B" } });
    clinicaAId = clinicaA.id;
    clinicaBId = clinicaB.id;

    const clienteB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Tutor da Clínica B",
        email: "tutor-cliente-b@teste.matilha",
      },
    });
    clienteBId = clienteB.id;
  });

  afterAll(async () => {
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("usuário com clinicaAtiva=A não encontra Cliente da clínica B por ID direto (-> 404, nunca 403)", async () => {
    const clinicaAtivaSimulada = clinicaAId;

    const resultado = await prisma.cliente.findFirst({
      where: { id: clienteBId, clinicaId: clinicaAtivaSimulada },
    });

    expect(resultado).toBeNull();
  });

  it("a mesma query, com a clinicaAtiva correta (B), encontra o recurso normalmente", async () => {
    const resultado = await prisma.cliente.findFirst({
      where: { id: clienteBId, clinicaId: clinicaBId },
    });

    expect(resultado?.id).toBe(clienteBId);
  });
});
