"use client";

// Gráfico de barras horizontal reutilizável pros rankings do Painel
// (capability: painel-analitico) — itens mais vendidos e clientes com mais
// consumo. "Burro" de propósito: só recebe os dados já agregados e
// ordenados pelo Server Component, nunca faz query nenhuma (design.md,
// Decisão 2).
//
// Forma/marca seguem a skill `dataviz` (ver openspec/changes/
// painel-analitico/tasks.md, task 1.2): série única -> uma cor só, sem
// legenda; barra <=24px, ponta arredondada só no lado do dado; grid sólida
// (nunca tracejada), recessiva; rótulo direto no topo de cada barra (a
// lista já é curta — top 5 — então não fere "nunca um número por ponto").

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COR_BARRA = "#284a40"; // pine-700 — token de marca já usado no resto do produto

// `formatarValor` não pode ser uma função recebida via prop do Server
// Component (RSC não serializa função nenhuma que não seja "use server") —
// por isso a unidade é uma string simples, e o formatador mora aqui dentro.
const FORMATADORES = {
  moeda: (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
  quantidade: (valor: number) => valor.toLocaleString("pt-BR"),
} as const;

export interface ItemRankingBarChart {
  label: string;
  valor: number;
}

export function RankingBarChart({
  dados,
  unidade,
  vazioLabel,
}: {
  dados: ItemRankingBarChart[];
  unidade: keyof typeof FORMATADORES;
  vazioLabel: string;
}) {
  const formatarValor = FORMATADORES[unidade];

  if (dados.length === 0) {
    return <p className="text-sm text-pine-700">{vazioLabel}</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={dados.length * 44 + 16}>
      <BarChart data={dados} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="#e1e0d9" strokeDasharray="0" />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          width={132}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "#52514e", fontSize: 12 }}
        />
        <Tooltip
          cursor={{ fill: "#f5f0e4" }}
          // Recharts tipa `formatter`/`LabelList.formatter` de forma bem mais
          // ampla que "número" (aceita string, array, undefined) — os
          // dados aqui são sempre number, então o cast é seguro.
          formatter={((valor: number) => [formatarValor(valor), "Total"]) as any}
          contentStyle={{ border: "1px solid #c3d4c4", borderRadius: 6, fontSize: 12 }}
        />
        <Bar dataKey="valor" fill={COR_BARRA} radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList dataKey="valor" position="right" formatter={((valor: number) => formatarValor(valor)) as any} fill="#0b0b0b" fontSize={12} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
