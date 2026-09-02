"use client";

// Formulário de descarte (Requirement: Descartar comanda aberta) — motivo
// obrigatório e não vazio, capturado num pequeno formulário. Nunca um
// `window.confirm()` de um clique só (design.md, Decisão 8): a ação é sobre
// dinheiro que quase foi cobrado, não sobre um cadastro.

import { useState } from "react";

export function DescartarModal({
  onConfirmar,
  onCancelar,
  enviando,
}: {
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
  enviando: boolean;
}) {
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  function aoConfirmar() {
    // Scenario "Descartar sem motivo": bloqueia no client antes mesmo de
    // chamar a Server Action (que também valida — nunca confiar só no
    // client, ver openspec/reference/README.md).
    if (motivo.trim().length === 0) {
      setErro("Motivo é obrigatório.");
      return;
    }
    onConfirmar(motivo.trim());
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/40 p-4">
      <div className="w-full max-w-sm rounded-md bg-white p-5">
        <h3 className="font-display text-lg text-pine-900">Descartar comanda</h3>
        <p className="mt-1 text-xs text-pine-700">
          A comanda não será apagada — fica marcada como cancelada, com o motivo abaixo.
        </p>

        <label className="mt-3 flex flex-col gap-1 text-sm text-pine-800">
          Motivo
          <textarea
            autoFocus
            rows={3}
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value);
              setErro(null);
            }}
            className="rounded-md border border-sage-300 px-3 py-2 text-sm outline-none focus:border-sage-500"
          />
        </label>
        {erro && <p className="mt-1 text-xs text-red-700">{erro}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            disabled={enviando}
            onClick={onCancelar}
            className="rounded-md border border-sage-300 px-4 py-2 text-sm text-pine-800 hover:bg-sand-100 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={enviando}
            onClick={aoConfirmar}
            className="rounded-md bg-pine-800 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-pine-700 disabled:opacity-60"
          >
            Descartar
          </button>
        </div>
      </div>
    </div>
  );
}
