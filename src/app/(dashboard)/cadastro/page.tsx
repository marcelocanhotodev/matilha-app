// Listagem de itens de catálogo (capability: catalogo-produtos-servicos).
// Server Component: filtro por categoria e alternância de inativos são
// query string (sem JS necessário para funcionar), mesmo padrão de
// src/app/(dashboard)/pacientes/page.tsx; só a tabela de ações (editar/
// inativar/reativar/novo item) precisa de estado de client, isolado em
// <CatalogoTable>.
//
// Ver openspec/specs/catalogo-produtos-servicos/spec.md e
// openspec/changes/implementar-catalogo-produtos-servicos/design.md.

import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { CatalogoTable } from "./catalogo-table";

const CATEGORIAS_FILTRO = [
  { valor: "", label: "Todos" },
  { valor: "SERVICO", label: "Serviços" },
  { valor: "PRODUTO", label: "Produtos" },
] as const;

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: { categoria?: string; inativos?: string };
}) {
  const clinicaId = await getClinicaAtual();
  const categoria = searchParams.categoria ?? "";
  const mostrarInativos = searchParams.inativos === "1";

  const itens = await prisma.itemCatalogo.findMany({
    where: {
      clinicaId,
      ...(mostrarInativos ? {} : { ativo: true }),
      ...(categoria ? { categoria: categoria as "SERVICO" | "PRODUTO" } : {}),
    },
    orderBy: { nome: "asc" },
  });

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-pine-900">Catálogo de produtos e serviços</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS_FILTRO.map((f) => (
            <a
              key={f.valor}
              href={`?${new URLSearchParams({
                ...(f.valor ? { categoria: f.valor } : {}),
                ...(mostrarInativos ? { inativos: "1" } : {}),
              }).toString()}`}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                categoria === f.valor
                  ? "border-pine-800 bg-pine-800 text-sand-50"
                  : "border-sage-300 bg-white text-pine-800"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        <form className="flex items-center gap-3" method="get">
          {categoria && <input type="hidden" name="categoria" value={categoria} />}
          <label className="flex items-center gap-2 text-sm text-pine-800">
            <input type="checkbox" name="inativos" value="1" defaultChecked={mostrarInativos} />
            Mostrar inativos
          </label>
          <button
            type="submit"
            className="rounded-md border border-sage-300 bg-white px-3 py-2 text-sm hover:border-sage-500"
          >
            Aplicar
          </button>
        </form>
      </div>

      <CatalogoTable itens={itens} />
    </main>
  );
}
