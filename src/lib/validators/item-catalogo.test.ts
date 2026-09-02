// Testes de src/lib/validators/item-catalogo.ts (capability:
// catalogo-produtos-servicos, task 1.1).

import { describe, it, expect } from "vitest";
import { itemCatalogoInputSchema, categorias } from "@/lib/validators/item-catalogo";

const payloadValido = {
  nome: "Consulta de rotina",
  categoria: "SERVICO" as const,
  preco: 120,
  icone: "🩺",
};

describe("itemCatalogoInputSchema", () => {
  it('Scenario "Preço inválido" — preço negativo é rejeitado', () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, preco: -10 });
    expect(parse.success).toBe(false);
    if (!parse.success) {
      expect(parse.error.issues.some((i) => i.path.includes("preco"))).toBe(true);
    }
  });

  it('Scenario "Preço inválido" — preço não numérico é rejeitado', () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, preco: "abc" });
    expect(parse.success).toBe(false);
  });

  it("preço zero é válido", () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, preco: 0 });
    expect(parse.success).toBe(true);
  });

  it("ícone ausente (undefined) é válido — campo opcional", () => {
    const { icone: _icone, ...semIcone } = payloadValido;
    const parse = itemCatalogoInputSchema.safeParse(semIcone);
    expect(parse.success).toBe(true);
  });

  it("cadastro válido completo", () => {
    const parse = itemCatalogoInputSchema.safeParse(payloadValido);
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.preco).toBe(120);
      expect(parse.data.categoria).toBe("SERVICO");
    }
  });

  it("nome e categoria são obrigatórios", () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, nome: "" });
    expect(parse.success).toBe(false);
  });

  it("aceita as duas categorias do enum", () => {
    for (const categoria of categorias) {
      const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, categoria });
      expect(parse.success).toBe(true);
    }
  });

  it('Scenario "Duração padrão de um serviço" — grava a duração informada para serviço', () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, duracaoPadraoMinutos: 30 });
    expect(parse.success).toBe(true);
    if (parse.success) expect(parse.data.duracaoPadraoMinutos).toBe(30);
  });

  it('Scenario "Duração não se aplica a produto" — duração enviada é ignorada para produto', () => {
    const parse = itemCatalogoInputSchema.safeParse({
      ...payloadValido,
      categoria: "PRODUTO",
      duracaoPadraoMinutos: 30,
    });
    expect(parse.success).toBe(true);
    if (parse.success) expect(parse.data.duracaoPadraoMinutos).toBeUndefined();
  });

  it('Scenario "Duração padrão inválida" — zero é rejeitado', () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, duracaoPadraoMinutos: 0 });
    expect(parse.success).toBe(false);
  });

  it('Scenario "Duração padrão inválida" — negativo é rejeitado', () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, duracaoPadraoMinutos: -10 });
    expect(parse.success).toBe(false);
  });

  it('Scenario "Duração padrão inválida" — não numérico é rejeitado', () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, duracaoPadraoMinutos: "abc" });
    expect(parse.success).toBe(false);
  });

  it("duração ausente (string vazia) é válida — campo opcional", () => {
    const parse = itemCatalogoInputSchema.safeParse({ ...payloadValido, duracaoPadraoMinutos: "" });
    expect(parse.success).toBe(true);
    if (parse.success) expect(parse.data.duracaoPadraoMinutos).toBeUndefined();
  });
});
