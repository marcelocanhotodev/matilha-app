"use client";

// Painel do carrinho (Requirement: Montagem da comanda, Desconto
// configurável, Finalização da comanda). Puramente apresentacional — todo o
// estado e a persistência (imediata ou com debounce) vivem em
// atendimento-workspace.tsx; este componente só dispara callbacks.

import { useState } from "react";
import { formasPagamento, type FormaPagamentoValor, type TipoDescontoValor } from "@/lib/validators/comanda";

export interface ItemSessao {
  // Número real (ComandaItem.id) depois de persistido, ou uma chave
  // sintética `novo-<itemCatalogoId>-<timestamp>` enquanto o item só existe
  // otimisticamente no client (ver aoAdicionarItem em
  // atendimento-workspace.tsx) — nunca confundir com um id de verdade.
  id: string | number;
  itemCatalogoId: number | null;
  nome: string;
  preco: number;
  quantidade: number;
}

const FORMA_PAGAMENTO_LABEL: Record<FormaPagamentoValor, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function Carrinho({
  itens,
  desconto,
  total,
  disabled,
  temComanda,
  onAlterarQuantidade,
  onRemoverItem,
  onMudarDesconto,
  onFinalizar,
  onDescartar,
}: {
  itens: ItemSessao[];
  desconto: { tipo: TipoDescontoValor; valor: number };
  total: number;
  disabled: boolean;
  /** Existe uma comanda persistida (ao menos um item já foi adicionado) —
   * controla se "Descartar" aparece. "Finalizar" também exige `itens.length
   * > 0` (Scenario "Finalizar sem itens"), checado abaixo. */
  temComanda: boolean;
  onAlterarQuantidade: (comandaItemId: string | number, quantidade: number) => void;
  onRemoverItem: (comandaItemId: string | number) => void;
  onMudarDesconto: (desconto: { tipo: TipoDescontoValor; valor: number }) => void;
  onFinalizar: (formaPagamento: FormaPagamentoValor) => void;
  onDescartar: () => void;
}) {
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamentoValor>("PIX");
  const subtotal = itens.reduce((soma, item) => soma + item.preco * item.quantidade, 0);

  return (
    <aside className="flex flex-col gap-3 rounded-md border border-sage-300 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-pine-900">Comanda</h2>
        <span className="text-xs text-pine-700">{itens.length} {itens.length === 1 ? "item" : "itens"}</span>
      </div>

      {itens.length === 0 ? (
        <p className="rounded-md border border-dashed border-sage-300 p-4 text-center text-xs text-pine-700">
          A comanda está vazia. Clique em um serviço ou produto para adicionar.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-sage-300">
          {itens.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-pine-900">{item.nome}</div>
                <div className="text-xs text-pine-700">{moeda(item.preco)} un.</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAlterarQuantidade(item.id, Math.max(1, item.quantidade - 1))}
                  className="h-6 w-6 rounded border border-sage-300 text-sm disabled:opacity-60"
                >
                  −
                </button>
                <span className="w-5 text-center text-sm">{item.quantidade}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onAlterarQuantidade(item.id, item.quantidade + 1)}
                  className="h-6 w-6 rounded border border-sage-300 text-sm disabled:opacity-60"
                >
                  +
                </button>
              </div>
              <div className="w-16 shrink-0 text-right text-sm font-medium text-pine-900">
                {moeda(item.preco * item.quantidade)}
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onRemoverItem(item.id)}
                title="Remover"
                className="shrink-0 text-pine-700 hover:text-red-700 disabled:opacity-60"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1 border-t border-sage-300 pt-2 text-sm">
        <div className="flex items-center justify-between text-pine-800">
          <span>Subtotal</span>
          <span className="font-mono">{moeda(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-2 text-pine-800">
          <span>Desconto</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={0}
              step="0.01"
              disabled={disabled}
              value={desconto.valor}
              onChange={(e) => onMudarDesconto({ tipo: desconto.tipo, valor: Number(e.target.value) })}
              className="w-20 rounded border border-sage-300 px-2 py-1 text-right text-xs"
            />
            <select
              disabled={disabled}
              value={desconto.tipo}
              onChange={(e) => onMudarDesconto({ tipo: e.target.value as TipoDescontoValor, valor: desconto.valor })}
              className="rounded border border-sage-300 px-1 py-1 text-xs"
            >
              <option value="PERCENTUAL">%</option>
              <option value="FIXO">R$</option>
            </select>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-sage-300 pt-1 font-display text-lg text-pine-900">
          <span>Total</span>
          <span>{moeda(total)}</span>
        </div>
      </div>

      <label className="flex flex-col gap-1 text-sm text-pine-800">
        Forma de pagamento
        <select
          disabled={disabled}
          value={formaPagamento}
          onChange={(e) => setFormaPagamento(e.target.value as FormaPagamentoValor)}
          className="rounded-md border border-sage-300 px-3 py-2 text-sm"
        >
          {formasPagamento.map((f) => (
            <option key={f} value={f}>
              {FORMA_PAGAMENTO_LABEL[f]}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        disabled={disabled || !temComanda || itens.length === 0}
        onClick={() => onFinalizar(formaPagamento)}
        className="w-full rounded-md bg-pine-800 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-pine-700 disabled:opacity-60"
      >
        Finalizar atendimento
      </button>

      {temComanda && (
        <button
          type="button"
          disabled={disabled}
          onClick={onDescartar}
          className="w-full rounded-md border border-sage-300 px-4 py-2 text-sm text-pine-800 hover:bg-sand-100 disabled:opacity-60"
        >
          Descartar comanda
        </button>
      )}
    </aside>
  );
}
