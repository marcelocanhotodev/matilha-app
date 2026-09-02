"use client";

// Popover (adaptado do shadcn/ui — Radix por baixo, primeira dependência de
// UI do projeto). As classes usam a paleta já existente (bg-white,
// border-sage-300, text-pine-900) em vez do sistema de cor semântico
// padrão do shadcn (bg-popover, text-foreground) — nenhuma CSS variable
// nova em globals.css. Ver openspec/changes/implementar-agendamento/
// design.md, Decisão 5: ao adicionar outro componente shadcn no futuro,
// repetir este mesmo tratamento (copiar, depois trocar as classes
// semânticas pelas classes literais da paleta).

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "@/lib/utils";

const Popover = PopoverPrimitive.Root;
const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "z-50 w-[var(--radix-popover-trigger-width)] rounded-md border border-sage-300 bg-white p-0 text-pine-900 shadow-lg outline-none",
        className,
      )}
      {...props}
    />
  </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverAnchor, PopoverContent };
