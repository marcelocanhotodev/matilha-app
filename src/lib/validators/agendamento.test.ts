// Testes de src/lib/validators/agendamento.ts (capability: agendamento,
// task 4.1; payload de data/hora revisado em
// openspec/changes/corrigir-fuso-horario-agenda/).

import { describe, it, expect } from "vitest";
import { criarAgendamentoInputSchema } from "@/lib/validators/agendamento";

const payloadValido = {
  pacienteId: 1,
  veterinarioId: 1,
  itemCatalogoId: 1,
  data: "2026-09-10",
  hora: "09:00",
  duracaoMinutos: 30,
};

describe("criarAgendamentoInputSchema", () => {
  it("payload válido completo é aceito e transforma data+hora num instante no fuso da clínica", () => {
    const parse = criarAgendamentoInputSchema.safeParse(payloadValido);
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.duracaoMinutos).toBe(30);
      expect(parse.data.ignorarConflito).toBe(false);
      // 09:00 no fuso da clínica (UTC-3) = 12:00 UTC.
      expect(parse.data.dataHoraInicio.toISOString()).toBe("2026-09-10T12:00:00.000Z");
    }
  });

  it("itemCatalogoId ausente é válido — serviço previsto é opcional", () => {
    const { itemCatalogoId: _itemCatalogoId, ...semServico } = payloadValido;
    const parse = criarAgendamentoInputSchema.safeParse(semServico);
    expect(parse.success).toBe(true);
  });

  it("duração inválida (zero) é rejeitada", () => {
    const parse = criarAgendamentoInputSchema.safeParse({ ...payloadValido, duracaoMinutos: 0 });
    expect(parse.success).toBe(false);
  });

  it("duração inválida (negativa) é rejeitada", () => {
    const parse = criarAgendamentoInputSchema.safeParse({ ...payloadValido, duracaoMinutos: -30 });
    expect(parse.success).toBe(false);
  });

  it("data em formato inválido é rejeitada", () => {
    const parse = criarAgendamentoInputSchema.safeParse({ ...payloadValido, data: "não é uma data" });
    expect(parse.success).toBe(false);
  });

  it("hora em formato inválido é rejeitada", () => {
    const parse = criarAgendamentoInputSchema.safeParse({ ...payloadValido, hora: "meio-dia" });
    expect(parse.success).toBe(false);
  });

  it("data com formato correto mas calendário inválido (ex.: mês 13) é rejeitada", () => {
    const parse = criarAgendamentoInputSchema.safeParse({ ...payloadValido, data: "2026-13-40" });
    expect(parse.success).toBe(false);
  });

  it("pacienteId e veterinarioId são obrigatórios", () => {
    const { pacienteId: _pacienteId, ...semPaciente } = payloadValido;
    expect(criarAgendamentoInputSchema.safeParse(semPaciente).success).toBe(false);

    const { veterinarioId: _veterinarioId, ...semVet } = payloadValido;
    expect(criarAgendamentoInputSchema.safeParse(semVet).success).toBe(false);
  });

  it("ignorarConflito default é false quando ausente", () => {
    const parse = criarAgendamentoInputSchema.safeParse(payloadValido);
    if (parse.success) expect(parse.data.ignorarConflito).toBe(false);
  });

  it("ignorarConflito true é aceito e preservado", () => {
    const parse = criarAgendamentoInputSchema.safeParse({ ...payloadValido, ignorarConflito: true });
    if (parse.success) expect(parse.data.ignorarConflito).toBe(true);
  });

  it("resultado não depende do fuso horário do processo Node", () => {
    const tzOriginal = process.env.TZ;
    process.env.TZ = "UTC";
    try {
      const parse = criarAgendamentoInputSchema.safeParse(payloadValido);
      expect(parse.success).toBe(true);
      if (parse.success) {
        expect(parse.data.dataHoraInicio.toISOString()).toBe("2026-09-10T12:00:00.000Z");
      }
    } finally {
      process.env.TZ = tzOriginal;
    }
  });
});
