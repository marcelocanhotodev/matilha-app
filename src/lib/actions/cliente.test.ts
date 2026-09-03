// Testes de src/lib/actions/cliente.ts (capability: clientes, tasks 3.1,
// 3.2, 3.3). Mocka @/lib/auth para simular uma sessão com `clinicaAtivaId`,
// mesmo padrão de src/lib/actions/clinica.test.ts.
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { prisma } from "@/lib/prisma";

const clinicaAtivaMock = { current: "" };

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: "usuario-teste", clinicaAtivaId: clinicaAtivaMock.current } }),
}));

const { criarCliente, editarCliente, inativarCliente, reativarCliente } = await import(
  "@/lib/actions/cliente"
);

describe("Server Actions de Cliente", () => {
  let clinicaAId: number;
  let clinicaBId: number;

  beforeAll(async () => {
    const clinicaA = await prisma.clinica.create({ data: { nome: "Test Cliente Action Clínica A" } });
    const clinicaB = await prisma.clinica.create({ data: { nome: "Test Cliente Action Clínica B" } });
    clinicaAId = clinicaA.id;
    clinicaBId = clinicaB.id;
  });

  afterAll(async () => {
    await prisma.paciente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.cliente.deleteMany({ where: { clinicaId: { in: [clinicaAId, clinicaBId] } } });
    await prisma.clinica.deleteMany({ where: { id: { in: [clinicaAId, clinicaBId] } } });
  });

  it("criarCliente cria o cliente na clinicaId ativa da sessão (task 3.1)", async () => {
    clinicaAtivaMock.current = String(clinicaAId);

    const resultado = await criarCliente({
      tipo: "FISICA",
      nome: "Carlos Eduardo",
      cpf: "111.444.777-35",
      email: "carlos.eduardo@teste.matilha",
    });

    expect(resultado.ok).toBe(true);
    const cliente = await prisma.cliente.findUnique({ where: { id: resultado.clienteId } });
    expect(cliente?.clinicaId).toBe(clinicaAId);
    expect(cliente?.cpf).toBe("11144477735"); // normalizado
    expect(cliente?.ativo).toBe(true);
  });

  it('Scenario "Tentativa de cadastro com CPF já existente em formatação diferente" (task 3.2)', async () => {
    clinicaAtivaMock.current = String(clinicaAId);

    await criarCliente({
      tipo: "FISICA",
      nome: "Fernanda Lima",
      cpf: "222.555.888-46",
      email: "fernanda.lima@teste.matilha",
    });

    const duplicado = await criarCliente({
      tipo: "FISICA",
      nome: "Fernanda Lima (tentativa duplicada)",
      cpf: "22255588846", // mesmos dígitos, sem máscara
      email: "outro-email@teste.matilha",
    });

    expect(duplicado.ok).toBe(false);
    expect(duplicado.erro).toBeTruthy();

    const total = await prisma.cliente.count({ where: { clinicaId: clinicaAId, cpf: "22255588846" } });
    expect(total).toBe(1); // não criou um segundo registro
  });

  it('Scenario "Inativar cliente com pacientes e comandas vinculados" (task 3.3)', async () => {
    clinicaAtivaMock.current = String(clinicaAId);

    const criado = await criarCliente({
      tipo: "FISICA",
      nome: "Rafael Torres",
      cpf: "333.666.999-57",
      email: "rafael.torres@teste.matilha",
    });
    const clienteId = criado.clienteId!;

    const paciente = await prisma.paciente.create({
      data: {
        clinicaId: clinicaAId,
        clienteId,
        nome: "Luna",
        especie: "GATO",
        raca: "Persa",
        sexo: "FEMEA",
      },
    });

    const inativado = await inativarCliente(clienteId);
    expect(inativado.ok).toBe(true);

    const clienteInativo = await prisma.cliente.findUnique({ where: { id: clienteId } });
    expect(clienteInativo?.ativo).toBe(false);

    // Nada foi apagado ou desvinculado.
    const pacienteAindaExiste = await prisma.paciente.findUnique({ where: { id: paciente.id } });
    expect(pacienteAindaExiste?.clienteId).toBe(clienteId);

    const reativado = await reativarCliente(clienteId);
    expect(reativado.ok).toBe(true);
    const clienteReativado = await prisma.cliente.findUnique({ where: { id: clienteId } });
    expect(clienteReativado?.ativo).toBe(true);
  });

  it("inativarCliente não afeta cliente de outra clínica, mesmo passando o ID direto (isolamento, task 3.1)", async () => {
    clinicaAtivaMock.current = String(clinicaBId);
    const clienteDaClinicaB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Cliente da Clínica B",
        email: "cliente-b@teste.matilha",
      },
    });

    // Sessão ativa é A, mas o ID passado pertence a B.
    clinicaAtivaMock.current = String(clinicaAId);
    const resultado = await inativarCliente(clienteDaClinicaB.id);

    expect(resultado.ok).toBe(false);
    const aindaAtivo = await prisma.cliente.findUnique({ where: { id: clienteDaClinicaB.id } });
    expect(aindaAtivo?.ativo).toBe(true); // não foi alterado
  });

  it("editarCliente não edita cliente de outra clínica, mesmo passando o ID direto (isolamento, task 3.1)", async () => {
    clinicaAtivaMock.current = String(clinicaBId);
    const clienteDaClinicaB = await prisma.cliente.create({
      data: {
        clinicaId: clinicaBId,
        tipo: "FISICA",
        nome: "Outro Cliente da Clínica B",
        email: "outro-cliente-b@teste.matilha",
      },
    });

    clinicaAtivaMock.current = String(clinicaAId);
    const resultado = await editarCliente(clienteDaClinicaB.id, {
      tipo: "FISICA",
      nome: "Nome Alterado Indevidamente",
      cpf: "444.777.222-14",
      email: "hackeado@teste.matilha",
    });

    expect(resultado.ok).toBe(false);
    const inalterado = await prisma.cliente.findUnique({ where: { id: clienteDaClinicaB.id } });
    expect(inalterado?.nome).toBe("Outro Cliente da Clínica B");
  });
});
