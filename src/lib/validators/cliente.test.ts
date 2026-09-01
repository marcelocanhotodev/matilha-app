// Testes de src/lib/validators/cliente.ts (capability: clientes, tasks
// 2.2/2.3) — cobrem os Scenarios de openspec/specs/clientes/spec.md.

import { describe, it, expect } from "vitest";
import { emailClienteSchema, clienteInputSchema } from "@/lib/validators/cliente";

describe("emailClienteSchema", () => {
  it("aceita e-mail em formato válido", () => {
    expect(emailClienteSchema.safeParse("voce@email.com").success).toBe(true);
  });

  it("rejeita e-mail em formato inválido (Scenario: E-mail em formato inválido)", () => {
    expect(emailClienteSchema.safeParse("não-é-email").success).toBe(false);
  });

  it("rejeita e-mail vazio", () => {
    expect(emailClienteSchema.safeParse("").success).toBe(false);
  });
});

describe("clienteInputSchema — pessoa física", () => {
  const base = {
    tipo: "FISICA" as const,
    nome: "Marina Silva",
    cpf: "384.526.170-62",
    email: "marina.silva@gmail.com",
    celular: "(14) 99123-4521",
  };

  it("Scenario: Cadastro válido de pessoa física", () => {
    const resultado = clienteInputSchema.safeParse(base);
    expect(resultado.success).toBe(true);
    if (resultado.success && resultado.data.tipo === "FISICA") {
      // CPF e celular saem normalizados (dígitos puros).
      expect(resultado.data.cpf).toBe("38452617062");
      expect(resultado.data.celular).toBe("14991234521");
    }
  });

  it("Scenario: CPF com dígito verificador inválido", () => {
    const resultado = clienteInputSchema.safeParse({ ...base, cpf: "384.526.170-63" });
    expect(resultado.success).toBe(false);
  });

  it("rejeita nome vazio", () => {
    const resultado = clienteInputSchema.safeParse({ ...base, nome: "" });
    expect(resultado.success).toBe(false);
  });

  it("aceita nascimento ausente (opcional)", () => {
    const resultado = clienteInputSchema.safeParse(base);
    expect(resultado.success).toBe(true);
  });
});

describe("clienteInputSchema — pessoa jurídica", () => {
  const base = {
    tipo: "JURIDICA" as const,
    nome: "Pet Shop Amigo Fiel Ltda",
    cnpj: "11.222.333/0001-81",
    email: "contato@amigofiel.com.br",
  };

  it("Scenario: Cadastro válido de pessoa jurídica", () => {
    const resultado = clienteInputSchema.safeParse(base);
    expect(resultado.success).toBe(true);
    if (resultado.success && resultado.data.tipo === "JURIDICA") {
      expect(resultado.data.cnpj).toBe("11222333000181");
    }
  });

  it("rejeita CNPJ com dígito verificador inválido", () => {
    const resultado = clienteInputSchema.safeParse({ ...base, cnpj: "11.222.333/0001-82" });
    expect(resultado.success).toBe(false);
  });

  it("aceita inscrição estadual ausente (opcional)", () => {
    const resultado = clienteInputSchema.safeParse(base);
    expect(resultado.success).toBe(true);
  });
});
