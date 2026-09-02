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
});
