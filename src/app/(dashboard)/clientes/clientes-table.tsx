"use client";

// Tabela de clientes + ações (capability: clientes). Client Component
// isolado (convenção do projeto: listagem em si é Server Component, só a
// parte interativa — modal de cadastro/edição, inativar/reativar — vira
// client). Recebe os clientes já filtrados/buscados do Server Component pai.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Cliente } from "@prisma/client";
import { inativarCliente, reativarCliente } from "@/lib/actions/cliente";
import { maskCPF, maskCNPJ, maskCelular } from "@/lib/format/mascaras";
import { ClienteModal } from "./cliente-modal";

export type ClienteListItem = Cliente & { _count: { pacientes: number } };

function documentoFormatado(cliente: ClienteListItem): string {
  if (cliente.tipo === "JURIDICA") {
    return cliente.cnpj ? `CNPJ ${maskCNPJ(cliente.cnpj)}` : "—";
  }
  return cliente.cpf ? `CPF ${maskCPF(cliente.cpf)}` : "—";
}

export function ClientesTable({ clientes }: { clientes: ClienteListItem[] }) {
  const router = useRouter();
  const [clienteAberto, setClienteAberto] = useState<ClienteListItem | "novo" | null>(null);
  const [pendenteId, setPendenteId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciarTransicao] = useTransition();

  function aoSalvar() {
    setClienteAberto(null);
    router.refresh();
  }

  function alternarAtivo(cliente: ClienteListItem) {
    if (cliente.ativo && !window.confirm(`Inativar "${cliente.nome}"? Nenhum dado vinculado será apagado.`)) {
      return;
    }

    setErro(null);
    setPendenteId(cliente.id);
    iniciarTransicao(async () => {
      const acao = cliente.ativo ? inativarCliente : reativarCliente;
      const resultado = await acao(cliente.id);
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
          onClick={() => setClienteAberto("novo")}
          className="ml-auto rounded-md bg-pine-800 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-pine-700"
        >
          + Novo cliente
        </button>
      </div>

      <div className="overflow-hidden rounded-md border border-sage-300 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sage-300 bg-sand-50 text-xs uppercase tracking-wide text-pine-700">
            <tr>
              <th className="px-4 py-2">Tutor</th>
              <th className="px-4 py-2">Documento</th>
              <th className="px-4 py-2">Contato</th>
              <th className="px-4 py-2">Pets</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {clientes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-pine-700">
                  Nenhum cliente encontrado.
                </td>
              </tr>
            ) : (
              clientes.map((cliente) => (
                <tr key={cliente.id} className={`border-b border-sage-300 last:border-0 ${cliente.ativo ? "" : "opacity-60"}`}>
                  <td className="px-4 py-2">
                    <div className="font-medium text-pine-900">{cliente.nome}</div>
                    {!cliente.ativo && <div className="text-xs text-pine-700">Inativo</div>}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-pine-800">{documentoFormatado(cliente)}</td>
                  <td className="px-4 py-2 text-pine-800">
                    <div>{cliente.email}</div>
                    {cliente.celular && <div className="text-xs text-pine-700">{maskCelular(cliente.celular)}</div>}
                  </td>
                  <td className="px-4 py-2 text-pine-800">{cliente._count.pacientes}</td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setClienteAberto(cliente)}
                        className="rounded px-2 py-1 text-xs text-pine-800 hover:bg-sand-100"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        disabled={pendenteId === cliente.id}
                        onClick={() => alternarAtivo(cliente)}
                        className="rounded px-2 py-1 text-xs text-pine-800 hover:bg-sand-100 disabled:opacity-60"
                      >
                        {cliente.ativo ? "Inativar" : "Reativar"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {clienteAberto && (
        <ClienteModal
          cliente={clienteAberto === "novo" ? null : clienteAberto}
          onClose={() => setClienteAberto(null)}
          onSaved={aoSalvar}
        />
      )}
    </>
  );
}
