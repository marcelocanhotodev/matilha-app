// Testes de src/lib/format/idade.ts (capability: pacientes, task 2.1).

import { describe, it, expect } from "vitest";
import { calcularIdadeLabel } from "@/lib/format/idade";

const HOJE_REF = new Date("2026-08-31T00:00:00");

describe("calcularIdadeLabel", () => {
  it("idade em meses quando menor que 1 ano", () => {
    expect(calcularIdadeLabel(new Date("2026-01-15T00:00:00"), HOJE_REF)).toBe("7 meses");
  });

  it("usa singular 'mês' para 1 mês", () => {
    expect(calcularIdadeLabel(new Date("2026-07-31T00:00:00"), HOJE_REF)).toBe("1 mês");
  });

  it("idade em anos exatos (sem meses restantes)", () => {
    expect(calcularIdadeLabel(new Date("2024-08-31T00:00:00"), HOJE_REF)).toBe("2 anos");
  });

  it("usa singular 'ano' para 1 ano exato", () => {
    expect(calcularIdadeLabel(new Date("2025-08-31T00:00:00"), HOJE_REF)).toBe("1 ano");
  });

  it("idade em anos e meses", () => {
    expect(calcularIdadeLabel(new Date("2022-04-15T00:00:00"), HOJE_REF)).toBe("4a 4m");
  });

  it("dia do aniversário ainda não chegou no mês corrente desconta um mês", () => {
    const hoje = new Date("2026-08-10T00:00:00"); // dia 10 < dia de nascimento (20)
    expect(calcularIdadeLabel(new Date("2023-05-20T00:00:00"), hoje)).toBe("3a 2m");
  });
});
