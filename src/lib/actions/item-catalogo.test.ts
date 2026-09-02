// Testes de src/lib/actions/item-catalogo.ts (capability:
// catalogo-produtos-servicos, tasks 2.1 e 2.2). Mocka @/lib/auth para
// simular uma sessão com `clinicaAtivaId`, mesmo padrão de
// src/lib/actions/paciente.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const clinicaAtivaMock = { current: "" };

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "usuario-teste", clinicaAtivaId: clinicaAtivaMock.current } }),
}));

const { criarItemCatalogo, editarItemCatalogo, inativarItemCatalogo, reativarItemCatalogo } = await import(
  "@/lib/actions/item-catalogo"
);

describe("Server Actions de ItemCatalogo", () => {
  const clinicaAId = "test-item-catalogo-action-clinica-a";
  const clinicaBId = "test-item-catalogo-action-clinica-b";

  beforeAll(async () => {
    await prisma.clinica.createMany({
      data: [
        { id: clinicaAId, nome: "Test ItemCatalogo Action Clínica A" },
        { id: clinicaBId, nome: "Test ItemCatalogo Action Clínica B" },
      ],
      skipDuplicates: true,
    });
  });

  afterAll(async () => {
    // ComandaItem/Comanda referenciam clinicaId com onDelete: Restrict —
    // precisam sumir antes da clínica (e do usuário/paciente/cliente
    // criados no teste do Scenario "Inativar item já usado...").
    const comandas = await prisma.comanda.findMany({
      where: { clinicaId: { in: [clinicaAId, clinicaBId] } },
      select: { id: true, veterinarioId: true },
    });
    await prisma.comandaItem.deleteMany({ where: { comandaId: { in: comandas.map((c) => c.id) } } });
    await prisma.agendamento.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.comanda.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.usuario.deleteMany({
      where: { id: { in: comandas.map((c) => c.veterinarioId).filter((id): id is string => !!id) } },
    });
    await prisma.paciente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.itemCatalogo.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("criarItemCatalogo cria o item na clinicaId ativa da sessão (task 2.1)", async () => {
    clinicaAtivaMock.current = clinicaAId;

    const resultado = await criarItemCatalogo({
      nome: "Consulta de rotina",
      categoria: "SERVICO",
      preco: 120,
      icone: "🩺",
    });

    expect(resultado.ok).toBe(true);
    const item = await prisma.itemCatalogo.findUnique({ where: { id: resultado.itemCatalogoId } });
    expect(item?.clinicaId).toBe(clinicaAId);
    expect(item?.ativo).toBe(true);
    expect(Number(item?.preco)).toBe(120);
  });

  it('Scenario "Preço inválido" — preço negativo é rejeitado pela action (task 2.1)', async () => {
    clinicaAtivaMock.current = clinicaAId;

    const resultado = await criarItemCatalogo({
      nome: "Item inválido",
      categoria: "PRODUTO",
      preco: -10,
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBeTruthy();
  });

  it('Scenario "Inativar item já usado em agendamentos e comandas" (task 2.2)', async () => {
    clinicaAtivaMock.current = clinicaAId;

    const criado = await criarItemCatalogo({
      nome: "Vacinação (V10)",
      categoria: "SERVICO",
      preco: 85,
    });
    const itemCatalogoId = criado.itemCatalogoId!;

    const cliente = await prisma.cliente.create({
      data: {
        clinicaId: clinicaAId,
        tipo: "FISICA",
        nome: "Marina Silva",
        email: `marina-${itemCatalogoId}@teste.matilha`,
      },
    });
    const paciente = await prisma.paciente.create({
      data: {
        clinicaId: clinicaAId,
        clienteId: cliente.id,
        nome: "Thor",
        especie: "CAO",
        raca: "Golden Retriever",
        sexo: "MACHO",
      },
    });
    const veterinario = await prisma.usuario.create({
      data: { nome: "Vet Teste", email: `vet-${itemCatalogoId}@teste.matilha`, senhaHash: "x" },
    });
    const agendamento = await prisma.agendamento.create({
      data: {
        clinicaId: clinicaAId,
        pacienteId: paciente.id,
        veterinarioId: veterinario.id,
        itemCatalogoId,
        dataHoraInicio: new Date(),
      },
    });
    const comanda = await prisma.comanda.create({
      data: {
        clinicaId: clinicaAId,
        pacienteId: paciente.id,
        clienteId: cliente.id,
        veterinarioId: veterinario.id,
        subtotal: 85,
        total: 85,
        formaPagamento: "PIX",
        itens: {
          create: [{ itemCatalogoId, nomeSnapshot: "Vacinação (V10)", precoSnapshot: 85, subtotal: 85 }],
        },
      },
    });

    const inativado = await inativarItemCatalogo(itemCatalogoId);
    expect(inativado.ok).toBe(true);

    const itemInativo = await prisma.itemCatalogo.findUnique({ where: { id: itemCatalogoId } });
    expect(itemInativo?.ativo).toBe(false);

    // Nada foi apagado ou desvinculado.
    const agendamentoAindaExiste = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
    expect(agendamentoAindaExiste?.itemCatalogoId).toBe(itemCatalogoId);
    const comandaItemAindaExiste = await prisma.comandaItem.findFirst({ where: { comandaId: comanda.id } });
    expect(comandaItemAindaExiste?.itemCatalogoId).toBe(itemCatalogoId);
    expect(Number(comandaItemAindaExiste?.precoSnapshot)).toBe(85);

    const reativado = await reativarItemCatalogo(itemCatalogoId);
    expect(reativado.ok).toBe(true);
    const itemReativado = await prisma.itemCatalogo.findUnique({ where: { id: itemCatalogoId } });
    expect(itemReativado?.ativo).toBe(true);
  });

  it("inativarItemCatalogo não afeta item de outra clínica, mesmo passando o ID direto (isolamento, task 2.1)", async () => {
    clinicaAtivaMock.current = clinicaBId;
    const itemDaClinicaB = await prisma.itemCatalogo.create({
      data: { clinicaId: clinicaBId, nome: "Banho e tosa", categoria: "SERVICO", preco: 70 },
    });

    // Sessão ativa é A, mas o ID passado pertence a B.
    clinicaAtivaMock.current = clinicaAId;
    const resultado = await inativarItemCatalogo(itemDaClinicaB.id);

    expect(resultado.ok).toBe(false);
    const aindaAtivo = await prisma.itemCatalogo.findUnique({ where: { id: itemDaClinicaB.id } });
    expect(aindaAtivo?.ativo).toBe(true); // não foi alterado
  });

  it("criarItemCatalogo grava duracaoPadraoMinutos para serviço, e nunca para produto", async () => {
    clinicaAtivaMock.current = clinicaAId;

    const servico = await criarItemCatalogo({
      nome: "Consulta com duração",
      categoria: "SERVICO",
      preco: 100,
      duracaoPadraoMinutos: 30,
    });
    expect(servico.ok).toBe(true);
    const itemServico = await prisma.itemCatalogo.findUnique({ where: { id: servico.itemCatalogoId } });
    expect(itemServico?.duracaoPadraoMinutos).toBe(30);

    const produto = await criarItemCatalogo({
      nome: "Produto com duração enviada por engano",
      categoria: "PRODUTO",
      preco: 20,
      duracaoPadraoMinutos: 30,
    });
    expect(produto.ok).toBe(true);
    const itemProduto = await prisma.itemCatalogo.findUnique({ where: { id: produto.itemCatalogoId } });
    expect(itemProduto?.duracaoPadraoMinutos).toBeNull();
  });

  it("editarItemCatalogo não edita item de outra clínica, mesmo passando o ID direto (isolamento, task 2.1)", async () => {
    clinicaAtivaMock.current = clinicaBId;
    const itemDaClinicaB = await prisma.itemCatalogo.create({
      data: { clinicaId: clinicaBId, nome: "Ração premium 1kg", categoria: "PRODUTO", preco: 38 },
    });

    clinicaAtivaMock.current = clinicaAId;
    const resultado = await editarItemCatalogo(itemDaClinicaB.id, {
      nome: "Nome Alterado Indevidamente",
      categoria: "PRODUTO",
      preco: 999,
    });

    expect(resultado.ok).toBe(false);
    const inalterado = await prisma.itemCatalogo.findUnique({ where: { id: itemDaClinicaB.id } });
    expect(inalterado?.nome).toBe("Ração premium 1kg");
  });
});
