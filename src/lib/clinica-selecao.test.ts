// Testes de src/lib/clinica-selecao.ts (capability: autenticacao-multi-clinica,
// tasks 2.3 e 2.4 — a lógica de resolução automática de clinicaAtivaId no
// login e de revalidação de vínculo numa troca de clínica).
//
// PRÉ-REQUISITO: Postgres do docker-compose rodando e migrado
// (`docker compose up` + `npx prisma migrate dev`). Não há banco de teste
// separado neste projeto — os testes criam e limpam suas próprias linhas no
// mesmo DATABASE_URL do dev, no mesmo padrão de prisma/seed.ts.

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  resolverClinicaAtivaNoLogin,
  usuarioTemVinculoComClinica,
  listarClinicasDoUsuario,
} from "@/lib/clinica-selecao";

describe("clinica-selecao", () => {
  const clinicaUnicaId = "test-clinica-selecao-unica";
  const clinicaExtraId = "test-clinica-selecao-extra";
  const clinicaSemVinculoId = "test-clinica-selecao-sem-vinculo";
  let usuarioUmVinculoId: string;
  let usuarioDoisVinculosId: string;

  beforeAll(async () => {
    await prisma.clinica.createMany({
      data: [
        { id: clinicaUnicaId, nome: "Test Clínica Única" },
        { id: clinicaExtraId, nome: "Test Clínica Extra" },
        { id: clinicaSemVinculoId, nome: "Test Clínica Sem Vínculo" },
      ],
      skipDuplicates: true,
    });

    const senhaHash = await bcrypt.hash("senha-teste", 10);

    const usuarioUmVinculo = await prisma.usuario.create({
      data: { nome: "Usuário 1 Vínculo", email: "um-vinculo@teste.matilha", senhaHash },
    });
    usuarioUmVinculoId = usuarioUmVinculo.id;
    await prisma.usuarioClinica.create({
      data: { usuarioId: usuarioUmVinculoId, clinicaId: clinicaUnicaId, papel: "ADMIN" },
    });

    const usuarioDoisVinculos = await prisma.usuario.create({
      data: { nome: "Usuário 2 Vínculos", email: "dois-vinculos@teste.matilha", senhaHash },
    });
    usuarioDoisVinculosId = usuarioDoisVinculos.id;
    await prisma.usuarioClinica.createMany({
      data: [
        { usuarioId: usuarioDoisVinculosId, clinicaId: clinicaUnicaId, papel: "VETERINARIO" },
        { usuarioId: usuarioDoisVinculosId, clinicaId: clinicaExtraId, papel: "RECEPCAO" },
      ],
    });
  });

  afterAll(async () => {
    await prisma.usuarioClinica.deleteMany({
      where: { usuarioId: { in: [usuarioUmVinculoId, usuarioDoisVinculosId] } },
    });
    await prisma.usuario.deleteMany({
      where: { id: { in: [usuarioUmVinculoId, usuarioDoisVinculosId] } },
    });
    await prisma.clinica.deleteMany({
      where: { id: { in: [clinicaUnicaId, clinicaExtraId, clinicaSemVinculoId] } },
    });
  });

  it("resolve a clinicaAtiva automaticamente quando o usuário tem 1 único vínculo (task 2.3)", async () => {
    const clinicaId = await resolverClinicaAtivaNoLogin(usuarioUmVinculoId);
    expect(clinicaId).toBe(clinicaUnicaId);
  });

  it("deixa a clinicaAtiva vazia quando o usuário tem mais de 1 vínculo", async () => {
    const clinicaId = await resolverClinicaAtivaNoLogin(usuarioDoisVinculosId);
    expect(clinicaId).toBeUndefined();
  });

  it("lista as clínicas do usuário com o papel em cada uma", async () => {
    const clinicas = await listarClinicasDoUsuario(usuarioDoisVinculosId);
    expect(clinicas).toHaveLength(2);
    expect(clinicas.find((c) => c.clinicaId === clinicaExtraId)?.papel).toBe("RECEPCAO");
  });

  it("confirma vínculo existente", async () => {
    const temVinculo = await usuarioTemVinculoComClinica(usuarioDoisVinculosId, clinicaExtraId);
    expect(temVinculo).toBe(true);
  });

  it("rejeita clinicaId sem vínculo — candidata a troca inválida (task 2.4)", async () => {
    const temVinculo = await usuarioTemVinculoComClinica(usuarioDoisVinculosId, clinicaSemVinculoId);
    expect(temVinculo).toBe(false);
  });
});
