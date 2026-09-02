// Testes de src/lib/actions/agendamento.ts (capability: agendamento, task
// 5.1). Mocka @/lib/auth para simular uma sessão com `clinicaAtivaId`,
// mesmo padrão de src/lib/actions/item-catalogo.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const clinicaAtivaMock = { current: "" };

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "usuario-teste", clinicaAtivaId: clinicaAtivaMock.current } }),
}));

const { selecionarAgendamento } = await import("@/lib/actions/agendamento");

describe("selecionarAgendamento", () => {
  const clinicaId = "test-agendamento-action-clinica-a";
  let veterinarioId: string;
  let pacienteId: string;

  beforeAll(async () => {
    await prisma.clinica.create({ data: { id: clinicaId, nome: "Test Agendamento Action Clínica A" } });

    const veterinario = await prisma.usuario.create({
      data: { nome: "Vet Teste Agendamento", email: `vet-agendamento-${Date.now()}@teste.matilha`, senhaHash: "x" },
    });
    veterinarioId = veterinario.id;

    const cliente = await prisma.cliente.create({
      data: { clinicaId, tipo: "FISICA", nome: "Tutora Teste", email: `tutora-agendamento-${Date.now()}@teste.matilha` },
    });
    const paciente = await prisma.paciente.create({
      data: { clinicaId, clienteId: cliente.id, nome: "Mimi", especie: "GATO", raca: "SRD", sexo: "FEMEA" },
    });
    pacienteId = paciente.id;

    clinicaAtivaMock.current = clinicaId;
  });

  afterAll(async () => {
    await prisma.agendamento.deleteMany({ where: { clinicaId } });
    await prisma.paciente.deleteMany({ where: { clinicaId } });
    await prisma.cliente.deleteMany({ where: { clinicaId } });
    await prisma.usuario.deleteMany({ where: { id: veterinarioId } });
    await prisma.clinica.deleteMany({ where: { id: clinicaId } });
  });

  it('Scenario "Selecionar na fila inicia o atendimento" — aguardando vira em atendimento', async () => {
    const agendamento = await prisma.agendamento.create({
      data: { clinicaId, pacienteId, veterinarioId, dataHoraInicio: new Date(), status: "AGUARDANDO" },
    });

    const resultado = await selecionarAgendamento({ agendamentoId: agendamento.id });
    expect(resultado.ok).toBe(true);

    const atualizado = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
    expect(atualizado?.status).toBe("EM_ATENDIMENTO");
  });

  it('Scenario "Selecionar agendamento já concluído ou cancelado não regride o status" — concluído', async () => {
    const agendamento = await prisma.agendamento.create({
      data: { clinicaId, pacienteId, veterinarioId, dataHoraInicio: new Date(), status: "CONCLUIDO" },
    });

    const resultado = await selecionarAgendamento({ agendamentoId: agendamento.id });
    expect(resultado.ok).toBe(true);

    const atualizado = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
    expect(atualizado?.status).toBe("CONCLUIDO"); // nunca volta pra em atendimento
  });

  it('Scenario "Selecionar agendamento já concluído ou cancelado não regride o status" — cancelado', async () => {
    const agendamento = await prisma.agendamento.create({
      data: { clinicaId, pacienteId, veterinarioId, dataHoraInicio: new Date(), status: "CANCELADO" },
    });

    const resultado = await selecionarAgendamento({ agendamentoId: agendamento.id });
    expect(resultado.ok).toBe(true);

    const atualizado = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
    expect(atualizado?.status).toBe("CANCELADO");
  });

  it("não transiciona agendamento de outra clínica, mesmo passando o ID direto (isolamento)", async () => {
    const outraClinicaId = "test-agendamento-action-clinica-b";
    await prisma.clinica.create({ data: { id: outraClinicaId, nome: "Test Agendamento Action Clínica B" } });
    const clienteOutra = await prisma.cliente.create({
      data: { clinicaId: outraClinicaId, tipo: "FISICA", nome: "Tutor B", email: `tutor-b-${Date.now()}@teste.matilha` },
    });
    const pacienteOutra = await prisma.paciente.create({
      data: { clinicaId: outraClinicaId, clienteId: clienteOutra.id, nome: "Bidu", especie: "CAO", raca: "SRD", sexo: "MACHO" },
    });
    const agendamentoOutra = await prisma.agendamento.create({
      data: {
        clinicaId: outraClinicaId,
        pacienteId: pacienteOutra.id,
        veterinarioId,
        dataHoraInicio: new Date(),
        status: "AGUARDANDO",
      },
    });

    // Sessão ativa é a clínica A, mas o agendamento é da clínica B.
    const resultado = await selecionarAgendamento({ agendamentoId: agendamentoOutra.id });
    expect(resultado.ok).toBe(false);

    const inalterado = await prisma.agendamento.findUnique({ where: { id: agendamentoOutra.id } });
    expect(inalterado?.status).toBe("AGUARDANDO");

    await prisma.agendamento.deleteMany({ where: { clinicaId: outraClinicaId } });
    await prisma.paciente.deleteMany({ where: { clinicaId: outraClinicaId } });
    await prisma.cliente.deleteMany({ where: { clinicaId: outraClinicaId } });
    await prisma.clinica.deleteMany({ where: { id: outraClinicaId } });
  });
});
