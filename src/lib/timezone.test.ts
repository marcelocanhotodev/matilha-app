// Testes de src/lib/timezone.ts (capability: agendamento — ver
// openspec/changes/corrigir-fuso-horario-agenda/tasks.md, 1.1 e 1.2).

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  adicionarDias,
  diaDaSemana,
  fimDoDiaClinica,
  inicioDoDiaClinica,
  paraChaveDeData,
  paraChaveDeHora,
  paraComponentesClinica,
  paraDiaCalendario,
  paraInstanteClinica,
  segundaFeiraDaSemana,
} from "@/lib/timezone";

describe("paraInstanteClinica", () => {
  it("interpreta data+hora como horário da clínica (UTC-3), não do processo", () => {
    const instante = paraInstanteClinica("2026-09-03", "09:00");
    expect(instante.toISOString()).toBe("2026-09-03T12:00:00.000Z");
  });

  it("meia-noite no fuso da clínica corresponde a 03:00 UTC", () => {
    expect(paraInstanteClinica("2026-09-03", "00:00").toISOString()).toBe("2026-09-03T03:00:00.000Z");
  });

  it("virada de dia: 23:00 no fuso da clínica cai no dia seguinte em UTC", () => {
    const instante = paraInstanteClinica("2026-09-02", "23:00");
    expect(instante.toISOString()).toBe("2026-09-03T02:00:00.000Z");
  });

  it("data/hora inválidas produzem Invalid Date", () => {
    expect(Number.isNaN(paraInstanteClinica("2026-13-99", "25:99").getTime())).toBe(true);
  });
});

describe("paraComponentesClinica / paraDiaCalendario", () => {
  it("deriva os componentes no fuso da clínica a partir de um instante UTC", () => {
    const instante = new Date("2026-09-03T12:00:00.000Z");
    expect(paraComponentesClinica(instante)).toEqual({ ano: 2026, mes: 9, dia: 3, hora: 9, minuto: 0 });
  });

  it("um instante logo após meia-noite UTC ainda é o dia anterior no fuso da clínica", () => {
    // 2026-09-03T02:00:00Z é 2026-09-02 23:00 em UTC-3 — ainda dia 2.
    const instante = new Date("2026-09-03T02:00:00.000Z");
    expect(paraDiaCalendario(instante)).toEqual({ ano: 2026, mes: 9, dia: 2 });
  });

  it("paraChaveDeHora formata hora/minuto com dois dígitos", () => {
    expect(paraChaveDeHora({ ano: 2026, mes: 9, dia: 3, hora: 9, minuto: 5 })).toBe("09:05");
  });
});

describe("aritmética de calendário (adicionarDias, diaDaSemana, segundaFeiraDaSemana)", () => {
  it("adicionarDias cruza mês e ano corretamente", () => {
    expect(adicionarDias({ ano: 2026, mes: 12, dia: 30 }, 3)).toEqual({ ano: 2027, mes: 1, dia: 2 });
  });

  it("adicionarDias aceita quantidade negativa", () => {
    expect(adicionarDias({ ano: 2026, mes: 9, dia: 1 }, -1)).toEqual({ ano: 2026, mes: 8, dia: 31 });
  });

  it("diaDaSemana identifica 2026-09-02 como quarta-feira", () => {
    expect(diaDaSemana({ ano: 2026, mes: 9, dia: 2 })).toBe(3); // 0=domingo ... 3=quarta
  });

  it("segundaFeiraDaSemana encontra a segunda da semana cruzando o mês", () => {
    // 2026-09-01 é terça-feira.
    expect(segundaFeiraDaSemana({ ano: 2026, mes: 9, dia: 1 })).toEqual({ ano: 2026, mes: 8, dia: 31 });
  });

  it("segundaFeiraDaSemana de um domingo retrocede 6 dias", () => {
    // 2026-09-06 é domingo.
    expect(segundaFeiraDaSemana({ ano: 2026, mes: 9, dia: 6 })).toEqual({ ano: 2026, mes: 8, dia: 31 });
  });

  it("paraChaveDeData formata yyyy-mm-dd com dois dígitos", () => {
    expect(paraChaveDeData({ ano: 2026, mes: 9, dia: 3 })).toBe("2026-09-03");
  });
});

describe("inicioDoDiaClinica / fimDoDiaClinica", () => {
  it("delimitam exatamente um dia no fuso da clínica", () => {
    const dia = { ano: 2026, mes: 9, dia: 3 };
    expect(inicioDoDiaClinica(dia).toISOString()).toBe("2026-09-03T03:00:00.000Z");
    expect(fimDoDiaClinica(dia).toISOString()).toBe("2026-09-04T02:59:59.999Z");
  });
});

describe("independência do fuso horário do processo Node", () => {
  const tzOriginal = process.env.TZ;

  beforeAll(() => {
    // Simula o ambiente de produção/Docker que motivou esta change: o
    // processo roda em UTC, diferente do fuso da clínica.
    process.env.TZ = "UTC";
  });

  afterAll(() => {
    process.env.TZ = tzOriginal;
  });

  it("paraInstanteClinica/paraComponentesClinica continuam corretos com TZ=UTC no processo", () => {
    const instante = paraInstanteClinica("2026-09-03", "09:00");
    expect(instante.toISOString()).toBe("2026-09-03T12:00:00.000Z");
    expect(paraComponentesClinica(instante)).toEqual({ ano: 2026, mes: 9, dia: 3, hora: 9, minuto: 0 });
  });

  it("segundaFeiraDaSemana continua correta com TZ=UTC no processo", () => {
    expect(segundaFeiraDaSemana({ ano: 2026, mes: 9, dia: 1 })).toEqual({ ano: 2026, mes: 8, dia: 31 });
  });
});
