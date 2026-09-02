"use client";

// Modal de cadastro/edição de item de catálogo (capability:
// catalogo-produtos-servicos, tasks 4.1 e 4.2). Client Component isolado.
//
// Validação real (preço numérico não-negativo) acontece na Server Action —
// este componente só dá feedback visual rápido e nunca é a única barreira
// (ver openspec/reference/README.md, "O que não replicar 1:1").

import { useState } from "react";
import type { ItemCatalogo } from "@prisma/client";
import { criarItemCatalogo, editarItemCatalogo } from "@/lib/actions/item-catalogo";
import { categorias, type CategoriaValor } from "@/lib/validators/item-catalogo";

const CATEGORIA_LABEL: Record<CategoriaValor, string> = { SERVICO: "Serviço", PRODUTO: "Produto" };

interface FormState {
  nome: string;
  categoria: CategoriaValor;
  preco: string;
  icone: string;
}

function estadoInicial(item: ItemCatalogo | null): FormState {
  if (!item) {
    return { nome: "", categoria: "SERVICO", preco: "", icone: "🩺" };
  }
  return {
    nome: item.nome,
    categoria: item.categoria as CategoriaValor,
    preco: String(item.preco),
    icone: item.icone ?? "",
  };
}

export function ItemCatalogoModal({
  item,
  onClose,
  onSaved,
}: {
  item: ItemCatalogo | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => estadoInicial(item));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function aoSalvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    const payload = {
      nome: form.nome,
      categoria: form.categoria,
      preco: form.preco,
      icone: form.icone || undefined,
    };

    const resultado = item ? await editarItemCatalogo(item.id, payload) : await criarItemCatalogo(payload);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar o item de catálogo.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-pine-900">{item ? "Editar item" : "Novo item"}</h3>
          <button type="button" onClick={onClose} className="text-pine-700 hover:text-pine-900" aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={aoSalvar} className="flex flex-col gap-4">
          <Campo label="Nome">
            <input
              type="text"
              required
              placeholder="Ex: Consulta dermatológica"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className="campo-input"
            />
          </Campo>

          <div className="flex gap-3">
            <Campo label="Categoria">
              <select
                value={form.categoria}
                onChange={(e) => set("categoria", e.target.value as CategoriaValor)}
                className="campo-input"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORIA_LABEL[c]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo label="Preço (R$)">
              <input
                type="number"
                required
                min="0"
                step="0.01"
                placeholder="0,00"
                value={form.preco}
                onChange={(e) => set("preco", e.target.value)}
                className="campo-input"
              />
            </Campo>
          </div>

          <Campo label="Ícone (emoji)">
            <input
              type="text"
              placeholder="🩺"
              value={form.icone}
              onChange={(e) => set("icone", e.target.value)}
              className="campo-input"
            />
          </Campo>

          {erro && <p className="text-sm text-red-700">{erro}</p>}

          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-md px-4 py-2 text-sm text-pine-800 hover:bg-sand-100">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-pine-800 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-pine-700 disabled:opacity-60"
            >
              {enviando ? "Salvando..." : item ? "Salvar alterações" : "Adicionar item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Campo({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`flex flex-1 flex-col gap-1 text-sm text-pine-800 ${className ?? ""}`}>
      {label}
      {children}
    </label>
  );
}
