// Teste de isolamento entre clínicas para o recurso ItemCatalogo
// (capability: catalogo-produtos-servicos, task 5.1) — replica o padrão de
// referência estabelecido em src/lib/isolamento-paciente.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

describe("isolamento entre clínicas (ItemCatalogo como recurso)", () => {
  const clinicaAId = "test-isolamento-item-catalogo-clinica-a";
  const clinicaBId = "test-isolamento-item-catalogo-clinica-b";
  let itemBId: string;

  beforeAll(async () => {
    await prisma.clinica.createMany({
      data: [
        { id: clinicaAId, nome: "Test Isolamento ItemCatalogo Clínica A" },
        { id: clinicaBId, nome: "Test Isolamento ItemCatalogo Clínica B" },
      ],
      skipDuplicates: true,
    });

    const itemB = await prisma.itemCatalogo.create({
      data: { clinicaId: clinicaBId, nome: "Antipulgas (pipeta)", categoria: "PRODUTO", preco: 55 },
    });
    itemBId = itemB.id;
  });

  afterAll(async () => {
    await prisma.itemCatalogo.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("usuário com clinicaAtiva=A não encontra ItemCatalogo da clínica B por ID direto (-> 404, nunca 403)", async () => {
    const clinicaAtivaSimulada = clinicaAId;

    const resultado = await prisma.itemCatalogo.findFirst({
      where: { id: itemBId, clinicaId: clinicaAtivaSimulada },
    });

    expect(resultado).toBeNull();
  });

  it("a mesma query, com a clinicaAtiva correta (B), encontra o recurso normalmente", async () => {
    const resultado = await prisma.itemCatalogo.findFirst({
      where: { id: itemBId, clinicaId: clinicaBId },
    });

    expect(resultado?.id).toBe(itemBId);
  });
});
