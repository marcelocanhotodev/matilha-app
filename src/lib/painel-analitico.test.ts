// Testes de src/lib/painel-analitico.ts (capability: painel-analitico).
// Módulo de consulta puro — recebe `clinicaId` direto, sem mock de sessão
// (mesmo padrão de src/lib/clinica-selecao.test.ts).
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  itensMaisVendidos,
  clientesComMaisConsumo,
  faturamentoPorFormaPagamento,
  faturamentoPorDia,
} from "@/lib/painel-analitico";
import { adicionarDias, inicioDoDiaClinica, paraDiaCalendario } from "@/lib/timezone";

describe("painel-analitico", () => {
  let clinicaId: number;
  let clinicaOutraId: number;
  let clienteAId: number;
  let clienteBId: number;
  let itemXId: number;
  let itemYId: number;
  let itemZId: number;

  beforeAll(async () => {
    const clinica = await prisma.clinica.create({ data: { nome: "Test Painel Analítico Clínica A" } });
    const clinicaOutra = await prisma.clinica.create({ data: { nome: "Test Painel Analítico Clínica B" } });
    clinicaId = clinica.id;
    clinicaOutraId = clinicaOutra.id;

    const clienteA = await prisma.cliente.create({
      data: { clinicaId, tipo: "FISICA", nome: "Zelda Tutora", email: `zelda-${Date.now()}@teste.matilha` },
    });
    clienteAId = clienteA.id;
    const clienteB = await prisma.cliente.create({
      data: { clinicaId, tipo: "FISICA", nome: "Ana Tutora", email: `ana-tutora-${Date.now()}@teste.matilha` },
    });
    clienteBId = clienteB.id;

    const itemX = await prisma.itemCatalogo.create({
      data: { clinicaId, nome: "Zebra Item", categoria: "SERVICO", preco: 50 },
    });
    itemXId = itemX.id;
    const itemY = await prisma.itemCatalogo.create({
      data: { clinicaId, nome: "Anel Item", categoria: "PRODUTO", preco: 30 },
    });
    itemYId = itemY.id;
    const itemZ = await prisma.itemCatalogo.create({
      data: { clinicaId, nome: "Item Sem Venda", categoria: "PRODUTO", preco: 10 },
    });
    itemZId = itemZ.id;

    // Comanda finalizada 1: cliente A, itemX (qtd 3) + itemY (qtd 3) — empate
    // de quantidade entre X e Y, "Anel Item" deve vir primeiro (alfabético).
    const comanda1 = await prisma.comanda.create({
      data: {
        clinicaId,
        clienteId: clienteAId,
        status: "FINALIZADA",
        formaPagamento: "PIX",
        subtotal: 240,
        total: 240,
        itens: {
          create: [
            { itemCatalogoId: itemXId, nomeSnapshot: "Zebra Item", precoSnapshot: 50, quantidade: 3, subtotal: 150 },
            { itemCatalogoId: itemYId, nomeSnapshot: "Anel Item", precoSnapshot: 30, quantidade: 3, subtotal: 90 },
          ],
        },
      },
    });

    // Comanda finalizada 2: cliente B, forma diferente (DINHEIRO), sem itens.
    await prisma.comanda.create({
      data: {
        clinicaId,
        clienteId: clienteBId,
        status: "FINALIZADA",
        formaPagamento: "DINHEIRO",
        subtotal: 100,
        total: 100,
      },
    });

    // Comanda avulsa finalizada, sem clienteId — não deve entrar no ranking
    // de clientes, mas conta pro faturamento por forma de pagamento.
    await prisma.comanda.create({
      data: { clinicaId, status: "FINALIZADA", formaPagamento: "PIX", subtotal: 60, total: 60 },
    });

    // Comanda ABERTA — nunca deve contar em nenhuma agregação.
    await prisma.comanda.create({
      data: { clinicaId, clienteId: clienteAId, status: "ABERTA", subtotal: 500, total: 500 },
    });

    // Comanda CANCELADA — idem, nunca deve contar.
    await prisma.comanda.create({
      data: { clinicaId, clienteId: clienteAId, status: "CANCELADA", subtotal: 999, total: 999 },
    });

    // Dado de outra clínica — nunca deve vazar pra clínica A. Item de
    // catálogo homônimo de propósito ("Zebra Item"), pra garantir que o
    // agrupamento por `itemCatalogoId` (não por nome) não mistura as duas
    // clínicas.
    const itemOutraClinica = await prisma.itemCatalogo.create({
      data: { clinicaId: clinicaOutraId, nome: "Zebra Item", categoria: "SERVICO", preco: 999 },
    });
    await prisma.comanda.create({
      data: {
        clinicaId: clinicaOutraId,
        status: "FINALIZADA",
        formaPagamento: "CARTAO_CREDITO",
        subtotal: 1000,
        total: 1000,
        itens: {
          create: [
            { itemCatalogoId: itemOutraClinica.id, nomeSnapshot: "Zebra Item", precoSnapshot: 999, quantidade: 50, subtotal: 1000 },
          ],
        },
      },
    });

    // Uma comanda "de ontem" pra exercitar o agrupamento por dia.
    const ontem = inicioDoDiaClinica(adicionarDias(paraDiaCalendario(new Date()), -1));
    const comandaOntem = await prisma.comanda.create({
      data: { clinicaId, status: "FINALIZADA", formaPagamento: "PIX", subtotal: 77, total: 77 },
    });
    await prisma.comanda.update({ where: { id: comandaOntem.id }, data: { criadoEm: ontem } });
    void comanda1;
  });

  afterAll(async () => {
    await prisma.comandaItem.deleteMany({ where: { comanda: { clinicaId: { in: [clinicaId, clinicaOutraId] } } } });
    await prisma.comanda.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.itemCatalogo.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaId, clinicaOutraId] } } });
  });

  describe("itensMaisVendidos", () => {
    it("rankeia por quantidade vendida em comandas finalizadas, empate em ordem alfabética", async () => {
      const resultado = await itensMaisVendidos(clinicaId);
      expect(resultado.map((r) => r.nome)).toEqual(["Anel Item", "Zebra Item"]);
      expect(resultado[0].quantidade).toBe(3);
      expect(resultado[1].quantidade).toBe(3);
    });

    it("item sem nenhuma venda não aparece na lista (não completa com zeros)", async () => {
      const resultado = await itensMaisVendidos(clinicaId);
      expect(resultado.find((r) => r.itemCatalogoId === itemZId)).toBeUndefined();
    });

    it("nenhuma venda ainda -> lista vazia", async () => {
      const resultado = await itensMaisVendidos(-1); // id de clínica que nunca existe
      expect(resultado).toEqual([]);
    });

    it("isolamento: item homônimo de outra clínica não se mistura (agrupa por id, não por nome)", async () => {
      const resultado = await itensMaisVendidos(clinicaId);
      expect(resultado).toHaveLength(2); // só "Anel Item" e "Zebra Item" da clínica A
      const zebraA = resultado.find((r) => r.nome === "Zebra Item");
      expect(zebraA?.quantidade).toBe(3); // não 53 (3 da clínica A + 50 da clínica B)

      const resultadoOutra = await itensMaisVendidos(clinicaOutraId);
      expect(resultadoOutra).toEqual([{ itemCatalogoId: expect.any(Number), nome: "Zebra Item", quantidade: 50 }]);
    });
  });

  describe("clientesComMaisConsumo", () => {
    it("rankeia por soma de total em comandas finalizadas", async () => {
      const resultado = await clientesComMaisConsumo(clinicaId);
      const porId = new Map(resultado.map((r) => [r.clienteId, r.total]));
      expect(porId.get(clienteAId)).toBe(240);
      expect(porId.get(clienteBId)).toBe(100);
    });

    it("comanda avulsa sem clienteId não entra no ranking", async () => {
      const resultado = await clientesComMaisConsumo(clinicaId);
      const total = resultado.reduce((soma, r) => soma + r.total, 0);
      expect(total).toBe(340); // 240 (A) + 100 (B), nunca +60 da avulsa
    });

    it("isolamento: não inclui consumo de outra clínica", async () => {
      const resultado = await clientesComMaisConsumo(clinicaOutraId);
      expect(resultado).toEqual([]); // a única comanda de B não tem clienteId
    });
  });

  describe("faturamentoPorFormaPagamento", () => {
    it("agrupa por forma de pagamento só considerando comandas finalizadas", async () => {
      const resultado = await faturamentoPorFormaPagamento(clinicaId);
      const porForma = new Map(resultado.map((r) => [r.formaPagamento, r.total]));
      expect(porForma.get("PIX")).toBe(240 + 60 + 77); // comanda1 + avulsa + "ontem"
      expect(porForma.get("DINHEIRO")).toBe(100);
      expect(porForma.get("CARTAO_CREDITO")).toBeUndefined(); // isolamento: essa venda é da outra clínica
    });

    it("nenhuma venda finalizada -> lista vazia", async () => {
      const resultado = await faturamentoPorFormaPagamento(-1); // id de clínica que nunca existe
      expect(resultado).toEqual([]);
    });
  });

  describe("faturamentoPorDia", () => {
    it("sempre retorna 14 dias, dia sem venda com total zero", async () => {
      const resultado = await faturamentoPorDia(clinicaId);
      expect(resultado).toHaveLength(14);
      expect(resultado.every((d) => typeof d.total === "number")).toBe(true);
    });

    it("soma corretamente o dia de hoje e o de ontem", async () => {
      const resultado = await faturamentoPorDia(clinicaId);
      const hojeChave = resultado[resultado.length - 1].data;
      const ontemChave = resultado[resultado.length - 2].data;

      const porDia = new Map(resultado.map((d) => [d.data, d.total]));
      expect(porDia.get(hojeChave)).toBe(240 + 100 + 60); // as 3 finalizadas "de hoje"
      expect(porDia.get(ontemChave)).toBe(77);
    });

    it("nenhuma venda no período -> 14 dias, todos zerados", async () => {
      const resultado = await faturamentoPorDia(-1); // id de clínica que nunca existe
      expect(resultado).toHaveLength(14);
      expect(resultado.every((d) => d.total === 0)).toBe(true);
    });
  });
});
