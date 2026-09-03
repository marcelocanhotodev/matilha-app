// Tipos compartilhados entre page.tsx (Server Component) e os componentes
// da tela de atendimento (capability: atendimento-comanda) — refletem
// exatamente os `include` usados nas queries de page.tsx.

import type { Agendamento, Comanda, ComandaItem, ItemCatalogo } from "@prisma/client";

export type ComandaComItens = Comanda & { itens: ComandaItem[] };

export type AgendamentoFila = Agendamento & {
  paciente: { nome: string; cliente: { nome: string } };
  itemCatalogo: ItemCatalogo | null;
  comanda: ComandaComItens | null;
};

export type ComandaForaDaFila = ComandaComItens & {
  agendamento: { id: number; paciente: { nome: string } } | null;
};
