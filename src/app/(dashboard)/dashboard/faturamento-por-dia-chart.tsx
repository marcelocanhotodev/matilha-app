"use client";

// Série temporal — faturamento por dia, últimos 14 dias (capability:
// painel-analitico). Série única -> uma cor só, sem legenda (skill
// `dataviz`). Rótulo direto só no último ponto (hoje) — nunca um valor em
// cada um dos 14 dias, isso seria ruído (marks-and-anatomy.md: "label
// selectively, never a number on every point").

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const COR_LINHA = "#284a40"; // pine-700

export interface PontoFaturamentoDia {
  data: string; // yyyy-mm-dd
  total: number;
}

function formatarDiaCurto(chave: string): string {
  const partes = chave.split("-");
  return `${partes[2]}/${partes[1]}`;
}

interface LabelUltimoPontoProps {
  x?: number | string;
  y?: number | string;
  index?: number;
}

// Formatador mora aqui dentro (não vem via prop) — função não é
// serializável através da fronteira Server->Client Component.
function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FaturamentoPorDiaChart({ dados }: { dados: PontoFaturamentoDia[] }) {
  const semVendas = dados.every((d) => d.total === 0);
  const ultimoIndice = dados.length - 1;

  function rotuloUltimoPonto({ x, y, index }: LabelUltimoPontoProps) {
    if (index !== ultimoIndice || x === undefined || y === undefined) {
      return <g />;
    }
    return (
      <text x={Number(x)} y={Number(y) - 12} textAnchor="end" fontSize={12} fill="#0b0b0b">
        {formatarValor(dados[ultimoIndice].total)}
      </text>
    );
  }

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dados} margin={{ top: 20, right: 44, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="#e1e0d9" strokeDasharray="0" />
          <XAxis
            dataKey="data"
            tickFormatter={formatarDiaCurto}
            tickLine={false}
            axisLine={{ stroke: "#c3d4c4" }}
            tick={{ fill: "#898781", fontSize: 11 }}
            interval={1}
          />
          <YAxis hide domain={[0, (max: number) => (max <= 0 ? 10 : max * 1.2)]} />
          <Tooltip
            cursor={{ stroke: "#c3d4c4" }}
            // Casts: Recharts tipa formatter/labelFormatter mais amplo
            // (ValueType/ReactNode) do que os tipos concretos que os dados
            // desta agregação sempre têm.
            formatter={((valor: number) => [formatarValor(valor), "Faturamento"]) as any}
            labelFormatter={((chave: string) => formatarDiaCurto(chave)) as any}
            contentStyle={{ border: "1px solid #c3d4c4", borderRadius: 6, fontSize: 12 }}
          />
          <Line
            type="monotone"
            dataKey="total"
            stroke={COR_LINHA}
            strokeWidth={2}
            dot={{ r: 4, fill: COR_LINHA, stroke: "#faf7ef", strokeWidth: 2 }}
            activeDot={{ r: 5 }}
            label={rotuloUltimoPonto as any}
          />
        </LineChart>
      </ResponsiveContainer>
      {semVendas && (
        <p className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-sm text-pine-700">
          Sem vendas nos últimos 14 dias
        </p>
      )}
    </div>
  );
}
