// Testes de src/lib/historico.ts (capability: historico-financeiro).
// Módulo de consulta puro — recebe `clinicaId` direto, sem mock de sessão
// (mesmo padrão de src/lib/painel-analitico.test.ts).
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { buscarComandaFinalizada, listarHistorico, totaisHistorico } from "@/lib/historico";

describe("historico", () => {
  let clinicaId: number;
  let clinicaOutraId: number;
  let clienteId: number;
  let pacienteId: number;
  let vetId: number;
  let agendamentoId: number;

  let comandaComVinculoId: number;
  let comandaAvulsaId: number;
  let comandaAbertaId: number;
  let comandaCanceladaId: number;
  let comandaOutraClinicaId: number;

  beforeAll(async () => {
    const clinica = await prisma.clinica.create({ data: { nome: "Test Histórico Clínica A" } });
    const clinicaOutra = await prisma.clinica.create({ data: { nome: "Test Histórico Clínica B" } });
    clinicaId = clinica.id;
    clinicaOutraId = clinicaOutra.id;

    const cliente = await prisma.cliente.create({
      data: { clinicaId, tipo: "FISICA", nome: "Tutor Histórico", email: `tutor-historico-${Date.now()}@teste.matilha` },
    });
    clienteId = cliente.id;

    const paciente = await prisma.paciente.create({
      data: { clinicaId, clienteId, nome: "Rex", especie: "CAO", raca: "SRD", sexo: "MACHO" },
    });
    pacienteId = paciente.id;

    const vet = await prisma.usuario.create({
      data: { nome: "Dra. Vet Histórico", email: `vet-historico-${Date.now()}@teste.matilha`, senhaHash: "hash" },
    });
    vetId = vet.id;

    const agendamento = await prisma.agendamento.create({
      data: { clinicaId, pacienteId, veterinarioId: vetId, dataHoraInicio: new Date("2026-01-10T13:00:00-03:00") },
    });
    agendamentoId = agendamento.id;

    // Comanda finalizada com vínculo completo (agendamento/paciente/cliente/
    // veterinário), 2 itens, forma DINHEIRO — a mais recente das duas.
    const comandaComVinculo = await prisma.comanda.create({
      data: {
        clinicaId,
        agendamentoId,
        pacienteId,
        clienteId,
        veterinarioId: vetId,
        status: "FINALIZADA",
        formaPagamento: "DINHEIRO",
        subtotal: 100,
        desconto: 10,
        total: 90,
        itens: {
          create: [
            { nomeSnapshot: "Consulta", precoSnapshot: 80, quantidade: 1, subtotal: 80 },
            { nomeSnapshot: "Vacina V10", precoSnapshot: 20, quantidade: 1, subtotal: 20 },
          ],
        },
      },
    });
    comandaComVinculoId = comandaComVinculo.id;

    // Comanda finalizada avulsa (sem agendamento/paciente/cliente/vet), forma
    // PIX, sem itens — "de ontem", pra exercitar ordem cronológica reversa.
    const comandaAvulsa = await prisma.comanda.create({
      data: { clinicaId, status: "FINALIZADA", formaPagamento: "PIX", subtotal: 50, total: 50 },
    });
    comandaAvulsaId = comandaAvulsa.id;
    await prisma.comanda.update({
      where: { id: comandaAvulsaId },
      data: { criadoEm: new Date("2026-01-01T12:00:00-03:00") },
    });

    const comandaAberta = await prisma.comanda.create({
      data: { clinicaId, status: "ABERTA", subtotal: 500, total: 500 },
    });
    comandaAbertaId = comandaAberta.id;

    const comandaCancelada = await prisma.comanda.create({
      data: { clinicaId, status: "CANCELADA", subtotal: 999, total: 999 },
    });
    comandaCanceladaId = comandaCancelada.id;

    const comandaOutraClinica = await prisma.comanda.create({
      data: { clinicaId: clinicaOutraId, status: "FINALIZADA", formaPagamento: "PIX", subtotal: 1000, total: 1000 },
    });
    comandaOutraClinicaId = comandaOutraClinica.id;
  });

  afterAll(async () => {
    await prisma.comandaItem.deleteMany({ where: { comanda: { clinicaId: { in: [clinicaId, clinicaOutraId] } } } });
    await prisma.comanda.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.agendamento.deleteMany({ where: { clinicaId } });
    await prisma.paciente.deleteMany({ where: { clinicaId } });
    await prisma.cliente.deleteMany({ where: { clinicaId } });
    await prisma.usuario.delete({ where: { id: vetId } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaId, clinicaOutraId] } } });
  });

  describe("buscarComandaFinalizada", () => {
    it("id certo da clínica -> objeto com os itens", async () => {
      const resultado = await buscarComandaFinalizada(comandaComVinculoId, clinicaId);
      expect(resultado).not.toBeNull();
      expect(resultado?.itens).toHaveLength(2);
      expect(resultado?.itens.map((i) => i.nomeSnapshot).sort()).toEqual(["Consulta", "Vacina V10"]);
      expect(resultado?.paciente).toEqual({ nome: "Rex" });
      expect(resultado?.cliente).toEqual({ nome: "Tutor Histórico" });
      expect(resultado?.veterinario).toEqual({ nome: "Dra. Vet Histórico" });
      expect(resultado?.agendamento?.dataHoraInicio).toBeInstanceOf(Date);
      expect(resultado?.subtotal).toBe(100);
      expect(resultado?.desconto).toBe(10);
      expect(resultado?.total).toBe(90);
    });

    it("comanda avulsa: paciente/cliente/veterinário/agendamento ausentes viram null, sem erro", async () => {
      const resultado = await buscarComandaFinalizada(comandaAvulsaId, clinicaId);
      expect(resultado).not.toBeNull();
      expect(resultado?.paciente).toBeNull();
      expect(resultado?.cliente).toBeNull();
      expect(resultado?.veterinario).toBeNull();
      expect(resultado?.agendamento).toBeNull();
      expect(resultado?.itens).toEqual([]);
    });

    it("id de outra clínica -> null (nunca revela que o recurso existe em outro tenant)", async () => {
      const resultado = await buscarComandaFinalizada(comandaOutraClinicaId, clinicaId);
      expect(resultado).toBeNull();
    });

    it("comanda ABERTA -> null (histórico só cobre finalizadas)", async () => {
      const resultado = await buscarComandaFinalizada(comandaAbertaId, clinicaId);
      expect(resultado).toBeNull();
    });

    it("comanda CANCELADA -> null (histórico só cobre finalizadas)", async () => {
      const resultado = await buscarComandaFinalizada(comandaCanceladaId, clinicaId);
      expect(resultado).toBeNull();
    });

    it("id inexistente -> null", async () => {
      const resultado = await buscarComandaFinalizada(-1, clinicaId);
      expect(resultado).toBeNull();
    });
  });

  describe("listarHistorico", () => {
    it("ordem cronológica reversa: mais recente primeiro", async () => {
      const resultado = await listarHistorico(clinicaId, { page: 1, porPagina: 10 });
      expect(resultado.comandas.map((c) => c.id)).toEqual([comandaComVinculoId, comandaAvulsaId]);
    });

    it("nunca inclui comandas ABERTA/CANCELADA nem de outra clínica", async () => {
      const resultado = await listarHistorico(clinicaId, { page: 1, porPagina: 10 });
      const ids = resultado.comandas.map((c) => c.id);
      expect(ids).not.toContain(comandaAbertaId);
      expect(ids).not.toContain(comandaCanceladaId);
      expect(ids).not.toContain(comandaOutraClinicaId);
    });

    it("tamanho de página respeitado, com totalPaginas correto", async () => {
      const pagina1 = await listarHistorico(clinicaId, { page: 1, porPagina: 1 });
      expect(pagina1.comandas).toHaveLength(1);
      expect(pagina1.comandas[0].id).toBe(comandaComVinculoId);
      expect(pagina1.totalPaginas).toBe(2);

      const pagina2 = await listarHistorico(clinicaId, { page: 2, porPagina: 1 });
      expect(pagina2.comandas).toHaveLength(1);
      expect(pagina2.comandas[0].id).toBe(comandaAvulsaId);
    });

    it("página além do total -> lista vazia, sem erro", async () => {
      const resultado = await listarHistorico(clinicaId, { page: 99, porPagina: 1 });
      expect(resultado.comandas).toEqual([]);
      expect(resultado.totalPaginas).toBe(2);
    });

    it("nenhuma comanda finalizada -> lista vazia, totalPaginas 1 (nunca 0)", async () => {
      const resultado = await listarHistorico(-1, { page: 1, porPagina: 10 });
      expect(resultado.comandas).toEqual([]);
      expect(resultado.totalPaginas).toBe(1);
    });
  });

  describe("totaisHistorico", () => {
    it("nenhuma comanda finalizada -> tudo zero/null", async () => {
      const resultado = await totaisHistorico(-1);
      expect(resultado).toEqual({ arrecadado: 0, quantidade: 0, ticketMedio: null, formaMaisFrequente: null });
    });

    it("caso com dado real bate a conta", async () => {
      const resultado = await totaisHistorico(clinicaId);
      expect(resultado.quantidade).toBe(2);
      expect(resultado.arrecadado).toBe(140); // 90 (com vínculo) + 50 (avulsa)
      expect(resultado.ticketMedio).toBe(70); // 140 / 2
    });

    it("desempate: DINHEIRO e PIX empatados (1 cada) -> vence DINHEIRO (primeiro na ordem fixa)", async () => {
      const resultado = await totaisHistorico(clinicaId);
      expect(resultado.formaMaisFrequente).toBe("DINHEIRO");
    });

    it("desempate explícito: CARTAO_CREDITO e CARTAO_DEBITO empatados -> vence CARTAO_CREDITO", async () => {
      const clinicaEmpate = await prisma.clinica.create({ data: { nome: "Test Histórico Empate" } });
      try {
        await prisma.comanda.createMany({
          data: [
            { clinicaId: clinicaEmpate.id, status: "FINALIZADA", formaPagamento: "CARTAO_DEBITO", subtotal: 10, total: 10 },
            { clinicaId: clinicaEmpate.id, status: "FINALIZADA", formaPagamento: "CARTAO_DEBITO", subtotal: 10, total: 10 },
            { clinicaId: clinicaEmpate.id, status: "FINALIZADA", formaPagamento: "CARTAO_CREDITO", subtotal: 10, total: 10 },
            { clinicaId: clinicaEmpate.id, status: "FINALIZADA", formaPagamento: "CARTAO_CREDITO", subtotal: 10, total: 10 },
          ],
        });

        const resultado = await totaisHistorico(clinicaEmpate.id);
        expect(resultado.formaMaisFrequente).toBe("CARTAO_CREDITO");
      } finally {
        await prisma.comanda.deleteMany({ where: { clinicaId: clinicaEmpate.id } });
        await prisma.clinica.delete({ where: { id: clinicaEmpate.id } });
      }
    });
  });
});
