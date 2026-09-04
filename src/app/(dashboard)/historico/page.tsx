// Listagem de histórico financeiro (capability: historico-financeiro).
// Server Component puro: paginação via query string (`?page=N`), mesmo
// espírito de clientes/page.tsx e pacientes/page.tsx — sem nenhum JS de
// client necessário pra funcionar. Cada linha da tabela navega pra
// /historico/[id] (rota de verdade, por isso usa <Link>, diferente da
// paginação em si, que usa <a href="?..."> como o resto do projeto).
//
// Ver openspec/specs/historico-financeiro/spec.md e openspec/changes/
// implementar-historico/design.md.

import Link from "next/link";
import { redirect } from "next/navigation";
import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { listarHistorico, totaisHistorico } from "@/lib/historico";
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

// `HH:mm` já é o padrão de exibição em agenda/grade-semanal.tsx; aqui junta
// com a data — sempre via paraComponentesClinica (nunca getHours()/etc
// direto num Date, ver src/lib/timezone.ts).
function dataHora(instante: Date): string {
  const { dia, mes, ano, hora, minuto } = paraComponentesClinica(instante);
  const d = String(dia).padStart(2, "0");
  const m = String(mes).padStart(2, "0");
  const h = String(hora).padStart(2, "0");
  const min = String(minuto).padStart(2, "0");
  return `${d}/${m}/${ano} ${h}:${min}`;
}

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const clinicaId = await getClinicaAtual();

  const clinica = await prisma.clinica.findUniqueOrThrow({
    where: { id: clinicaId },
    select: { itensPorPaginaHistorico: true },
  });
  const porPagina = clinica.itensPorPaginaHistorico;

  const pageParam = Number(searchParams.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  const [{ comandas, totalPaginas }, totais] = await Promise.all([
    listarHistorico(clinicaId, { page, porPagina }),
    totaisHistorico(clinicaId),
  ]);

  // `listarHistorico` já lida com página além do total sem erro (retorna
  // lista vazia) — mas exibir isso como se fosse "nenhuma comanda
  // finalizada ainda" seria enganoso, e "página 99 de 3" não faz sentido.
  // Redireciona pra última página válida em vez disso.
  if (page > totalPaginas) {
    redirect(`/historico?page=${totalPaginas}`);
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-pine-900">Histórico</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-md border border-sage-300 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-pine-700">Arrecadado</div>
          <div className="mt-1 font-display text-xl text-pine-900">{moeda(totais.arrecadado)}</div>
        </div>
        <div className="rounded-md border border-sage-300 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-pine-700">Atendimentos</div>
          <div className="mt-1 font-display text-xl text-pine-900">{totais.quantidade}</div>
        </div>
        <div className="rounded-md border border-sage-300 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-pine-700">Ticket médio</div>
          <div className="mt-1 font-display text-xl text-pine-900">
            {totais.ticketMedio !== null ? moeda(totais.ticketMedio) : "—"}
          </div>
        </div>
        <div className="rounded-md border border-sage-300 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-pine-700">Forma mais frequente</div>
          <div className="mt-1 font-display text-xl text-pine-900">
            {totais.formaMaisFrequente
              ? FORMA_PAGAMENTO_LABEL[totais.formaMaisFrequente] ?? totais.formaMaisFrequente
              : "—"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-sage-300 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-sage-300 bg-sand-50 text-xs uppercase tracking-wide text-pine-700">
            <tr>
              <th className="px-4 py-2">Horário</th>
              <th className="px-4 py-2">Pet/Tutor</th>
              <th className="px-4 py-2">Pagamento</th>
              <th className="px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {comandas.length === 0 ? (
              // Requirement "Nenhuma comanda finalizada ainda" — cards acima
              // já vêm zerados de totaisHistorico; aqui só a mensagem, nunca
              // erro nem tabela em branco.
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-pine-700">
                  Nenhuma comanda finalizada ainda.
                </td>
              </tr>
            ) : (
              comandas.map((c) => (
                <tr key={c.id} className="border-b border-sage-300 last:border-0 hover:bg-sand-100">
                  <td className="p-0">
                    <Link href={`/historico/${c.id}`} className="block px-4 py-2 text-pine-800">
                      {dataHora(c.criadoEm)}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/historico/${c.id}`} className="block px-4 py-2">
                      <div className="font-medium text-pine-900">{c.pacienteNome ?? "—"}</div>
                      <div className="text-xs text-pine-700">{c.clienteNome ?? "—"}</div>
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/historico/${c.id}`} className="block px-4 py-2 text-pine-800">
                      {c.formaPagamento ? FORMA_PAGAMENTO_LABEL[c.formaPagamento] ?? c.formaPagamento : "—"}
                    </Link>
                  </td>
                  <td className="p-0">
                    <Link href={`/historico/${c.id}`} className="block px-4 py-2 font-medium text-pine-900">
                      {moeda(c.total)}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-pine-700">
          <span>
            Página {page} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={`?page=${page - 1}`}
                className="rounded-md border border-sage-300 bg-white px-3 py-1.5 hover:border-sage-500"
              >
                Anterior
              </a>
            )}
            {page < totalPaginas && (
              <a
                href={`?page=${page + 1}`}
                className="rounded-md border border-sage-300 bg-white px-3 py-1.5 hover:border-sage-500"
              >
                Próxima
              </a>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
