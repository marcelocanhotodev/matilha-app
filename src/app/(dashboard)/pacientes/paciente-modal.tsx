"use client";

// Modal de cadastro/edição de paciente (capability: pacientes, tasks 5.1 e
// 5.2). Client Component isolado. Segmented espécie/sexo/castrado e raça
// dependente da espécie reproduzem o comportamento validado em
// openspec/reference/prototipo.html, seção #modal-overlay-paciente.
//
// Validação real (peso > 0, vínculo com cliente existente) acontece na
// Server Action — este componente só dá feedback visual rápido e nunca é a
// única barreira (ver openspec/reference/README.md, "O que não replicar
// 1:1").

import { useMemo, useState } from "react";
import { criarPaciente, editarPaciente } from "@/lib/actions/paciente";
import { BREEDS, especies, type EspecieValor } from "@/lib/validators/paciente";
import { calcularIdadeLabel } from "@/lib/format/idade";
import { Combobox } from "@/components/combobox";
import type { ClienteOpcao, PacienteListItem } from "./pacientes-grid";

const ESPECIE_LABEL: Record<EspecieValor, string> = { CAO: "🐶 Cão", GATO: "🐱 Gato", OUTRO: "🐰 Outro" };
const SEXO_OPCOES = [
  { valor: "MACHO", label: "♂ Macho" },
  { valor: "FEMEA", label: "♀ Fêmea" },
] as const;
const CASTRADO_OPCOES = [
  { valor: "SIM", label: "Sim" },
  { valor: "NAO", label: "Não" },
  { valor: "NAO_INFORMADO", label: "Não sei" },
] as const;
const PORTE_OPCOES = [
  { valor: "PEQUENO", label: "Pequeno" },
  { valor: "MEDIO", label: "Médio" },
  { valor: "GRANDE", label: "Grande" },
] as const;

function ultimaRaca(especie: EspecieValor): string {
  return BREEDS[especie][BREEDS[especie].length - 1];
}

function paraInputDate(data: Date | null): string {
  if (!data) return "";
  return data.toISOString().slice(0, 10);
}

interface FormState {
  clienteId: string;
  nome: string;
  especie: EspecieValor;
  racaSelect: string;
  racaOutra: string;
  sexo: "MACHO" | "FEMEA";
  nascimento: string;
  peso: string;
  cor: string;
  porte: "PEQUENO" | "MEDIO" | "GRANDE";
  castrado: "SIM" | "NAO" | "NAO_INFORMADO";
  microchip: string;
  observacoes: string;
}

function estadoInicial(paciente: PacienteListItem | null, clienteIdPadrao: string): FormState {
  if (!paciente) {
    return {
      clienteId: clienteIdPadrao,
      nome: "",
      especie: "CAO",
      racaSelect: BREEDS.CAO[0],
      racaOutra: "",
      sexo: "MACHO",
      nascimento: "",
      peso: "",
      cor: "",
      porte: "PEQUENO",
      castrado: "NAO_INFORMADO",
      microchip: "",
      observacoes: "",
    };
  }

  const especie = paciente.especie as EspecieValor;
  const racaConhecida = BREEDS[especie].includes(paciente.raca);

  return {
    clienteId: String(paciente.clienteId),
    nome: paciente.nome,
    especie,
    racaSelect: racaConhecida ? paciente.raca : ultimaRaca(especie),
    racaOutra: racaConhecida ? "" : paciente.raca,
    sexo: paciente.sexo as "MACHO" | "FEMEA",
    nascimento: paraInputDate(paciente.nascimento),
    peso: paciente.peso !== null ? String(paciente.peso) : "",
    cor: paciente.cor ?? "",
    porte: (paciente.porte as "PEQUENO" | "MEDIO" | "GRANDE" | null) ?? "PEQUENO",
    castrado: paciente.castrado as "SIM" | "NAO" | "NAO_INFORMADO",
    microchip: paciente.microchip ?? "",
    observacoes: paciente.observacoes ?? "",
  };
}

