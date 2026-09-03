// Schemas Zod e cálculo de totais de Comanda (capability: atendimento-comanda,
// tasks 2.1 e 2.2).
//
// Usados tanto no client (feedback imediato no carrinho) quanto nas Server
// Actions de src/lib/actions/comanda.ts (nunca confiar só na validação do
// client — ver openspec/reference/README.md, "O que não replicar 1:1").

import { z } from "zod";

export const formasPagamento = ["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO"] as const;
export type FormaPagamentoValor = (typeof formasPagamento)[number];

export const tiposDesconto = ["PERCENTUAL", "FIXO"] as const;
export type TipoDescontoValor = (typeof tiposDesconto)[number];

export const itemCarrinhoInputSchema = z.object({
  itemCatalogoId: z.coerce
    .number({ required_error: "Item de catálogo é obrigatório.", invalid_type_error: "Item de catálogo é obrigatório." })
    .int()
    .positive("Item de catálogo é obrigatório."),
  quantidade: z.coerce
    .number({ invalid_type_error: "Quantidade deve ser um número." })
    .int("Quantidade deve ser um número inteiro.")
    .positive("Quantidade deve ser maior que zero."),
});
export type ItemCarrinhoInput = z.infer<typeof itemCarrinhoInputSchema>;

export const descontoInputSchema = z.object({
  tipo: z.enum(tiposDesconto, { required_error: "Tipo de desconto é obrigatório." }),
  valor: z.coerce
    .number({ invalid_type_error: "Desconto deve ser um número." })
    .nonnegative("Desconto não pode ser negativo."),
});
export type DescontoInput = z.infer<typeof descontoInputSchema>;

// Requirement: Descartar comanda aberta — motivo obrigatório e não vazio,
// sem mínimo de caracteres arbitrário (design.md, Non-Goals).
export const motivoDescarteSchema = z.object({
  motivo: z.string({ required_error: "Motivo é obrigatório." }).trim().min(1, "Motivo é obrigatório."),
});
export type MotivoDescarteInput = z.infer<typeof motivoDescarteSchema>;

/**
 * Converte um desconto informado (percentual ou valor fixo) no valor
 * efetivo em reais sobre um subtotal, e devolve o total resultante — nunca
 * negativo (Requirement: Desconto configurável, Scenario "Desconto maior
 * que o subtotal"). `Comanda.desconto` sempre grava o valor efetivo em
 * reais, nunca o tipo/percentual original que o gerou.
 */
export function calcularDescontoETotal(
  subtotal: number,
  desconto: DescontoInput,
): { descontoEmReais: number; total: number } {
  const descontoEmReais = desconto.tipo === "PERCENTUAL" ? subtotal * (desconto.valor / 100) : desconto.valor;
  const total = Math.max(0, subtotal - descontoEmReais);
  return { descontoEmReais, total };
}
