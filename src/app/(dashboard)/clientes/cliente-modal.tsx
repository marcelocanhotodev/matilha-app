"use client";

// Modal de cadastro/edição de cliente (capability: clientes, tasks 4.2 e
// 6.1). Client Component isolado. Segmented física/jurídica, máscaras
// (src/lib/format/mascaras.ts, portadas do protótipo) e busca de endereço
// por CEP (src/lib/actions/cep.ts) reproduzem o comportamento validado em
// openspec/reference/prototipo.html, seção #modal-overlay-cliente.
//
// Validação real (dígito verificador de CPF/CNPJ, formato de e-mail,
// duplicidade) acontece na Server Action — este componente só dá feedback
// visual rápido e nunca é a única barreira (ver openspec/reference/
// README.md, "O que não replicar 1:1").

import { useRef, useState } from "react";
import { criarCliente, editarCliente } from "@/lib/actions/cliente";
import { buscarEnderecoPorCep } from "@/lib/actions/cep";
import { maskCPF, maskCNPJ, maskCelular, maskCEP } from "@/lib/format/mascaras";
import type { ClienteListItem } from "./clientes-table";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

function paraInputDate(data: Date | null): string {
  if (!data) return "";
  return data.toISOString().slice(0, 10);
}

interface FormState {
  tipo: "FISICA" | "JURIDICA";
  nome: string;
  cpf: string;
  nascimento: string;
  cnpj: string;
  ie: string;
  email: string;
  celular: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
}

function estadoInicial(cliente: ClienteListItem | null): FormState {
  if (!cliente) {
    return {
      tipo: "FISICA",
      nome: "",
      cpf: "",
      nascimento: "",
      cnpj: "",
      ie: "",
      email: "",
      celular: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      uf: "",
    };
  }
  return {
    tipo: cliente.tipo,
    nome: cliente.nome,
    cpf: cliente.cpf ? maskCPF(cliente.cpf) : "",
    nascimento: paraInputDate(cliente.nascimento),
    cnpj: cliente.cnpj ? maskCNPJ(cliente.cnpj) : "",
    ie: cliente.ie ?? "",
    email: cliente.email,
    celular: cliente.celular ? maskCelular(cliente.celular) : "",
    cep: cliente.cep ? maskCEP(cliente.cep) : "",
    logradouro: cliente.logradouro ?? "",
    numero: cliente.numero ?? "",
    complemento: cliente.complemento ?? "",
    bairro: cliente.bairro ?? "",
    cidade: cliente.cidade ?? "",
    uf: cliente.uf ?? "",
  };
}

