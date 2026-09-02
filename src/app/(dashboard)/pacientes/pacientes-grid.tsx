"use client";

// Grade de pacientes + ações (capability: pacientes). Client Component
// isolado (convenção do projeto: listagem em si é Server Component, só a
// parte interativa — modal de cadastro/edição, inativar/reativar — vira
// client). Recebe os pacientes já filtrados do Server Component pai.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Paciente } from "@prisma/client";
import { inativarPaciente, reativarPaciente } from "@/lib/actions/paciente";
import { calcularIdadeLabel } from "@/lib/format/idade";
import { PacienteModal } from "./paciente-modal";

export type PacienteListItem = Paciente & { cliente: { nome: string } };
export type ClienteOpcao = { id: string; nome: string };

const SPECIES_META: Record<string, { label: string; emoji: string; bg: string }> = {
  CAO: { label: "Cão", emoji: "🐶", bg: "#fbf0dc" },
  GATO: { label: "Gato", emoji: "🐱", bg: "#f1ecf5" },
  OUTRO: { label: "Outro", emoji: "🐰", bg: "#e9f4f0" },
};

const SEXO_LABEL: Record<string, string> = { MACHO: "Macho", FEMEA: "Fêmea" };
const PORTE_LABEL: Record<string, string> = { PEQUENO: "Pequeno", MEDIO: "Médio", GRANDE: "Grande" };

function pesoLabel(peso: PacienteListItem["peso"]): string {
  if (peso === null || peso === undefined) return "—";
  return `${Number(peso)} kg`;
}

export function PacientesGrid({
  pacientes,
  clientesAtivos,
}: {
  pacientes: PacienteListItem[];
  clientesAtivos: ClienteOpcao[];
}) {
  const router = useRouter();
  const [pacienteAberto, setPacienteAberto] = useState<PacienteListItem | "novo" | null>(null);
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, iniciarTransicao] = useTransition();

  function aoSalvar() {
    setPacienteAberto(null);
    router.refresh();
  }

  function alternarAtivo(paciente: PacienteListItem) {
    if (paciente.ativo && !window.confirm(`Inativar "${paciente.nome}"? Nenhum dado vinculado será apagado.`)) {
      return;
    }

    setErro(null);
    setPendenteId(paciente.id);
    iniciarTransicao(async () => {
      const acao = paciente.ativo ? inativarPaciente : reativarPaciente;
      const resultado = await acao(paciente.id);
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
          onClick={() => setPacienteAberto("novo")}
          disabled={clientesAtivos.length === 0}
          title={clientesAtivos.length === 0 ? "Cadastre um cliente antes de cadastrar um paciente." : undefined}
          className="ml-auto rounded-md bg-pine-800 px-4 py-2 text-sm font-medium text-sand-50 hover:bg-pine-700 disabled:opacity-60"
        >
          + Novo paciente
        </button>
      </div>

      {clientesAtivos.length === 0 && (
        // Requirement "Vínculo obrigatório com um cliente existente",
        // Scenario "Nenhum cliente cadastrado ainda": o seletor de tutor
        // não pode ficar vazio silenciosamente — orienta a cadastrar um
        // cliente primeiro em vez de deixar o botão "Novo paciente" sem
        // explicação.
        <p className="text-sm text-pine-700">
          Nenhum cliente cadastrado ainda. Cadastre um cliente antes de cadastrar um paciente.
        </p>
      )}

      {pacientes.length === 0 ? (
        <p className="px-1 py-6 text-center text-pine-700">Nenhum paciente encontrado.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pacientes.map((paciente) => {
            const meta = SPECIES_META[paciente.especie];
            const idade = paciente.nascimento ? calcularIdadeLabel(paciente.nascimento) : "";
            return (
              <div
                key={paciente.id}
                className={`flex flex-col gap-3 rounded-md border border-sage-300 bg-white p-4 ${
                  paciente.ativo ? "" : "opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-xl"
                      style={{ background: meta.bg }}
                    >
                      {meta.emoji}
                    </div>
                    <div>
                      <div className="font-medium text-pine-900">
                        {paciente.nome}
                        {!paciente.ativo && <span className="ml-2 text-xs text-pine-700">Inativo</span>}
                      </div>
                      <div className="text-xs text-pine-700">
                        {paciente.raca}
                        {idade ? ` · ${idade}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setPacienteAberto(paciente)}
                      className="rounded px-2 py-1 text-xs text-pine-800 hover:bg-sand-100"
                      title="Editar"
                    >
                      ✎
                    </button>
                    <button
                      type="button"
                      disabled={pendenteId === paciente.id}
                      onClick={() => alternarAtivo(paciente)}
                      className="rounded px-2 py-1 text-xs text-pine-800 hover:bg-sand-100 disabled:opacity-60"
                    >
                      {paciente.ativo ? "Inativar" : "Reativar"}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1 text-xs text-pine-800">
                  <span>{SEXO_LABEL[paciente.sexo] ?? "—"}</span>
                  <span>{pesoLabel(paciente.peso)}</span>
                  <span>{paciente.porte ? (PORTE_LABEL[paciente.porte] ?? "—") : "—"}</span>
                  <span>{paciente.cor || "—"}</span>
                </div>

                {paciente.observacoes && (
                  // Requirement "Características físicas e clínicas", Scenario
                  // "Observações visíveis no card": destaque visual, sem exigir
                  // clique adicional — informação de segurança clínica.
                  <div className="rounded-md bg-gold-500/15 px-2 py-1.5 text-xs text-pine-900">
                    ⚠️ {paciente.observacoes}
                  </div>
                )}

                <div className="border-t border-sage-300 pt-2 text-xs text-pine-800">
                  Tutor: <b>{paciente.cliente.nome}</b>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pacienteAberto && (
        <PacienteModal
          paciente={pacienteAberto === "novo" ? null : pacienteAberto}
          clientesAtivos={clientesAtivos}
          onClose={() => setPacienteAberto(null)}
          onSaved={aoSalvar}
        />
      )}
    </>
  );
}
