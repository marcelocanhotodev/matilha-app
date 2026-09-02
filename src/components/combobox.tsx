"use client";

// Combobox reutilizável — primeiro componente verdadeiramente compartilhado
// do projeto (fora de qualquer pasta de rota). Construído sobre Popover +
// Command (shadcn/ui). Filtro client-side por label + sublabel (ex.: nome
// do pet + nome do tutor), navegação por teclado herdada do cmdk.
//
// Usado no seletor de paciente do formulário de agendamento e no seletor de
// tutor do modal de Paciente (retrofit). Não é pra listas pequenas e
// limitadas por natureza (ex.: veterinário) — essas continuam `<select>`
// simples (ver openspec/changes/implementar-agendamento/design.md,
// Decisão 3).

import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/command";

export interface ComboboxOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Selecionar...",
  buscaPlaceholder = "Buscar...",
  vazioLabel = "Nenhum resultado.",
  disabled,
}: {
  options: ComboboxOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  buscaPlaceholder?: string;
  vazioLabel?: string;
  disabled?: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const selecionado = options.find((o) => o.value === value) ?? null;

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex w-full items-center justify-between rounded-md border border-sage-300 bg-white px-3 py-2 text-left text-sm text-pine-900 outline-none focus:border-sage-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className={selecionado ? "" : "text-pine-700"}>
            {selecionado ? selecionado.label : placeholder}
          </span>
          <span className="text-pine-700">▾</span>
        </button>
      </PopoverTrigger>
      <PopoverContent>
        <Command
          filter={(itemValue, search) => {
            const opcao = options.find((o) => o.value === itemValue);
            if (!opcao) return 0;
            const alvo = `${opcao.label} ${opcao.sublabel ?? ""}`.toLowerCase();
            return alvo.includes(search.toLowerCase()) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={buscaPlaceholder} />
          <CommandList>
            <CommandEmpty>{vazioLabel}</CommandEmpty>
            <CommandGroup>
              {options.map((opcao) => (
                <CommandItem
                  key={opcao.value}
                  value={opcao.value}
                  onSelect={(valorSelecionado) => {
                    onChange(valorSelecionado);
                    setAberto(false);
                  }}
                >
                  <div className="flex flex-col">
                    <span>{opcao.label}</span>
                    {opcao.sublabel && <span className="text-xs text-pine-700">{opcao.sublabel}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
