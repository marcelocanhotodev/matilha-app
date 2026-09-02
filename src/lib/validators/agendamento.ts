// Schema Zod de criação de Agendamento (capability: agendamento, task 4.1).
//
// Usado tanto no client (formulário de novo agendamento) quanto na Server
// Action `criarAgendamento` (nunca confiar só na validação do client — ver
// openspec/reference/README.md, "O que não replicar 1:1").

import { z } from "zod";
import { paraInstanteClinica } from "@/lib/timezone";

const REGEX_DATA = /^\d{4}-\d{2}-\d{2}$/;
const REGEX_HORA = /^\d{2}:\d{2}$/;

export const criarAgendamentoInputSchema = z
  .object({
    pacienteId: z.string({ required_error: "Paciente é obrigatório." }).min(1, "Paciente é obrigatório."),
    veterinarioId: z.string({ required_error: "Veterinário é obrigatório." }).min(1, "Veterinário é obrigatório."),
    itemCatalogoId: z.string().min(1).optional(),
    // `data`+`hora` chegam separados (não uma string de datetime já
    // combinada) — a combinação num instante real acontece aqui, sempre
    // interpretada no fuso da clínica via `paraInstanteClinica` (ver
    // openspec/changes/corrigir-fuso-horario-agenda/design.md, Decisão 2).
    // Nunca `z.coerce.date()` sobre uma string sem offset — isso dependeria
    // do fuso horário do processo que faz o parse (a causa raiz do bug
    // corrigido nessa change).
    data: z.string({ required_error: "Data é obrigatória." }).regex(REGEX_DATA, "Data inválida."),
    hora: z.string({ required_error: "Horário é obrigatório." }).regex(REGEX_HORA, "Horário inválido."),
    duracaoMinutos: z.coerce
      .number({ invalid_type_error: "Duração deve ser um número." })
      .int("Duração deve ser um número inteiro.")
      .positive("Duração deve ser maior que zero."),
    // Scenario "Confirmar mesmo com conflito": segunda chamada da mesma
    // action, pulando a checagem de sobreposição.
    ignorarConflito: z.boolean().optional().default(false),
  })
  .transform(({ data, hora, ...resto }) => ({
    ...resto,
    dataHoraInicio: paraInstanteClinica(data, hora),
  }))
  .refine((valores) => !Number.isNaN(valores.dataHoraInicio.getTime()), {
    message: "Data e horário inválidos.",
    path: ["data"],
  });

export type CriarAgendamentoInput = z.infer<typeof criarAgendamentoInputSchema>;
