"use client";

// Tabela de itens de catálogo + ações (capability: catalogo-produtos-
// servicos). Client Component isolado (convenção do projeto: listagem em si
// é Server Component, só a parte interativa — modal de cadastro/edição,
// inativar/reativar — vira client). Recebe os itens já filtrados do Server
// Component pai.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ItemCatalogo } from "@prisma/client";
import { inativarItemCatalogo, reativarItemCatalogo } from "@/lib/actions/item-catalogo";
import { ItemCatalogoModal } from "./item-catalogo-modal";

const CATEGORIA_LABEL: Record<string, string> = { SERVICO: "Serviço", PRODUTO: "Produto" };

function precoFormatado(preco: ItemCatalogo["preco"]): string {
  return Number(preco).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function duracaoFormatada(duracaoPadraoMinutos: ItemCatalogo["duracaoPadraoMinutos"]): string {
  return duracaoPadraoMinutos != null ? `${duracaoPadraoMinutos} min` : "—";
}

export function CatalogoTable({ itens }: { itens: ItemCatalogo[] }) {
  const router = useRouter();
  const [itemAberto, setItemAberto] = useState<ItemCatalogo | "novo" | null>(null);
  const [pendenteId, setPendenteId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciarTransicao] = useTransition();

  function aoSalvar() {
    setItemAberto(null);
    router.refresh();
  }

  function alternarAtivo(item: ItemCatalogo) {
    if (item.ativo && !window.confirm(`Inativar "${item.nome}"? Nenhum dado vinculado será apagado.`)) {
      return;
    }

    setErro(null);
    setPendenteId(item.id);
    iniciarTransicao(async () => {
      const acao = item.ativo ? inativarItemCatalogo : reativarItemCatalogo;
      const resultado = await acao(item.id);
      setPendenteId(null);
      if (!resultado.ok) {
        setErro(resultado.erro ?? "Não foi possível concluir a operação.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex items-center justify-between">
        {erro && <p className="text-sm text-red-700">{erro}</p>}
        <button
          type="button"
          onClick={() => setItemAberto("novo")}
          className="ml-auto rounded-md bg-pine-800 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-pine-700"
        >
          + Novo item
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-sage-300 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sage-300 bg-sand-50 text-xs uppercase tracking-wide text-pine-700">
            <tr>
              <th className="px-4 py-2" />
              <th className="px-4 py-2">Nome</th>
              <th className="px-4 py-2">Categoria</th>
              <th className="px-4 py-2">Preço</th>
              <th className="px-4 py-2">Duração</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-pine-700">
                  Nenhum item de catálogo encontrado.
                </td>
              </tr>
            ) : (
              itens.map((item) => (
                <tr key={item.id} className={`border-b border-sage-300 last:border-0 ${item.ativo ? "" : "opacity-60"}`}>
                  <td className="px-4 py-2 text-lg">{item.icone || "—"}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium text-pine-900">{item.nome}</div>
                    {!item.ativo && <div className="text-xs text-pine-700">Inativo</div>}
                  </td>
                  <td className="px-4 py-2 text-pine-800">{CATEGORIA_LABEL[item.categoria] ?? item.categoria}</td>
                  <td className="px-4 py-2 text-pine-800">{precoFormatado(item.preco)}</td>
                  <td className="px-4 py-2 text-pine-800">{duracaoFormatada(item.duracaoPadraoMinutos)}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setItemAberto(item)}
                        className="rounded px-2 py-1 text-xs text-pine-800 hover:bg-sand-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={pendenteId === item.id}
                        onClick={() => alternarAtivo(item)}
                        className="rounded px-2 py-1 text-xs text-pine-800 hover:bg-sand-100 disabled:opacity-60"
                      >
                        {item.ativo ? "Inativar" : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {itemAberto && (
        <ItemCatalogoModal
          item={itemAberto === "novo" ? null : itemAberto}
          onClose={() => setItemAberto(null)}
          onSaved={aoSalvar}
        />
      )}
    </>
  );
}
