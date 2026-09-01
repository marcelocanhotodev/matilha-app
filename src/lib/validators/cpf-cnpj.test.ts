// Testes de src/lib/validators/cpf-cnpj.ts (capability: clientes, task 2.1).

import { describe, it, expect } from "vitest";
import { normalizarDigitos, cpfValido, cnpjValido } from "@/lib/validators/cpf-cnpj";

describe("normalizarDigitos", () => {
  it("remove pontuação, mantendo só os dígitos", () => {
    expect(normalizarDigitos("384.526.170-62")).toBe("38452617062");
    expect(normalizarDigitos("11.222.333/0001-81")).toBe("11222333000181");
  });

  it("aceita entrada já normalizada sem alterar", () => {
    expect(normalizarDigitos("38452617062")).toBe("38452617062");
  });

  it("trata null/undefined como string vazia", () => {
    expect(normalizarDigitos(null)).toBe("");
    expect(normalizarDigitos(undefined)).toBe("");
  });
});

describe("cpfValido", () => {
  it("aceita CPF válido, com ou sem máscara", () => {
    expect(cpfValido("384.526.170-62")).toBe(true);
    expect(cpfValido("38452617062")).toBe(true);
  });

  it("rejeita CPF com dígito verificador incorreto", () => {
    expect(cpfValido("384.526.170-63")).toBe(false);
  });

  it("rejeita CPF com todos os dígitos iguais", () => {
    expect(cpfValido("111.111.111-11")).toBe(false);
  });

  it("rejeita CPF com quantidade de dígitos errada", () => {
    expect(cpfValido("123456")).toBe(false);
  });

  it("rejeita entrada vazia", () => {
    expect(cpfValido("")).toBe(false);
    expect(cpfValido(null)).toBe(false);
  });
});

describe("cnpjValido", () => {
  it("aceita CNPJ válido, com ou sem máscara", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11222333000181")).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador incorreto", () => {
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita CNPJ com todos os dígitos iguais", () => {
    expect(cnpjValido("11.111.111/1111-11")).toBe(false);
  });

  it("rejeita CNPJ com quantidade de dígitos errada", () => {
    expect(cnpjValido("123456")).toBe(false);
  });

  it("rejeita entrada vazia", () => {
    expect(cnpjValido("")).toBe(false);
    expect(cnpjValido(null)).toBe(false);
  });
});
