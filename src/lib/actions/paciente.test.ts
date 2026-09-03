// Testes de src/lib/actions/paciente.ts (capability: pacientes, tasks 3.1,
// 3.2, 3.3). Mocka @/lib/auth para simular uma sessão com `clinicaAtivaId`,
// mesmo padrão de src/lib/actions/cliente.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const clinicaAtivaMock = { current: "" };

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "usuario-teste", clinicaAtivaId: clinicaAtivaMock.current } }),
}));

const { criarPaciente, editarPaciente, inativarPaciente, reativarPaciente } = await import(
  "@/lib/actions/paciente"
);

describe("Server Actions de Paciente", () => {
  let clinicaAId: number;
  let clinicaBId: number;
  let clienteAId: number;

  beforeAll(async () => {
    const clinicaA = await prisma.clinica.create({ data: { nome: "Test Paciente Action Clínica A" } });
    const clinicaB = await prisma.clinica.create({ data: { nome: "Test Paciente Action Clínica B" } });
    clinicaAId = clinicaA.id;
    clinicaBId = clinicaB.id;

    const clienteA = await prisma.cliente.create({
      data: {
        clinicaId: clinicaAId,
        tipo: "FISICA",
        nome: "Marina Silva",
        email: "marina.silva@teste.matilha",
      },
    });
    clienteAId = clienteA.id;
  });

  afterAll(async () => {
    // Comanda referencia clinicaId com onDelete: Restrict — precisa sumir
    // antes da clínica (e do usuário/veterinário criados no teste 3.3).
    const comandas = await prisma.comanda.findMany({
      where: { clinicaId: { in: [clinicaAId, clinicaBId] } },
      select: { id: true, veterinarioId: true },
    });
    await prisma.comanda.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.usuario.deleteMany({
      where: { id: { in: comandas.map((c) => c.veterinarioId).filter((id): id is number => !!id) } },
    });
    await prisma.paciente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("criarPaciente cria o paciente na clinicaId ativa da sessão (task 3.1)", async () => {
    clinicaAtivaMock.current = String(clinicaAId);

    const resultado = await criarPaciente({
      clienteId: clienteAId,
      nome: "Thor",
      especie: "CAO",
      raca: "Golden Retriever",
      sexo: "MACHO",
      peso: 32.5,
    });

    expect(resultado.ok).toBe(true);
    const paciente = await prisma.paciente.findUnique({ where: { id: resultado.pacienteId } });
    expect(paciente?.clinicaId).toBe(clinicaAId);
    expect(paciente?.clienteId).toBe(clienteAId);
    expect(paciente?.ativo).toBe(true);
    expect(paciente?.castrado).toBe("NAO_INFORMADO");
  });

  it('Scenario "Nenhum cliente cadastrado ainda" — clienteId inexistente é rejeitado (task 3.2)', async () => {
    clinicaAtivaMock.current = String(clinicaAId);

    const resultado = await criarPaciente({
      clienteId: "cliente-que-nao-existe",
      nome: "Bidu",
      especie: "CAO",
      raca: "Vira-lata",
      sexo: "MACHO",
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBeTruthy();
  });

  it("criarPaciente rejeita clienteId de outra clínica, mesmo passando o ID direto (isolamento, task 3.2)", async () => {
    clinicaAtivaMock.current = String(clinicaBId);
    const clienteB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Tutor da Clínica B",
        email: "tutor-b-paciente@teste.matilha",
      },
    });

    // Sessão ativa é A, mas o clienteId passado pertence a B.
    clinicaAtivaMock.current = String(clinicaAId);
    const resultado = await criarPaciente({
      clienteId: clienteB.id,
      nome: "Mimi",
      especie: "GATO",
      raca: "Siamês",
      sexo: "FEMEA",
    });

    expect(resultado.ok).toBe(false);
  });

  it("criarPaciente rejeita clienteId de um cliente inativo (task 3.2)", async () => {
    clinicaAtivaMock.current = String(clinicaAId);
    const clienteInativo = await prisma.cliente.create({
      data: {
        clinicaId: clinicaAId,
        tipo: "FISICA",
        nome: "Cliente Inativo",
        email: "cliente-inativo@teste.matilha",
        ativo: false,
      },
    });

    const resultado = await criarPaciente({
      clienteId: clienteInativo.id,
      nome: "Amora",
      especie: "GATO",
      raca: "SRD (sem raça definida)",
      sexo: "FEMEA",
    });

    expect(resultado.ok).toBe(false);
  });

  it('Scenario "Inativar paciente com agendamentos e comandas vinculados" (task 3.3)', async () => {
    clinicaAtivaMock.current = String(clinicaAId);

    const criado = await criarPaciente({
      clienteId: clienteAId,
      nome: "Nina",
      especie: "CAO",
      raca: "Beagle",
      sexo: "FEMEA",
    });
    const pacienteId = criado.pacienteId!;

    const usuario = await prisma.usuario.create({
      data: { nome: "Vet Teste", email: `vet-${pacienteId}@teste.matilha`, senhaHash: "x" },
    });
    const comanda = await prisma.comanda.create({
      data: {
        clinicaId: clinicaAId,
        pacienteId,
        clienteId: clienteAId,
        veterinarioId: usuario.id,
        subtotal: 100,
        total: 100,
        formaPagamento: "PIX",
      },
    });

    const inativado = await inativarPaciente(pacienteId);
    expect(inativado.ok).toBe(true);

    const pacienteInativo = await prisma.paciente.findUnique({ where: { id: pacienteId } });
    expect(pacienteInativo?.ativo).toBe(false);

    // Nada foi apagado ou desvinculado.
    const comandaAindaExiste = await prisma.comanda.findUnique({ where: { id: comanda.id } });
    expect(comandaAindaExiste?.pacienteId).toBe(pacienteId);

    const reativado = await reativarPaciente(pacienteId);
    expect(reativado.ok).toBe(true);
    const pacienteReativado = await prisma.paciente.findUnique({ where: { id: pacienteId } });
    expect(pacienteReativado?.ativo).toBe(true);
  });

  it("inativarPaciente não afeta paciente de outra clínica, mesmo passando o ID direto (isolamento, task 3.1)", async () => {
    clinicaAtivaMock.current = String(clinicaBId);
    const clienteB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Outro Tutor da Clínica B",
        email: "outro-tutor-b@teste.matilha",
      },
    });
    const pacienteDaClinicaB = await prisma.paciente.create({
      data: {
        clinicaId: clinicaBId,
        clienteId: clienteB.id,
        nome: "Rex",
        especie: "CAO",
        raca: "Pastor Alemão",
        sexo: "MACHO",
      },
    });

    // Sessão ativa é A, mas o ID passado pertence a B.
    clinicaAtivaMock.current = String(clinicaAId);
    const resultado = await inativarPaciente(pacienteDaClinicaB.id);

    expect(resultado.ok).toBe(false);
    const aindaAtivo = await prisma.paciente.findUnique({ where: { id: pacienteDaClinicaB.id } });
    expect(aindaAtivo?.ativo).toBe(true); // não foi alterado
  });

  it("editarPaciente não edita paciente de outra clínica, mesmo passando o ID direto (isolamento, task 3.1)", async () => {
    clinicaAtivaMock.current = String(clinicaBId);
    const clienteB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Mais um Tutor da Clínica B",
        email: "mais-um-tutor-b@teste.matilha",
      },
    });
    const pacienteDaClinicaB = await prisma.paciente.create({
      data: {
        clinicaId: clinicaBId,
        clienteId: clienteB.id,
        nome: "Amora",
        especie: "GATO",
        raca: "Persa",
        sexo: "FEMEA",
      },
    });

    clinicaAtivaMock.current = String(clinicaAId);
    const resultado = await editarPaciente(pacienteDaClinicaB.id, {
      clienteId: clienteB.id,
      nome: "Nome Alterado Indevidamente",
      especie: "GATO",
      raca: "Persa",
      sexo: "FEMEA",
    });

    expect(resultado.ok).toBe(false);
    const inalterado = await prisma.paciente.findUnique({ where: { id: pacienteDaClinicaB.id } });
    expect(inalterado?.nome).toBe("Amora");
  });
});
