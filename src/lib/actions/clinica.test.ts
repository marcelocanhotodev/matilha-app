// Testes de src/lib/actions/clinica.ts (capability: autenticacao-multi-
// clinica, tasks 4.1 e 4.2). Mocka @/lib/auth para simular uma sessão sem
// precisar de cookies/request reais — a Server Action em si só orquestra
// auth() + usuarioTemVinculoComClinica (já coberto fim-a-fim aqui).
//
// PRÉ-REQUISITO: mesmo do clinica-selecao.test.ts — Postgres do docker-
// compose rodando e migrado.

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const usuarioIdMock = { current: "" };

vi.mock("@/lib/auth", () => ({
  auth: async () => ({ user: { id: usuarioIdMock.current } }),
}));

const { selecionarClinica } = await import("@/lib/actions/clinica");

describe("selecionarClinica (Server Action)", () => {
  const clinicaComVinculoId = "test-action-clinica-com-vinculo";
  const clinicaSemVinculoId = "test-action-clinica-sem-vinculo";
  let usuarioId: string;

  beforeAll(async () => {
    await prisma.clinica.createMany({
      data: [
        { id: clinicaComVinculoId, nome: "Test Action Clínica Com Vínculo" },
        { id: clinicaSemVinculoId, nome: "Test Action Clínica Sem Vínculo" },
      ],
      skipDuplicates: true,
    });

    const senhaHash = await bcrypt.hash("senha-teste", 10);
    const usuario = await prisma.usuario.create({
      data: { nome: "Usuário Action", email: "usuario-action@teste.matilha", senhaHash },
    });
    usuarioId = usuario.id;
    usuarioIdMock.current = usuarioId;

    await prisma.usuarioClinica.create({
      data: { usuarioId, clinicaId: clinicaComVinculoId, papel: "ADMIN" },
    });
  });

  afterAll(async () => {
    await prisma.usuarioClinica.deleteMany({ where: { usuarioId } });
    await prisma.usuario.delete({ where: { id: usuarioId } });
    await prisma.clinica.deleteMany({
      where: { id: { in: [clinicaComVinculoId, clinicaSemVinculoId] } },
    });
  });

  it("aceita a troca quando o usuário tem vínculo com a clínica (task 4.1)", async () => {
    const resultado = await selecionarClinica(clinicaComVinculoId);
    expect(resultado.ok).toBe(true);
  });

  it("rejeita a troca quando o usuário não tem vínculo com a clínica (task 4.2)", async () => {
    const resultado = await selecionarClinica(clinicaSemVinculoId);
    expect(resultado.ok).toBe(false);
    expect(resultado.erro).toBeTruthy();
  });
});
