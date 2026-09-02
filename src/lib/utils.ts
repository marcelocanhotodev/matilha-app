// Helper padrão do shadcn/ui — mescla classes Tailwind condicionais (clsx)
// e resolve conflitos entre elas (tailwind-merge), ex.: cn("px-2", cond &&
// "px-4") sempre resolve pra um `px-*` só, nunca os dois.
//
// Usado pelos componentes copiados do shadcn (src/components/) — ver
// openspec/changes/implementar-agendamento/design.md, Decisão 5.

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
