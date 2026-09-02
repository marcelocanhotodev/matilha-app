// Schema Zod de Paciente e lista de raças por espécie (capability:
// pacientes, tasks 2.2/2.3).
//
// Usado tanto no client (modal de cadastro/edição, para popular o seletor de
// raça e dar feedback imediato) quanto na Server Action (nunca confiar só na
// validação do client — ver openspec/reference/README.md, "O que não
// replicar 1:1").
//
// `BREEDS` é a mesma constante `BREEDS` do protótipo (openspec/reference/
// prototipo.html), só reindexada pelos valores do enum `Especie` do Prisma
// (CAO/GATO/OUTRO) em vez das chaves dog/cat/other do protótipo. Cada lista
// termina em "Outra"/"Outro", que libera o campo de texto livre no modal —
// a raça em si é sempre persistida como texto (Requirement "Lista de raças
// dependente da espécie" não exige um enum fechado de raças).

import { z } from "zod";

export const especies = ["CAO", "GATO", "OUTRO"] as const;
export type EspecieValor = (typeof especies)[number];

export const BREEDS: Record<EspecieValor, string[]> = {
  CAO: [
    "Vira-lata",
    "Labrador",
    "Golden Retriever",
    "Poodle",
    "Bulldog Francês",
    "Shih Tzu",
    "Pastor Alemão",
    "Beagle",
    "Yorkshire",
    "Chihuahua",
    "Rottweiler",
    "Border Collie",
    "Outra",
  ],
  GATO: [
    "SRD (sem raça definida)",
    "Siamês",
    "Persa",
    "Maine Coon",
    "Angorá",
    "Bengal",
    "Sphynx",
    "Ragdoll",
    "Outra",
  ],
  OUTRO: ["Coelho", "Hamster", "Pássaro", "Tartaruga", "Porquinho-da-índia", "Réptil", "Outro"],
};

export const pacienteInputSchema = z.object({
  clienteId: z.string({ required_error: "Tutor é obrigatório." }).trim().min(1, "Tutor é obrigatório."),
  nome: z.string({ required_error: "Nome do pet é obrigatório." }).trim().min(1, "Nome do pet é obrigatório."),
  especie: z.enum(especies, { required_error: "Espécie é obrigatória." }),
  raca: z.string({ required_error: "Raça é obrigatória." }).trim().min(1, "Raça é obrigatória."),
  sexo: z.enum(["MACHO", "FEMEA"], { required_error: "Sexo é obrigatório." }),
  nascimento: z.coerce.date().optional(),
  // Peso é opcional (nem todo cadastro tem a pesagem à mão), mas quando
  // informado precisa ser > 0 (Scenario "Peso inválido"). `undefined` deve
  // ser o valor enviado para "sem peso" — nunca 0 ou string vazia.
  peso: z.coerce.number().positive("Peso deve ser maior que zero.").optional(),
  cor: z.string().trim().optional(),
  porte: z.enum(["PEQUENO", "MEDIO", "GRANDE"]).optional(),
  castrado: z.enum(["SIM", "NAO", "NAO_INFORMADO"]).default("NAO_INFORMADO"),
  microchip: z.string().trim().optional(),
  observacoes: z.string().trim().optional(),
});

export type PacienteInput = z.infer<typeof pacienteInputSchema>;
