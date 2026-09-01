// Schema Zod de Cliente (capability: clientes, tasks 2.2/2.3).
//
// Usado tanto no client (feedback imediato no modal de cadastro/edição)
// quanto na Server Action (nunca confiar só na validação do client — ver
// openspec/reference/README.md, seção "O que não replicar 1:1").
//
// CPF/CNPJ/celular saem deste schema já normalizados (só dígitos) — o
// `.transform()` abaixo é o único lugar onde isso acontece, então tanto o
// client quanto a Server Action recebem o mesmo formato pronto para
// persistir (ver design.md, Decisão 2).

import { z } from "zod";
import { cpfValido, cnpjValido, normalizarDigitos } from "@/lib/validators/cpf-cnpj";

export const emailClienteSchema = z
  .string({ required_error: "E-mail é obrigatório." })
  .trim()
  .min(1, "E-mail é obrigatório.")
  .email("E-mail em formato inválido.");

const celularSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v ? normalizarDigitos(v) : v));

const enderecoFields = {
  cep: z.string().trim().optional(),
  logradouro: z.string().trim().optional(),
  numero: z.string().trim().optional(),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  uf: z.string().trim().optional(),
};

export const clienteFisicaSchema = z.object({
  tipo: z.literal("FISICA"),
  nome: z.string().trim().min(1, "Nome completo é obrigatório."),
  cpf: z
    .string()
    .refine((v) => cpfValido(v), "CPF inválido.")
    .transform((v) => normalizarDigitos(v)),
  nascimento: z.coerce.date().optional(),
  email: emailClienteSchema,
  celular: celularSchema,
  ...enderecoFields,
});

export const clienteJuridicaSchema = z.object({
  tipo: z.literal("JURIDICA"),
  nome: z.string().trim().min(1, "Razão social é obrigatória."),
  cnpj: z
    .string()
    .refine((v) => cnpjValido(v), "CNPJ inválido.")
    .transform((v) => normalizarDigitos(v)),
  ie: z.string().trim().optional(),
  email: emailClienteSchema,
  celular: celularSchema,
  ...enderecoFields,
});

export const clienteInputSchema = z.discriminatedUnion("tipo", [
  clienteFisicaSchema,
  clienteJuridicaSchema,
]);

export type ClienteInput = z.infer<typeof clienteInputSchema>;
