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
import { listarHistorico, totaisHistorico, type PeriodoHistorico } from "@/lib/historico";
import { fimDoDiaClinica, inicioDoDiaClinica, paraComponentesClinica, paraDiaCalendarioDeChave } from "@/lib/timezone";

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
  searchParams: { page?: string; inicio?: string; fim?: string };
}) {
  const clinicaId = await getClinicaAtual();

  const clinica = await prisma.clinica.findUniqueOrThrow({
    where: { id: clinicaId },
    select: { itensPorPaginaHistorico: true },
  });
  const porPagina = clinica.itensPorPaginaHistorico;

  const pageParam = Number(searchParams.page);
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;

  // Requirement "Filtro por período". Os dois lados precisam parsear pra
  // valer — um só (ou nenhum) é tratado como "sem filtro", nunca um
  // intervalo aberto (Non-Goal, ver design.md). `defaultValue` dos inputs
  // sempre usa a string crua, mesmo quando ela não parseia.
  const inicioStr = searchParams.inicio ?? "";
  const fimStr = searchParams.fim ?? "";
  const diaInicio = inicioStr ? paraDiaCalendarioDeChave(inicioStr) : null;
  const diaFim = fimStr ? paraDiaCalendarioDeChave(fimStr) : null;

  let periodo: PeriodoHistorico | undefined;
  let erroPeriodo: string | null = null;

  if (diaInicio && diaFim) {
    const inicio = inicioDoDiaClinica(diaInicio);
    const fim = fimDoDiaClinica(diaFim);
    if (inicio.getTime() > fim.getTime()) {
      // Intervalo inconsistente: mensagem de erro, filtro não aplicado
      // (histórico completo é o único "estado anterior" que existe num
      // Server Component puro — ver design.md).
      erroPeriodo = "Data inicial não pode ser depois da data final — filtro não aplicado.";
    } else {
      periodo = { inicio, fim };
    }
  }

  const filtroPreenchido = inicioStr !== "" || fimStr !== "";

  // Monta a query string de um link de paginação preservando o filtro
  // ativo (cru, como veio da URL) — nunca só o `page` novo.
  function queryComPagina(novaPagina: number): string {
    const params = new URLSearchParams();
    if (inicioStr) params.set("inicio", inicioStr);
    if (fimStr) params.set("fim", fimStr);
    params.set("page", String(novaPagina));
    return `?${params.toString()}`;
  }

  const [{ comandas, totalPaginas }, totais] = await Promise.all([
    listarHistorico(clinicaId, { page, porPagina, periodo }),
    totaisHistorico(clinicaId, periodo),
  ]);

  // `listarHistorico` já lida com página além do total sem erro (retorna
  // lista vazia) — mas exibir isso como se fosse "nenhuma comanda
  // finalizada ainda" seria enganoso, e "página 99 de 3" não faz sentido.
  // Redireciona pra última página válida em vez disso, preservando o
  // filtro ativo.
  if (page > totalPaginas) {
    redirect(`/historico${queryComPagina(totalPaginas)}`);
  }

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-pine-900">Histórico</h1>

      <form className="flex flex-wrap items-end gap-3" method="get">
        <label className="flex flex-col gap-1 text-sm text-pine-800">
          Data inicial
          <input
            type="date"
            name="inicio"
            defaultValue={inicioStr}
            className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-pine-900 outline-none focus:border-sage-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-pine-800">
          Data final
          <input
            type="date"
            name="fim"
            defaultValue={fimStr}
            className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-pine-900 outline-none focus:border-sage-500"
          />
        </label>
        <button
          type="submit"
          className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm hover:border-sage-500"
        >
          Aplicar
        </button>
        {filtroPreenchido && (
          <Link href="/historico" className="text-sm text-pine-700 hover:text-pine-900">
            Limpar filtro
          </Link>
        )}
      </form>

      {erroPeriodo && <p className="text-sm text-red-700">{erroPeriodo}</p>}

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
                href={queryComPagina(page - 1)}
                className="rounded-md border border-sage-300 bg-white px-3 py-1.5 hover:border-sage-500"
              >
                Anterior
              </a>
            )}
            {page < totalPaginas && (
              <a
                href={queryComPagina(page + 1)}
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
