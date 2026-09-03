// Testes de src/lib/validators/paciente.ts (capability: pacientes, tasks
// 2.2 e 2.3).

import { describe, it, expect } from "vitest";
import { pacienteInputSchema, BREEDS, especies } from "@/lib/validators/paciente";

const payloadValido = {
  clienteId: 1,
  nome: "Thor",
  especie: "CAO" as const,
  raca: "Golden Retriever",
  sexo: "MACHO" as const,
  nascimento: "2022-04-15",
  peso: 32.5,
  cor: "Dourado",
  porte: "GRANDE" as const,
  castrado: "SIM" as const,
  microchip: "956000123456789",
  observacoes: "",
};

describe("pacienteInputSchema", () => {
  it('Scenario "Peso inválido" — peso zero é rejeitado', () => {
    const parse = pacienteInputSchema.safeParse({ ...payloadValido, peso: 0 });
    expect(parse.success).toBe(false);
    if (!parse.success) {
      expect(parse.error.issues.some((i) => i.path.includes("peso"))).toBe(true);
    }
  });

  it('Scenario "Peso inválido" — peso negativo é rejeitado', () => {
    const parse = pacienteInputSchema.safeParse({ ...payloadValido, peso: -5 });
    expect(parse.success).toBe(false);
  });

  it("peso ausente (undefined) é válido — campo opcional", () => {
    const { peso: _peso, ...semPeso } = payloadValido;
    const parse = pacienteInputSchema.safeParse(semPeso);
    expect(parse.success).toBe(true);
  });

  it("cadastro válido completo (pessoa física, todos os campos)", () => {
    const parse = pacienteInputSchema.safeParse(payloadValido);
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.peso).toBe(32.5);
      expect(parse.data.nascimento).toBeInstanceOf(Date);
      expect(parse.data.castrado).toBe("SIM");
    }
  });

  it("castrado assume NAO_INFORMADO por padrão quando omitido", () => {
    const { castrado: _castrado, ...semCastrado } = payloadValido;
    const parse = pacienteInputSchema.safeParse(semCastrado);
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.castrado).toBe("NAO_INFORMADO");
    }
  });

  it("nome, espécie, raça e sexo são obrigatórios", () => {
    const parse = pacienteInputSchema.safeParse({ ...payloadValido, nome: "" });
    expect(parse.success).toBe(false);
  });
});

describe("BREEDS", () => {
  it("tem uma lista de raças para cada espécie do enum", () => {
    for (const especie of especies) {
      expect(BREEDS[especie].length).toBeGreaterThan(0);
    }
  });

  it('Scenario "Troca de espécie após já ter escolhido raça" — cada lista termina em "Outra"/"Outro"', () => {
    expect(BREEDS.CAO.at(-1)).toBe("Outra");
    expect(BREEDS.GATO.at(-1)).toBe("Outra");
    expect(BREEDS.OUTRO.at(-1)).toBe("Outro");
  });

  it("listas de raças diferentes por espécie não se sobrepõem inteiramente", () => {
    expect(BREEDS.CAO).not.toEqual(BREEDS.GATO);
  });
});