export function ClienteModal({
  cliente,
  onClose,
  onSaved,
}: {
  cliente: ClienteListItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<FormState>(() => estadoInicial(cliente));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // Campos de endereço que o usuário editou manualmente desde a última busca
  // de CEP — a busca nunca sobrescreve um campo tocado (Requirement
  // "Endereço com preenchimento automático por CEP").
  const enderecoTocado = useRef<Set<string>>(new Set());

  function set<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  function setEnderecoTocado(campo: string, valor: string) {
    enderecoTocado.current.add(campo);
    setForm((f) => ({ ...f, [campo]: valor }));
  }

  async function aoSairDoCep() {
    const resultado = await buscarEnderecoPorCep(form.cep);
    if (!resultado.encontrado) return; // não bloqueia o cadastro

    setForm((f) => ({
      ...f,
      logradouro: enderecoTocado.current.has("logradouro") ? f.logradouro : resultado.logradouro ?? f.logradouro,
      bairro: enderecoTocado.current.has("bairro") ? f.bairro : resultado.bairro ?? f.bairro,
      cidade: enderecoTocado.current.has("cidade") ? f.cidade : resultado.cidade ?? f.cidade,
      uf: enderecoTocado.current.has("uf") ? f.uf : resultado.uf ?? f.uf,
    }));
  }

  async function aoSalvar(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);

    const camposComuns = {
      email: form.email,
      celular: form.celular || undefined,
      cep: form.cep || undefined,
      logradouro: form.logradouro || undefined,
      numero: form.numero || undefined,
      complemento: form.complemento || undefined,
      bairro: form.bairro || undefined,
      cidade: form.cidade || undefined,
      uf: form.uf || undefined,
    };

    const payload =
      form.tipo === "FISICA"
        ? { tipo: "FISICA" as const, nome: form.nome, cpf: form.cpf, nascimento: form.nascimento || undefined, ...camposComuns }
        : { tipo: "JURIDICA" as const, nome: form.nome, cnpj: form.cnpj, ie: form.ie || undefined, ...camposComuns };

    const resultado = cliente ? await editarCliente(cliente.id, payload) : await criarCliente(payload);

    setEnviando(false);

    if (!resultado.ok) {
      setErro(resultado.erro ?? "Não foi possível salvar o cliente.");
      return;
    }

    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-pine-900/40 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-md bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl text-pine-900">{cliente ? "Editar cliente" : "Novo cliente"}</h3>
          <button type="button" onClick={onClose} className="text-pine-700 hover:text-pine-900" aria-label="Fechar">
            ×
          </button>
        </div>

        <form onSubmit={aoSalvar} className="flex flex-col gap-4">
          <div className="flex gap-2">
            {(["FISICA", "JURIDICA"] as const).map((opcao) => (
              <button
                key={opcao}
                type="button"
                onClick={() => set("tipo", opcao)}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  form.tipo === opcao
                    ? "border-pine-800 bg-pine-800 text-sand-50"
                    : "border-sage-300 bg-white text-pine-800"
                }`}
              >
                {opcao === "FISICA" ? "Pessoa física" : "Pessoa jurídica"}
              </button>
            ))}
          </div>

          {form.tipo === "FISICA" ? (
            <div className="flex flex-col gap-3">
              <Campo label="Nome completo">
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  className="campo-input"
                />
              </Campo>
              <div className="flex gap-3">
                <Campo label="CPF">
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={form.cpf}
                    onChange={(e) => set("cpf", maskCPF(e.target.value))}
                    className="campo-input"
                  />
                </Campo>
                <Campo label="Data de nascimento">
                  <input
                    type="date"
                    value={form.nascimento}
                    onChange={(e) => set("nascimento", e.target.value)}
                    className="campo-input"
                  />
                </Campo>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Campo label="Razão social">
                <input
                  type="text"
                  required
                  value={form.nome}
                  onChange={(e) => set("nome", e.target.value)}
                  className="campo-input"
                />
              </Campo>
              <div className="flex gap-3">
                <Campo label="CNPJ">
                  <input
                    type="text"
                    required
                    maxLength={18}
                    value={form.cnpj}
                    onChange={(e) => set("cnpj", maskCNPJ(e.target.value))}
                    className="campo-input"
                  />
                </Campo>
                <Campo label="Inscrição estadual">
                  <input
                    type="text"
                    value={form.ie}
                    onChange={(e) => set("ie", e.target.value)}
                    className="campo-input"
                  />
                </Campo>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Campo label="E-mail (recebe a nota fiscal)">
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="campo-input"
              />
            </Campo>
            <Campo label="Celular">
              <input
                type="text"
                maxLength={15}
                value={form.celular}
                onChange={(e) => set("celular", maskCelular(e.target.value))}
                className="campo-input"
              />
            </Campo>
          </div>

          <div className="flex gap-3">
            <Campo label="CEP" className="max-w-[150px]">
              <input
                type="text"
                maxLength={9}
                value={form.cep}
                onChange={(e) => set("cep", maskCEP(e.target.value))}
                onBlur={aoSairDoCep}
                className="campo-input"
              />
            </Campo>
            <Campo label="Logradouro" className="flex-[2]">
              <input
                type="text"
                placeholder="Preenchido automaticamente pelo CEP"
                value={form.logradouro}
                onChange={(e) => setEnderecoTocado("logradouro", e.target.value)}
                className="campo-input"
              />
            </Campo>
          </div>

          <div className="flex gap-3">
            <Campo label="Número">
              <input
                type="text"
                value={form.numero}
                onChange={(e) => set("numero", e.target.value)}
                className="campo-input"
              />
            </Campo>
            <Campo label="Complemento">
              <input
                type="text"
                value={form.complemento}
                onChange={(e) => set("complemento", e.target.value)}
                className="campo-input"
              />
            </Campo>
          </div>

          <div className="flex gap-3">
            <Campo label="Bairro" className="flex-[2]">
              <input
                type="text"
                value={form.bairro}
                onChange={(e) => setEnderecoTocado("bairro", e.target.value)}
                className="campo-input"
              />
            </Campo>
            <Campo label="UF" className="max-w-[90px]">
              <select
                value={form.uf}
                onChange={(e) => setEnderecoTocado("uf", e.target.value)}
                className="campo-input"
              >
                <option value="">–</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </Campo>
          </div>

          <Campo label="Cidade">
            <input
              type="text"
              value={form.cidade}
              onChange={(e) => setEnderecoTocado("cidade", e.target.value)}
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
              {enviando ? "Salvando..." : cliente ? "Salvar alterações" : "Adicionar cliente"}
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
