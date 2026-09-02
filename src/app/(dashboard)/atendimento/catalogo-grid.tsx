"use client";

// Grade de catálogo (serviços/produtos) — Requirement: Montagem da comanda.
// Puramente apresentacional; clicar num item chama onAdicionar, que trata a
// escrita (imediata — cada clique é uma intenção discreta, ver
// atendimento-workspace.tsx).

import { useState } from "react";
import type { ItemCatalogo } from "@prisma/client";

const CATEGORIAS_FILTRO = [
  { valor: "", label: "Tudo" },
  { valor: "SERVICO", label: "Serviços" },
  { valor: "PRODUTO", label: "Produtos" },
] as const;

function precoLabel(preco: ItemCatalogo["preco"]): string {
  return Number(preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function CatalogoGrid({
  catalogo,
  onAdicionar,
  disabled,
}: {
  catalogo: ItemCatalogo[];
  onAdicionar: (item: ItemCatalogo) => void;
  disabled: boolean;
}) {
  const [categoria, setCategoria] = useState<string>("");

  const itensFiltrados = categoria ? catalogo.filter((i) => i.categoria === categoria) : catalogo;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {CATEGORIAS_FILTRO.map((f) => (
          <button
            key={f.valor}
            type="button"
            onClick={() => setCategoria(f.valor)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              categoria === f.valor ? "border-pine-800 bg-pine-800 text-sand-50" : "border-sage-300 bg-white text-pine-800"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {itensFiltrados.length === 0 ? (
        <p className="px-1 py-4 text-sm text-pine-700">Nenhum item de catálogo ativo.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {itensFiltrados.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onAdicionar(item)}
              className="flex flex-col items-start gap-1 rounded-md border border-sage-300 bg-white p-3 text-left hover:border-sage-500 disabled:opacity-60"
            >
              <span className="text-lg">{item.icone || "🩺"}</span>
              <span className="text-sm font-medium text-pine-900">{item.nome}</span>
              <span className="text-xs text-pine-700">{precoLabel(item.preco)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
