// Testes de src/lib/validators/comanda.ts (capability: atendimento-comanda,
// tasks 2.1 e 2.2).

import { describe, it, expect } from "vitest";
import {
  itemCarrinhoInputSchema,
  descontoInputSchema,
  motivoDescarteSchema,
  calcularDescontoETotal,
} from "@/lib/validators/comanda";

describe("itemCarrinhoInputSchema", () => {
  it("quantidade zero é rejeitada", () => {
    const parse = itemCarrinhoInputSchema.safeParse({ itemCatalogoId: 1, quantidade: 0 });
    expect(parse.success).toBe(false);
  });

  it("quantidade negativa é rejeitada", () => {
    const parse = itemCarrinhoInputSchema.safeParse({ itemCatalogoId: 1, quantidade: -2 });
    expect(parse.success).toBe(false);
  });

  it("quantidade fracionária é rejeitada", () => {
    const parse = itemCarrinhoInputSchema.safeParse({ itemCatalogoId: 1, quantidade: 1.5 });
    expect(parse.success).toBe(false);
  });

  it("payload válido é aceito", () => {
    const parse = itemCarrinhoInputSchema.safeParse({ itemCatalogoId: 1, quantidade: 2 });
    expect(parse.success).toBe(true);
  });
});

describe("descontoInputSchema", () => {
  it("desconto negativo é rejeitado", () => {
    const parse = descontoInputSchema.safeParse({ tipo: "FIXO", valor: -10 });
    expect(parse.success).toBe(false);
  });

  it("desconto zero é válido", () => {
    const parse = descontoInputSchema.safeParse({ tipo: "PERCENTUAL", valor: 0 });
    expect(parse.success).toBe(true);
  });
});

describe("motivoDescarteSchema", () => {
  it("motivo vazio é rejeitado", () => {
    const parse = motivoDescarteSchema.safeParse({ motivo: "" });
    expect(parse.success).toBe(false);
  });

  it("motivo só com espaços é rejeitado (trim antes de validar)", () => {
    const parse = motivoDescarteSchema.safeParse({ motivo: "   " });
    expect(parse.success).toBe(false);
  });

  it("motivo preenchido é aceito, sem mínimo de caracteres", () => {
    const parse = motivoDescarteSchema.safeParse({ motivo: "ok" });
    expect(parse.success).toBe(true);
  });
});

describe("calcularDescontoETotal", () => {
  it('Scenario "Desconto maior que o subtotal" — desconto fixo maior que o subtotal nunca deixa total negativo', () => {
    const { descontoEmReais, total } = calcularDescontoETotal(50, { tipo: "FIXO", valor: 80 });
    expect(descontoEmReais).toBe(80);
    expect(total).toBe(0);
  });

  it("desconto percentual calcula o valor efetivo em reais", () => {
    const { descontoEmReais, total } = calcularDescontoETotal(200, { tipo: "PERCENTUAL", valor: 10 });
    expect(descontoEmReais).toBe(20);
    expect(total).toBe(180);
  });

  it("desconto percentual maior que 100% também nunca deixa total negativo", () => {
    const { total } = calcularDescontoETotal(100, { tipo: "PERCENTUAL", valor: 150 });
    expect(total).toBe(0);
  });

  it("sem desconto, total igual ao subtotal", () => {
    const { total } = calcularDescontoETotal(120, { tipo: "FIXO", valor: 0 });
    expect(total).toBe(120);
  });
});
