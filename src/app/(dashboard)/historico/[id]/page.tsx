// Tela de detalhes de um atendimento finalizado (capability: historico-
// financeiro) — primeira rota dinâmica do projeto. Server Component
// somente leitura: isolamento por clínica e por status acontece dentro de
// `buscarComandaFinalizada` (id/clinicaId/status no mesmo `where`), então
// esta página só decide 404 com base no retorno `null`.
//
// Ver openspec/specs/historico-financeiro/spec.md e openspec/changes/
// implementar-historico/design.md, Decisão "Rota /historico/[id]...".

import Link from "next/link";
import { notFound } from "next/navigation";
import { getClinicaAtual } from "@/lib/tenant";
import { buscarComandaFinalizada } from "@/lib/historico";
import { paraComponentesClinica } from "@/lib/timezone";

const FORMA_PAGAMENTO_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
};

function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function dataHora(instante: Date): string {
  const { dia, mes, ano, hora, minuto } = paraComponentesClinica(instante);
  const d = String(dia).padStart(2, "0");
  const m = String(mes).padStart(2, "0");
  const h = String(hora).padStart(2, "0");
  const min = String(minuto).padStart(2, "0");
  return `${d}/${m}/${ano} ${h}:${min}`;
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-md border border-sage-300 bg-white p-4">
      <div className="text-xs uppercase tracking-wide text-pine-700">{label}</div>
      <div className="mt-1 text-pine-900">{valor}</div>
    </div>
  );
}

export default async function HistoricoDetalhePage({ params }: { params: { id: string } }) {
  // `params.id` não numérico (ou vazio/decimal) nunca deve virar uma query
  // no banco — vira 404 aqui mesmo, antes de qualquer acesso a dado.
  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    notFound();
  }

  const clinicaId = await getClinicaAtual();
  const comanda = await buscarComandaFinalizada(id, clinicaId);
  if (!comanda) {
    // Cobre em uma única checagem: id inexistente, id de outra clínica, e
    // comanda que existe mas não está FINALIZADA — nunca um 403, sempre 404
    // (mesmo padrão de isolamento do resto do projeto).
    notFound();
  }

  const origem = comanda.agendamento
    ? `Agendamento — ${dataHora(comanda.agendamento.dataHoraInicio)}`
    : "Atendimento avulso";

  return (
    <main className="flex flex-col gap-4">
      <div>
        <Link href="/historico" className="text-sm text-pine-700 hover:text-pine-900">
          ← Voltar ao histórico
        </Link>
      </div>

      <h1 className="font-display text-2xl text-pine-900">Atendimento — {dataHora(comanda.criadoEm)}</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Campo label="Pet" valor={comanda.paciente?.nome ?? "—"} />
        <Campo label="Tutor" valor={comanda.cliente?.nome ?? "—"} />
        <Campo label="Veterinário(a)" valor={comanda.veterinario?.nome ?? "—"} />
        <Campo label="Origem" valor={origem} />
      </div>

      <div className="overflow-hidden rounded-md border border-sage-300 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sage-300 bg-sand-50 text-xs uppercase tracking-wide text-pine-700">
            <tr>
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Quantidade</th>
              <th className="px-4 py-2">Preço unitário</th>
              <th className="px-4 py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {comanda.itens.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-pine-700">
                  Nenhum item registrado nesta comanda.
                </td>
              </tr>
            ) : (
              comanda.itens.map((item) => (
                <tr key={item.id} className="border-b border-sage-300 last:border-0">
                  <td className="px-4 py-2 text-pine-900">{item.nomeSnapshot}</td>
                  <td className="px-4 py-2 text-pine-800">{item.quantidade}</td>
                  <td className="px-4 py-2 text-pine-800">{moeda(item.precoSnapshot)}</td>
                  <td className="px-4 py-2 font-medium text-pine-900">{moeda(item.subtotal)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-1 self-end rounded-md border border-sage-300 bg-white p-4 text-sm sm:w-72">
        <div className="flex items-center justify-between text-pine-800">
          <span>Subtotal</span>
          <span className="font-mono">{moeda(comanda.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-pine-800">
          <span>Desconto</span>
          <span className="font-mono">{moeda(comanda.desconto)}</span>
        </div>
        <div className="flex items-center justify-between border-t border-sage-300 pt-1 font-display text-lg text-pine-900">
          <span>Total</span>
          <span>{moeda(comanda.total)}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-pine-800">
          <span>Forma de pagamento</span>
          <span>
            {comanda.formaPagamento
              ? FORMA_PAGAMENTO_LABEL[comanda.formaPagamento] ?? comanda.formaPagamento
              : "—"}
          </span>
        </div>
      </div>
    </main>
  );
}
