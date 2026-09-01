"use server";

// Server Action de busca de endereço por CEP (capability: clientes) —
// integração com o ViaCEP. Fica atrás de uma Server Action em vez de fetch
// direto no client (ver design.md, Decisão 4): concentra a integração
// externa num único lugar, fácil de trocar de provedor ou adicionar
// cache/log depois.
//
// Nunca lança erro para quem chama — CEP inválido, não encontrado, ou falha
// de rede resultam todos em `{ encontrado: false }`, e o cadastro nunca é
// bloqueado por isso (ver Requirement "Endereço com preenchimento automático
// por CEP", Scenario "CEP não encontrado").

import { normalizarDigitos } from "@/lib/validators/cpf-cnpj";

export interface EnderecoPorCepResultado {
  encontrado: boolean;
  logradouro?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface RespostaViaCep {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
}

export async function buscarEnderecoPorCep(cepBruto: string): Promise<EnderecoPorCepResultado> {
  const cep = normalizarDigitos(cepBruto);
  if (cep.length !== 8) {
    return { encontrado: false };
  }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!resposta.ok) {
      return { encontrado: false };
    }

    const dados: RespostaViaCep = await resposta.json();
    if (dados.erro) {
      return { encontrado: false };
    }

    return {
      encontrado: true,
      logradouro: dados.logradouro || undefined,
      bairro: dados.bairro || undefined,
      cidade: dados.localidade || undefined,
      uf: dados.uf || undefined,
    };
  } catch {
    // Sem internet, timeout, ViaCEP fora do ar etc. — mesmo tratamento de
    // "não encontrado": o usuário preenche o endereço manualmente.
    return { encontrado: false };
  }
}
