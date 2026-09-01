// Testes de src/lib/actions/cep.ts (capability: clientes, task 4.1) —
// cobrem os dois Scenarios da Requirement "Endereço com preenchimento
// automático por CEP". `fetch` é mockado — não bate no ViaCEP de verdade.

import { describe, it, expect, vi, afterEach } from "vitest";
import { buscarEnderecoPorCep } from "@/lib/actions/cep";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buscarEnderecoPorCep", () => {
  it('Scenario "CEP válido" — preenche logradouro/bairro/cidade/UF', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        logradouro: "Rua das Palmeiras",
        bairro: "Vila Alta",
        localidade: "Botucatu",
        uf: "SP",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await buscarEnderecoPorCep("18602-410");

    expect(resultado).toEqual({
      encontrado: true,
      logradouro: "Rua das Palmeiras",
      bairro: "Vila Alta",
      cidade: "Botucatu",
      uf: "SP",
    });
    expect(fetchMock).toHaveBeenCalledWith("https://viacep.com.br/ws/18602410/json/");
  });

  it('Scenario "CEP não encontrado" — ViaCEP retorna erro:true, não bloqueia', async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ erro: true }) })
    );

    const resultado = await buscarEnderecoPorCep("00000-000");

    expect(resultado).toEqual({ encontrado: false });
  });

  it("CEP com quantidade de dígitos errada não chama o ViaCEP", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const resultado = await buscarEnderecoPorCep("123");

    expect(resultado).toEqual({ encontrado: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falha de rede resulta em não encontrado, sem lançar erro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error"))
    );

    const resultado = await buscarEnderecoPorCep("18602-410");

    expect(resultado).toEqual({ encontrado: false });
  });
});
