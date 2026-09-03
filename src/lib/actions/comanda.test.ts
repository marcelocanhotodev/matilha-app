// Testes de src/lib/actions/comanda.ts (capability: atendimento-comanda,
// tasks 3.1-3.4 e 4.1-4.3). Mocka @/lib/auth para simular uma sessão com
// `clinicaAtivaId`, mesmo padrão de src/lib/actions/item-catalogo.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const clinicaAtivaMock = { current: "" };

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "usuario-teste", clinicaAtivaId: clinicaAtivaMock.current } }),
}));

const { adicionarItem, removerItem, alterarQuantidade, aplicarDesconto, finalizarComanda, descartarComanda } =
  await import("@/lib/actions/comanda");

describe("Server Actions de Comanda", () => {
  let clinicaId: number;
  let clinicaOutraId: number;
  let veterinarioId: number;
  let clienteId: number;
  let pacienteId: number;
  let itemAId: number; // preço 100
  let itemBId: number; // preço 50
  let itemOutraClinicaId: number;

  beforeAll(async () => {
    const clinica = await prisma.clinica.create({ data: { nome: "Test Comanda Action Clínica A" } });
    const clinicaOutra = await prisma.clinica.create({ data: { nome: "Test Comanda Action Clínica B" } });
    clinicaId = clinica.id;
    clinicaOutraId = clinicaOutra.id;

    const veterinario = await prisma.usuario.create({
      data: { nome: "Vet Teste Comanda", email: `vet-comanda-${Date.now()}@teste.matilha`, senhaHash: "x" },
    });
    veterinarioId = veterinario.id;

    const cliente = await prisma.cliente.create({
      data: { clinicaId, tipo: "FISICA", nome: "Tutora Teste", email: `tutora-comanda-${Date.now()}@teste.matilha` },
    });
    clienteId = cliente.id;

    const paciente = await prisma.paciente.create({
      data: { clinicaId, clienteId, nome: "Rex", especie: "CAO", raca: "SRD", sexo: "MACHO" },
    });
    pacienteId = paciente.id;

    const itemA = await prisma.itemCatalogo.create({
      data: { clinicaId, nome: "Consulta", categoria: "SERVICO", preco: 100 },
    });
    itemAId = itemA.id;

    const itemB = await prisma.itemCatalogo.create({
      data: { clinicaId, nome: "Ração", categoria: "PRODUTO", preco: 50 },
    });
    itemBId = itemB.id;

    const itemOutra = await prisma.itemCatalogo.create({
      data: { clinicaId: clinicaOutraId, nome: "Item da Clínica B", categoria: "SERVICO", preco: 30 },
    });
    itemOutraClinicaId = itemOutra.id;
  });

  afterAll(async () => {
    await prisma.comandaItem.deleteMany({ where: { comanda: { clinicaId: { in: [clinicaId, clinicaOutraId] } } } });
    await prisma.comanda.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.agendamento.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.paciente.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.itemCatalogo.deleteMany({ where: { clinicaId: { in: [clinicaId, clinicaOutraId] } } });
    await prisma.usuario.deleteMany({ where: { id: veterinarioId } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaId, clinicaOutraId] } } });
  });

  it('Scenario "Primeiro item cria a comanda" — avulso', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const resultado = await adicionarItem({ item: { itemCatalogoId: itemAId, quantidade: 1 } });
    expect(resultado.ok).toBe(true);

    const comanda = await prisma.comanda.findUnique({ where: { id: resultado.comandaId } });
    expect(comanda?.status).toBe("ABERTA");
    expect(comanda?.agendamentoId).toBeNull();
    expect(Number(comanda?.subtotal)).toBe(100);
    expect(Number(comanda?.total)).toBe(100);
  });

  it('Scenario "Adicionar item já presente na comanda" — incrementa em vez de duplicar', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemAId, quantidade: 1 } });
    const segundo = await adicionarItem({
      comandaId: primeiro.comandaId,
      item: { itemCatalogoId: itemAId, quantidade: 1 },
    });
    expect(segundo.ok).toBe(true);

    const itens = await prisma.comandaItem.findMany({ where: { comandaId: primeiro.comandaId } });
    expect(itens).toHaveLength(1);
    expect(itens[0].quantidade).toBe(2);
    expect(Number(itens[0].subtotal)).toBe(200);
  });

  it('Scenario "Preço do item é copiado no momento da adição" — snapshot não muda com o catálogo', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemBId, quantidade: 1 } });
    await prisma.itemCatalogo.update({ where: { id: itemBId }, data: { preco: 999 } });

    const item = await prisma.comandaItem.findFirst({
      where: { comandaId: primeiro.comandaId, itemCatalogoId: itemBId },
    });
    expect(Number(item?.precoSnapshot)).toBe(50);

    await prisma.itemCatalogo.update({ where: { id: itemBId }, data: { preco: 50 } });
  });

  it("removerItem e alterarQuantidade recalculam subtotal/total", async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemAId, quantidade: 2 } }); // 200
    const item = await prisma.comandaItem.findFirstOrThrow({ where: { comandaId: primeiro.comandaId } });

    const alterado = await alterarQuantidade({
      comandaId: primeiro.comandaId,
      comandaItemId: item.id,
      quantidade: 3,
    });
    expect(alterado.ok).toBe(true);
    let comanda = await prisma.comanda.findUnique({ where: { id: primeiro.comandaId! } });
    expect(Number(comanda?.subtotal)).toBe(300);

    const removido = await removerItem({ comandaId: primeiro.comandaId, comandaItemId: item.id });
    expect(removido.ok).toBe(true);
    comanda = await prisma.comanda.findUnique({ where: { id: primeiro.comandaId! } });
    expect(Number(comanda?.subtotal)).toBe(0);
    expect(Number(comanda?.total)).toBe(0);
  });

  it('Scenario "Desconto maior que o subtotal" via aplicarDesconto — total nunca negativo', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemBId, quantidade: 1 } }); // subtotal 50
    const resultado = await aplicarDesconto({
      comandaId: primeiro.comandaId,
      desconto: { tipo: "FIXO", valor: 80 },
    });
    expect(resultado.ok).toBe(true);

    const comanda = await prisma.comanda.findUnique({ where: { id: primeiro.comandaId! } });
    expect(Number(comanda?.total)).toBe(0);
  });

  it('Requirement "Retomar comanda aberta" — reabrir pelo mesmo agendamento reaproveita a mesma comanda', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const agendamento = await prisma.agendamento.create({
      data: { clinicaId, pacienteId, veterinarioId, dataHoraInicio: new Date() },
    });

    const primeiro = await adicionarItem({
      agendamentoId: agendamento.id,
      item: { itemCatalogoId: itemAId, quantidade: 1 },
    });
    expect(primeiro.ok).toBe(true);

    // Scenario "Reabrir agendamento com comanda aberta no mesmo dia": nova
    // chamada com o mesmo agendamentoId, sem passar comandaId.
    const segundo = await adicionarItem({
      agendamentoId: agendamento.id,
      item: { itemCatalogoId: itemBId, quantidade: 1 },
    });
    expect(segundo.ok).toBe(true);
    expect(segundo.comandaId).toBe(primeiro.comandaId);

    const totalDeComandas = await prisma.comanda.count({ where: { agendamentoId: agendamento.id } });
    expect(totalDeComandas).toBe(1); // nunca duas comandas para o mesmo agendamento
  });

  it('Requirement "Imutabilidade de comanda finalizada ou cancelada" — bloqueia alteração após finalizar', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemAId, quantidade: 1 } });
    const finalizado = await finalizarComanda({ comandaId: primeiro.comandaId, formaPagamento: "PIX" });
    expect(finalizado.ok).toBe(true);

    const tentativaAdicionar = await adicionarItem({
      comandaId: primeiro.comandaId,
      item: { itemCatalogoId: itemBId, quantidade: 1 },
    });
    expect(tentativaAdicionar.ok).toBe(false);

    const tentativaDescarte = await descartarComanda({ comandaId: primeiro.comandaId, motivo: "teste" });
    expect(tentativaDescarte.ok).toBe(false);
  });

  it('Scenario "Finalizar sem itens" — bloqueia a finalização', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemAId, quantidade: 1 } });
    const item = await prisma.comandaItem.findFirstOrThrow({ where: { comandaId: primeiro.comandaId } });
    await removerItem({ comandaId: primeiro.comandaId, comandaItemId: item.id });

    const resultado = await finalizarComanda({ comandaId: primeiro.comandaId, formaPagamento: "PIX" });
    expect(resultado.ok).toBe(false);
  });

  it('Scenario "Finalizar comanda conclui o agendamento" (spec de agendamento)', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const agendamento = await prisma.agendamento.create({
      data: { clinicaId, pacienteId, veterinarioId, dataHoraInicio: new Date() },
    });
    const primeiro = await adicionarItem({
      agendamentoId: agendamento.id,
      item: { itemCatalogoId: itemAId, quantidade: 1 },
    });

    const finalizado = await finalizarComanda({ comandaId: primeiro.comandaId, formaPagamento: "DINHEIRO" });
    expect(finalizado.ok).toBe(true);

    const agendamentoAtualizado = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
    expect(agendamentoAtualizado?.status).toBe("CONCLUIDO");
  });

  it('Scenario "Descartar sem motivo" — bloqueia a ação', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemAId, quantidade: 1 } });
    const resultado = await descartarComanda({ comandaId: primeiro.comandaId, motivo: "" });
    expect(resultado.ok).toBe(false);

    const comanda = await prisma.comanda.findUnique({ where: { id: primeiro.comandaId! } });
    expect(comanda?.status).toBe("ABERTA"); // permanece inalterada
  });

  it('Scenario "Descartar comanda vinculada a um agendamento" — comanda e agendamento cancelados', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const agendamento = await prisma.agendamento.create({
      data: { clinicaId, pacienteId, veterinarioId, dataHoraInicio: new Date() },
    });
    const primeiro = await adicionarItem({
      agendamentoId: agendamento.id,
      item: { itemCatalogoId: itemAId, quantidade: 1 },
    });

    const descartado = await descartarComanda({ comandaId: primeiro.comandaId, motivo: "Cliente desistiu" });
    expect(descartado.ok).toBe(true);

    const comanda = await prisma.comanda.findUnique({ where: { id: primeiro.comandaId! } });
    expect(comanda?.status).toBe("CANCELADA");
    expect(comanda?.motivoCancelamento).toBe("Cliente desistiu");

    const agendamentoAtualizado = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
    expect(agendamentoAtualizado?.status).toBe("CANCELADO");
  });

  it('Scenario "Descartar comanda avulsa" — sem efeito em agendamento, pois não existe nenhum', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const primeiro = await adicionarItem({ item: { itemCatalogoId: itemAId, quantidade: 1 } });
    const descartado = await descartarComanda({ comandaId: primeiro.comandaId, motivo: "Encaixe cancelado" });
    expect(descartado.ok).toBe(true);

    const comanda = await prisma.comanda.findUnique({ where: { id: primeiro.comandaId! } });
    expect(comanda?.status).toBe("CANCELADA");
    expect(comanda?.agendamentoId).toBeNull();
  });

  it("comanda de outra clínica não é acessível por ID direto (isolamento)", async () => {
    clinicaAtivaMock.current = String(clinicaOutraId);
    const criada = await adicionarItem({ item: { itemCatalogoId: itemOutraClinicaId, quantidade: 1 } });
    expect(criada.ok).toBe(true);

    // Sessão ativa agora é a clínica A, mas o ID da comanda é da clínica B.
    clinicaAtivaMock.current = String(clinicaId);
    const tentativa = await aplicarDesconto({
      comandaId: criada.comandaId!,
      desconto: { tipo: "FIXO", valor: 10 },
    });
    expect(tentativa.ok).toBe(false);

    clinicaAtivaMock.current = String(clinicaOutraId);
    const aindaSemDesconto = await prisma.comanda.findUnique({ where: { id: criada.comandaId! } });
    expect(Number(aindaSemDesconto?.desconto)).toBe(0);
  });
});
