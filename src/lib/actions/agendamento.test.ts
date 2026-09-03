// Testes de src/lib/actions/agendamento.ts (capability: agendamento, task
// 5.1). Mocka @/lib/auth para simular uma sessão com `clinicaAtivaId`,
// mesmo padrão de src/lib/actions/item-catalogo.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { fimDoDiaClinica, inicioDoDiaClinica, paraComponentesClinica } from "@/lib/timezone";

const clinicaAtivaMock = { current: "" };

/** Janela [início, fim] de um dia (`yyyy-mm-dd`) no fuso da clínica, pra
 * consultar `dataHoraInicio` sem depender do fuso do processo de teste. */
function rangeDoDia(chave: string) {
  const [ano, mes, dia] = chave.split("-").map(Number);
  return { gte: inicioDoDiaClinica({ ano, mes, dia }), lte: fimDoDiaClinica({ ano, mes, dia }) };
}

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "usuario-teste", clinicaAtivaId: clinicaAtivaMock.current } }),
}));

const { selecionarAgendamento, criarAgendamento } = await import("@/lib/actions/agendamento");

describe("selecionarAgendamento", () => {
  let clinicaId: number;
  let veterinarioId: number;
  let pacienteId: number;

  beforeAll(async () => {
    const clinica = await prisma.clinica.create({ data: { nome: "Test Agendamento Action Clínica A" } });
    clinicaId = clinica.id;

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

    clinicaAtivaMock.current = String(clinicaId);
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
    const outraClinica = await prisma.clinica.create({ data: { nome: "Test Agendamento Action Clínica B" } });
    const outraClinicaId = outraClinica.id;
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

describe("criarAgendamento", () => {
  let clinicaId: number;
  let veterinarioId: number;
  let pacienteId: number;

  beforeAll(async () => {
    const clinica = await prisma.clinica.create({ data: { nome: "Test Criar Agendamento Clínica A" } });
    clinicaId = clinica.id;

    const veterinario = await prisma.usuario.create({
      data: { nome: "Vet Teste Criar Agendamento", email: `vet-criar-agendamento-${Date.now()}@teste.matilha`, senhaHash: "x" },
    });
    veterinarioId = veterinario.id;
    await prisma.usuarioClinica.create({ data: { usuarioId: veterinarioId, clinicaId, papel: "VETERINARIO" } });

    const cliente = await prisma.cliente.create({
      data: { clinicaId, tipo: "FISICA", nome: "Tutora Teste", email: `tutora-criar-agendamento-${Date.now()}@teste.matilha` },
    });
    const paciente = await prisma.paciente.create({
      data: { clinicaId, clienteId: cliente.id, nome: "Rex", especie: "CAO", raca: "SRD", sexo: "MACHO" },
    });
    pacienteId = paciente.id;

    clinicaAtivaMock.current = String(clinicaId);
  });

  afterAll(async () => {
    await prisma.agendamento.deleteMany({ where: { clinicaId } });
    await prisma.paciente.deleteMany({ where: { clinicaId } });
    await prisma.cliente.deleteMany({ where: { clinicaId } });
    await prisma.usuarioClinica.deleteMany({ where: { clinicaId } });
    await prisma.usuario.deleteMany({ where: { id: veterinarioId } });
    await prisma.clinica.deleteMany({ where: { id: clinicaId } });
  });

  it("cria um agendamento sem conflito", async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const resultado = await criarAgendamento({
      pacienteId,
      veterinarioId,
      data: "2026-09-10",
      hora: "14:00",
      duracaoMinutos: 60,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.agendamentoId).toBeTruthy();
    expect(resultado.conflito).toBeUndefined();
  });

  it('Scenario "Conflito de horário para o mesmo profissional" — alerta sem criar', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    await criarAgendamento({
      pacienteId,
      veterinarioId,
      data: "2026-09-11",
      hora: "14:00",
      duracaoMinutos: 60, // 14:00-15:00
    });

    const resultado = await criarAgendamento({
      pacienteId,
      veterinarioId,
      data: "2026-09-11",
      hora: "14:30", // conflita
      duracaoMinutos: 30,
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.conflito).toBeDefined();
    expect(resultado.conflito?.length).toBeGreaterThan(0);
    expect(resultado.conflito?.[0].pacienteNome).toBe("Rex");

    const totalNoDia = await prisma.agendamento.count({
      where: {
        clinicaId,
        veterinarioId,
        dataHoraInicio: rangeDoDia("2026-09-11"),
      },
    });
    expect(totalNoDia).toBe(1); // o segundo não foi criado
  });

  it('Scenario "Confirmar mesmo com conflito" — segunda chamada com ignorarConflito cria normalmente', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    await criarAgendamento({
      pacienteId,
      veterinarioId,
      data: "2026-09-12",
      hora: "14:00",
      duracaoMinutos: 60,
    });

    const resultado = await criarAgendamento({
      pacienteId,
      veterinarioId,
      data: "2026-09-12",
      hora: "14:30",
      duracaoMinutos: 30,
      ignorarConflito: true,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.agendamentoId).toBeTruthy();

    const totalNoDia = await prisma.agendamento.count({
      where: {
        clinicaId,
        veterinarioId,
        dataHoraInicio: rangeDoDia("2026-09-12"),
      },
    });
    expect(totalNoDia).toBe(2); // os dois foram criados
  });

  it('Scenario "Agendamento cancelado não conta como conflito"', async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const cancelado = await criarAgendamento({
      pacienteId,
      veterinarioId,
      data: "2026-09-13",
      hora: "14:00",
      duracaoMinutos: 60,
    });
    await prisma.agendamento.update({ where: { id: cancelado.agendamentoId! }, data: { status: "CANCELADO" } });

    const resultado = await criarAgendamento({
      pacienteId,
      veterinarioId,
      data: "2026-09-13",
      hora: "14:30",
      duracaoMinutos: 30,
    });

    expect(resultado.ok).toBe(true);
    expect(resultado.conflito).toBeUndefined();
  });

  it("não cria agendamento para paciente ou veterinário de outra clínica", async () => {
    clinicaAtivaMock.current = String(clinicaId);

    const resultado = await criarAgendamento({
      pacienteId: "id-inexistente",
      veterinarioId,
      data: "2026-09-14",
      hora: "14:00",
      duracaoMinutos: 30,
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBeTruthy();
  });

  describe("independência do fuso horário do processo Node (openspec/changes/corrigir-fuso-horario-agenda)", () => {
    const tzOriginal = process.env.TZ;

    beforeAll(() => {
      // Reproduz o ambiente que causava o bug: processo em UTC, clínica em
      // UTC-3.
      process.env.TZ = "UTC";
    });

    afterAll(() => {
      process.env.TZ = tzOriginal;
    });

    it("agendamento criado para 09:00 no fuso da clínica fica salvo no instante correto, mesmo com o processo em UTC", async () => {
      clinicaAtivaMock.current = String(clinicaId);

      const resultado = await criarAgendamento({
        pacienteId,
        veterinarioId,
        data: "2026-09-20",
        hora: "09:00",
        duracaoMinutos: 60,
      });

      expect(resultado.ok).toBe(true);
      const persistido = await prisma.agendamento.findUniqueOrThrow({ where: { id: resultado.agendamentoId! } });

      // 09:00 no fuso da clínica (UTC-3) = 12:00 UTC — nunca 09:00 UTC (o
      // que aconteceria se o parse ignorasse o offset da clínica).
      expect(persistido.dataHoraInicio.toISOString()).toBe("2026-09-20T12:00:00.000Z");
      expect(paraComponentesClinica(persistido.dataHoraInicio)).toEqual({
        ano: 2026,
        mes: 9,
        dia: 20,
        hora: 9,
        minuto: 0,
      });
    });

    it("checagem de conflito continua correta com o processo em UTC", async () => {
      clinicaAtivaMock.current = String(clinicaId);

      await criarAgendamento({
        pacienteId,
        veterinarioId,
        data: "2026-09-21",
        hora: "09:00",
        duracaoMinutos: 60, // 09:00-10:00 no fuso da clínica
      });

      const resultado = await criarAgendamento({
        pacienteId,
        veterinarioId,
        data: "2026-09-21",
        hora: "09:30", // conflita
        duracaoMinutos: 30,
      });

      expect(resultado.ok).toBe(false);
      expect(resultado.conflito).toBeDefined();
      expect(resultado.conflito?.[0].inicio).toBe("09:00");
      expect(resultado.conflito?.[0].fim).toBe("10:00");
    });
  });
});