export function PacienteModal({
  paciente,
  clientesAtivos,
  onClose,
  onSaved,
}: {
  paciente: PacienteListItem | null;
  clientesAtivos: ClienteOpcao[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    estadoInicial(paciente, clientesAtivos[0] ? String(clientesAtivos[0].id) : ""),
  );
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function trocarEspecie(especie: EspecieValor) {
    // Scenario "Troca de espécie após já ter escolhido raça": a lista de
    // raças recarrega para a nova espécie e a seleção anterior é descartada.
    setForm((f) => ({ ...f, especie, racaSelect: BREEDS[especie][0], racaOutra: "" }));
  }

  const racaEhOutra = form.racaSelect === ultimaRaca(form.especie);

  const idadeHint = useMemo(() => {
    if (!form.nascimento) return "";
    const label = calcularIdadeLabel(new Date(`${form.nascimento}T00:00:00`));
    return label ? `(${label})` : "";
  }, [form.nascimento]);

  async function aoSalvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    const payload = {
      clienteId: form.clienteId,
      nome: form.nome,
      especie: form.especie,
      raca: racaEhOutra ? form.racaOutra : form.racaSelect,
      sexo: form.sexo,
      nascimento: form.nascimento || undefined,
      peso: form.peso || undefined,
      cor: form.cor || undefined,
      porte: form.porte,
      castrado: form.castrado,
      microchip: form.microchip || undefined,
      observacoes: form.observacoes || undefined,
    };

    const resultado = paciente ? await editarPaciente(paciente.id, payload) : await criarPaciente(payload);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar o paciente.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-pine-900">{paciente ? "Editar paciente" : "Novo paciente"}</h3>
          <button type="button" onClick={onClose} className="text-pine-700 hover:text-pine-900" aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={aoSalvar} className="flex flex-col gap-4">
          <Campo label="Tutor">
            <Combobox
              options={clientesAtivos.map((c) => ({ value: String(c.id), label: c.nome }))}
              value={form.clienteId || null}
              onChange={(valor) => set("clienteId", valor)}
              placeholder="Selecionar tutor..."
              buscaPlaceholder="Buscar tutor..."
              vazioLabel="Nenhum tutor encontrado."
            />
          </Campo>

          <Campo label="Nome do pet">
            <input
              type="text"
              required
              placeholder="Ex: Thor"
              value={form.nome}
              onChange={(e) => set("nome", e.target.value)}
              className="campo-input"
            />
          </Campo>

          <div className="flex flex-col gap-1 text-sm text-pine-800">
            <span>Espécie</span>
            <div className="flex gap-2">
              {especies.map((opcao) => (
                <button
                  key={opcao}
                  type="button"
                  onClick={() => trocarEspecie(opcao)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    form.especie === opcao ? "border-pine-800 bg-pine-800 text-sand-50" : "border-sage-300 bg-white text-pine-800"
                  }`}
                >
                  {ESPECIE_LABEL[opcao]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Campo label="Raça">
              <select value={form.racaSelect} onChange={(e) => set("racaSelect", e.target.value)} className="campo-input">
                {BREEDS[form.especie].map((raca) => (
                  <option key={raca} value={raca}>
                    {raca}
                  </option>
                ))}
              </select>
              {racaEhOutra && (
                <input
                  type="text"
                  required
                  placeholder="Especifique a raça"
                  value={form.racaOutra}
                  onChange={(e) => set("racaOutra", e.target.value)}
                  className="campo-input mt-2"
                />
              )}
            </Campo>

            <div className="flex flex-1 flex-col gap-1 text-sm text-pine-800">
              <span>Sexo</span>
              <div className="flex gap-2">
                {SEXO_OPCOES.map((opcao) => (
                  <button
                    key={opcao.valor}
                    type="button"
                    onClick={() => set("sexo", opcao.valor)}
                    className={`rounded-md border px-3 py-1.5 text-sm ${
                      form.sexo === opcao.valor ? "border-pine-800 bg-pine-800 text-sand-50" : "border-sage-300 bg-white text-pine-800"
                    }`}
                  >
                    {opcao.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Campo label={`Data de nascimento ${idadeHint}`}>
            <input type="date" value={form.nascimento} onChange={(e) => set("nascimento", e.target.value)} className="campo-input" />
          </Campo>

          <div className="flex gap-3">
            <Campo label="Peso (kg)">
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Ex: 12.5"
                value={form.peso}
                onChange={(e) => set("peso", e.target.value)}
                className="campo-input"
              />
            </Campo>
            <Campo label="Porte">
              <select value={form.porte} onChange={(e) => set("porte", e.target.value as FormState["porte"])} className="campo-input">
                {PORTE_OPCOES.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Cor da pelagem">
            <input
              type="text"
              placeholder="Ex: Caramelo, Preto e branco"
              value={form.cor}
              onChange={(e) => set("cor", e.target.value)}
              className="campo-input"
            />
          </Campo>

          <div className="flex flex-col gap-1 text-sm text-pine-800">
            <span>Castrado(a)?</span>
            <div className="flex gap-2">
              {CASTRADO_OPCOES.map((opcao) => (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => set("castrado", opcao.valor)}
                  className={`rounded-md border px-3 py-1.5 text-sm ${
                    form.castrado === opcao.valor ? "border-pine-800 bg-pine-800 text-sand-50" : "border-sage-300 bg-white text-pine-800"
                  }`}
                >
                  {opcao.label}
                </button>
              ))}
            </div>
          </div>

          <Campo label="Microchip (opcional)">
            <input
              type="text"
              placeholder="Nº de identificação"
              value={form.microchip}
              onChange={(e) => set("microchip", e.target.value)}
              className="campo-input"
            />
          </Campo>

          <Campo label="Alergias e observações">
            <textarea
              rows={3}
              placeholder="Ex: Alérgico a frango, ansioso em consultas, toma medicação contínua..."
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
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
              {enviando ? "Salvando..." : paciente ? "Salvar alterações" : "Adicionar paciente"}
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
