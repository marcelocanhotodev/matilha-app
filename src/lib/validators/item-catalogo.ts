// Schema Zod de ItemCatalogo (capability: catalogo-produtos-servicos, task
// 1.1).
//
// Usado tanto no client (modal de cadastro/edição, para dar feedback
// imediato) quanto na Server Action (nunca confiar só na validação do
// client — ver openspec/reference/README.md, "O que não replicar 1:1").
//
// Ícone é texto livre opcional, sem limite rígido de caracteres — o
// protótipo usa `maxlength="2"`, que quebra para emojis multi-codepoint
// (ver design.md, Decisão 5).

import { z } from "zod";

export const categorias = ["SERVICO", "PRODUTO"] as const;
export type CategoriaValor = (typeof categorias)[number];

export const itemCatalogoInputSchema = z.object({
  nome: z.string({ required_error: "Nome é obrigatório." }).trim().min(1, "Nome é obrigatório."),
  categoria: z.enum(categorias, { required_error: "Categoria é obrigatória." }),
  // Scenario "Preço inválido": negativo ou não numérico é rejeitado. Zero é
  // um preço válido (a spec não exige preço > 0).
  preco: z.coerce.number({ invalid_type_error: "Preço deve ser um número." }).nonnegative("Preço não pode ser negativo."),
  icone: z.string().trim().optional(),
});

export type ItemCatalogoInput = z.infer<typeof itemCatalogoInputSchema>;
