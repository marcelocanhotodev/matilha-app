// Grade de pacientes (capability: pacientes). Server Component: filtro por
// espécie e alternância de inativos são query string (sem JS necessário
// para funcionar), mesmo padrão de src/app/(dashboard)/clientes/page.tsx;
// só a grade de cards (modal de cadastro/edição, inativar/reativar)
// precisa de estado de client, isolado em <PacientesGrid>.
//
// Ver openspec/specs/pacientes/spec.md e openspec/changes/implementar-
// pacientes/design.md.

import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PacientesGrid } from "./pacientes-grid";

const ESPECIES_FILTRO = [
  { valor: "", label: "Todos" },
  { valor: "CAO", label: "🐶 Cães" },
  { valor: "GATO", label: "🐱 Gatos" },
  { valor: "OUTRO", label: "🐰 Outros" },
] as const;

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: { especie?: string; inativos?: string };
}) {
  const clinicaId = await getClinicaAtual();
  const especie = searchParams.especie ?? "";
  const mostrarInativos = searchParams.inativos === "1";

  const [pacientes, clientesAtivos] = await Promise.all([
    prisma.paciente.findMany({
      where: {
        clinicaId,
        ...(mostrarInativos ? {} : { ativo: true }),
        ...(especie ? { especie: especie as "CAO" | "GATO" | "OUTRO" } : {}),
      },
      include: { cliente: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    }),
    // Só clientes ativos podem ser tutor de um novo paciente (Requirement
    // "Vínculo obrigatório com um cliente existente").
    prisma.cliente.findMany({
      where: { clinicaId, ativo: true },
      select: { id: true, nome: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  return (
    <main className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-pine-900">Pacientes</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {ESPECIES_FILTRO.map((f) => (
            <a
              key={f.valor}
              href={`?${new URLSearchParams({
                ...(f.valor ? { especie: f.valor } : {}),
                ...(mostrarInativos ? { inativos: "1" } : {}),
              }).toString()}`}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                especie === f.valor
                  ? "border-pine-800 bg-pine-800 text-sand-50"
                  : "border-sage-300 bg-white text-pine-800"
              }`}
            >
              {f.label}
            </a>
          ))}
        </div>

        <form className="flex items-center gap-3" method="get">
          {especie && <input type="hidden" name="especie" value={especie} />}
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

      <PacientesGrid pacientes={pacientes} clientesAtivos={clientesAtivos} />
    </main>
  );
}
