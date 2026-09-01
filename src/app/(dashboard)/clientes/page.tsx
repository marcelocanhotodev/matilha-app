// Listagem de clientes (capability: clientes). Server Component: busca e
// alternância de inativos são query string (sem JS necessário para
// funcionar); só a tabela de ações (editar/inativar/reativar/novo cliente)
// precisa de estado de client, isolado em <ClientesTable>.
//
// Ver openspec/specs/clientes/spec.md e openspec/changes/implementar-
// clientes/design.md.

import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { normalizarDigitos } from "@/lib/validators/cpf-cnpj";
import { ClientesTable } from "./clientes-table";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: { q?: string; inativos?: string };
}) {
  const clinicaId = await getClinicaAtual();
  const busca = searchParams.q?.trim() ?? "";
  const mostrarInativos = searchParams.inativos === "1";

  const digitosBusca = normalizarDigitos(busca);

  const clientes = await prisma.cliente.findMany({
    where: {
      clinicaId,
      ...(mostrarInativos ? {} : { ativo: true }),
      ...(busca
        ? {
            OR: [
              { nome: { contains: busca, mode: "insensitive" } },
              // CPF/CNPJ são gravados normalizados — busca com ou sem
              // máscara funciona porque a query também é normalizada antes
              // de comparar (Scenario "Busca por documento com ou sem
              // máscara").
              ...(digitosBusca ? [{ cpf: { contains: digitosBusca } }, { cnpj: { contains: digitosBusca } }] : []),
            ],
          }
        : {}),
    },
    include: { _count: { select: { pacientes: true } } },
    orderBy: { nome: "asc" },
  });

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-pine-900">Clientes</h1>
      </div>

      <form className="flex flex-wrap items-center gap-3" method="get">
        <input
          type="text"
          name="q"
          defaultValue={busca}
          placeholder="Buscar por nome, CPF ou CNPJ..."
          className="w-72 rounded-md border border-sage-300 bg-white px-3 py-2 text-sm text-pine-900 outline-none focus:border-sage-500"
        />
        <label className="flex items-center gap-2 text-sm text-pine-800">
          <input type="checkbox" name="inativos" value="1" defaultChecked={mostrarInativos} />
          Mostrar inativos
        </label>
        <button
          type="submit"
          className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm hover:border-sage-500"
        >
          Buscar
        </button>
      </form>

      <ClientesTable clientes={clientes} />
    </main>
  );
}
