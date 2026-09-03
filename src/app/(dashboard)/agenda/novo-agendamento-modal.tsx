"use client";

// Formulário de novo agendamento (Requirement: Criação de agendamento).
// Client Component isolado. Paciente via combobox (busca por pet/tutor);
// veterinário continua `<select>` simples (lista pequena por natureza —
// design.md, Decisão 3). Selecionar um serviço com duração padrão
// pré-preenche o campo de duração, que continua editável (Decisão 2).
// Conflito de horário não abre modal novo: o próprio formulário mostra o
// aviso e troca o texto do botão (Decisão 6).

import { useState } from "react";
import type { ItemCatalogo } from "@prisma/client";
import { criarAgendamento, type ConflitoAgendamento } from "@/lib/actions/agendamento";
import { Combobox } from "@/components/combobox";

export interface PacienteOpcao {
  id: number;
  nome: string;
  tutorNome: string;
}

export interface VeterinarioOpcao {
  id: number;
  nome: string;
}

export function NovoAgendamentoModal({
  pacientes,
  veterinarios,
  catalogo,
  dataInicial,
  horaInicial,
  onClose,
  onSaved,
}: {
  pacientes: PacienteOpcao[];
  veterinarios: VeterinarioOpcao[];
  catalogo: ItemCatalogo[];
  dataInicial: string; // yyyy-mm-dd
  horaInicial: string; // HH:mm
  onClose: () => void;
  onSaved: () => void;
}) {
  const [pacienteId, setPacienteId] = useState<string | null>(null);
  const [veterinarioId, setVeterinarioId] = useState<number | string>(veterinarios[0]?.id ?? "");
  const [itemCatalogoId, setItemCatalogoId] = useState("");
  const [data, setData] = useState(dataInicial);
  const [hora, setHora] = useState(horaInicial);
  const [duracaoMinutos, setDuracaoMinutos] = useState("60");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [conflito, setConflito] = useState<ConflitoAgendamento[] | null>(null);

  const servicosAtivos = catalogo.filter((i) => i.categoria === "SERVICO");

  function aoEscolherServico(id: string) {
    setItemCatalogoId(id);
    setConflito(null);
    const item = catalogo.find((i) => i.id === Number(id));
    if (item?.duracaoPadraoMinutos) {
      setDuracaoMinutos(String(item.duracaoPadraoMinutos));
    }
  }

  async function aoSalvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);

    if (!pacienteId) {
      setErro("Paciente é obrigatório.");
      return;
    }

    setEnviando(true);
    const resultado = await criarAgendamento({
      pacienteId,
      veterinarioId,
      itemCatalogoId: itemCatalogoId || undefined,
      // `data`+`hora` separados — a combinação num instante real (sempre
      // no fuso da clínica) acontece no validador, não aqui (ver
      // openspec/changes/corrigir-fuso-horario-agenda/design.md).
      data,
      hora,
      duracaoMinutos,
      ignorarConflito: conflito !== null, // já mostrou o aviso — este clique é "salvar mesmo assim"
    });
    setEnviando(false);

    if (!resultado.ok) {
      if (resultado.conflito) {
        setConflito(resultado.conflito);
        return;
      }
      setErro(resultado.erro ?? "Não foi possível criar o agendamento.");
      return;
    }

    onSaved();
  }

  const opcoesPaciente = pacientes.map((p) => ({ value: String(p.id), label: p.nome, sublabel: p.tutorNome }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-md bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-pine-900">Novo agendamento</h3>
          <button type="button" onClick={onClose} className="text-pine-700 hover:text-pine-900" aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={aoSalvar} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm text-pine-800">
            Paciente
            <Combobox
              options={opcoesPaciente}
              value={pacienteId}
              onChange={(valor) => {
                setPacienteId(valor);
                setConflito(null);
              }}
              placeholder="Selecionar paciente..."
              buscaPlaceholder="Buscar por pet ou tutor..."
              vazioLabel="Nenhum paciente encontrado."
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-pine-800">
            Veterinário
            <select
              required
              value={veterinarioId}
              onChange={(e) => {
                setVeterinarioId(e.target.value);
                setConflito(null);
              }}
              className="campo-input"
            >
              {veterinarios.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nome}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm text-pine-800">
            Serviço previsto
            <select
              value={itemCatalogoId}
              onChange={(e) => aoEscolherServico(e.target.value)}
              className="campo-input"
            >
              <option value="">Nenhum</option>
              {servicosAtivos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-sm text-pine-800">
              Data
              <input
                type="date"
                required
                value={data}
                onChange={(e) => {
                  setData(e.target.value);
                  setConflito(null);
                }}
                className="campo-input"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-pine-800">
              Horário
              <input
                type="time"
                required
                value={hora}
                onChange={(e) => {
                  setHora(e.target.value);
                  setConflito(null);
                }}
                className="campo-input"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-sm text-pine-800">
              Duração (min)
              <input
                type="number"
                required
                min="1"
                step="1"
                value={duracaoMinutos}
                onChange={(e) => {
                  setDuracaoMinutos(e.target.value);
                  setConflito(null);
                }}
                className="campo-input"
              />
            </label>
          </div>

          {conflito && (
            // Requirement "Criação de agendamento", Scenario "Conflito de
            // horário para o mesmo profissional" — alerta, nunca bloqueio.
            <div className="rounded-md border border-gold-600 bg-gold-500/15 px-3 py-2 text-sm text-pine-900">
              <p className="font-medium">Esse horário conflita com:</p>
              <ul className="mt-1 list-disc pl-4">
                {conflito.map((c) => (
                  <li key={c.agendamentoId}>
                    {c.pacienteNome} ({c.inicio}–{c.fim})
                  </li>
                ))}
              </ul>
            </div>
          )}

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
              {enviando ? "Salvando..." : conflito ? "Salvar mesmo assim" : "Salvar agendamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
