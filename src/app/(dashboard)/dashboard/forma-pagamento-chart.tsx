"use client";

// Gráfico de rosca — faturamento por forma de pagamento (capability:
// painel-analitico). Paleta categórica validada (não "achada de olho" —
// ver openspec/changes/painel-analitico/tasks.md, task 1.2):
//   node scripts/validate_palette.js "#2a78d6,#eb6834,#1baf7a,#eda100" \
//     --mode light --surface "#faf7ef"
// PASS em lightness/chroma/CVD/normal-vision; WARN de contraste contra a
// superfície do card em 3 das 4 cores — mitigado aqui com a legenda
// sempre visível (rótulo + valor em texto, nunca só a cor) — a "relief
// rule" do skill `dataviz`. Ordem das cores é FIXA por forma de
// pagamento, nunca ciclada pelo valor.

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const ORDEM_FORMA_PAGAMENTO = ["DINHEIRO", "PIX", "CARTAO_CREDITO", "CARTAO_DEBITO"] as const;

const CORES_FORMA_PAGAMENTO: Record<string, string> = {
  DINHEIRO: "#2a78d6", // slot 1 — azul
  PIX: "#eb6834", // slot 2 — laranja
  CARTAO_CREDITO: "#1baf7a", // slot 3 — aqua
  CARTAO_DEBITO: "#eda100", // slot 4 — amarelo
};

const LABELS_FORMA_PAGAMENTO: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_CREDITO: "Cartão de crédito",
  CARTAO_DEBITO: "Cartão de débito",
};

export interface FatiaFormaPagamento {
  formaPagamento: string;
  total: number;
}

// Formatador mora aqui dentro (não vem via prop) — função não é
// serializável através da fronteira Server->Client Component.
function formatarValor(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function FormaPagamentoChart({
  dados,
  vazioLabel,
}: {
  dados: FatiaFormaPagamento[];
  vazioLabel: string;
}) {
  if (dados.length === 0) {
    return <p className="text-sm text-pine-700">{vazioLabel}</p>;
  }

  // Ordem fixa (nunca pelo valor) — mesma cor sempre representa a mesma
  // forma de pagamento, mesmo que o ranking mude de um mês pro outro.
  const dadosOrdenados = [...dados].sort(
    (a, b) => ORDEM_FORMA_PAGAMENTO.indexOf(a.formaPagamento as (typeof ORDEM_FORMA_PAGAMENTO)[number]) -
      ORDEM_FORMA_PAGAMENTO.indexOf(b.formaPagamento as (typeof ORDEM_FORMA_PAGAMENTO)[number]),
  );

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <ResponsiveContainer width={160} height={160} className="shrink-0">
        <PieChart>
          <Pie
            data={dadosOrdenados}
            dataKey="total"
            nameKey="formaPagamento"
            innerRadius={44}
            outerRadius={72}
            strokeWidth={2}
            stroke="#faf7ef"
          >
            {dadosOrdenados.map((fatia) => (
              <Cell key={fatia.formaPagamento} fill={CORES_FORMA_PAGAMENTO[fatia.formaPagamento] ?? "#898781"} />
            ))}
          </Pie>
          <Tooltip
            // Casts: Recharts tipa formatter/labelFormatter de forma mais
            // ampla (ValueType/ReactNode) do que os tipos concretos que os
            // dados desta agregação sempre têm.
            formatter={((valor: number) => [formatarValor(valor), undefined]) as any}
            labelFormatter={((nome: string) => LABELS_FORMA_PAGAMENTO[nome] ?? nome) as any}
            contentStyle={{ border: "1px solid #c3d4c4", borderRadius: 6, fontSize: 12 }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Legenda sempre visível com rótulo + valor em texto — nunca só a cor. */}
      <ul className="flex w-full flex-col gap-1.5 text-sm">
        {dadosOrdenados.map((fatia) => (
          <li key={fatia.formaPagamento} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: CORES_FORMA_PAGAMENTO[fatia.formaPagamento] ?? "#898781" }}
            />
            <span className="text-pine-800">{LABELS_FORMA_PAGAMENTO[fatia.formaPagamento] ?? fatia.formaPagamento}</span>
            <span className="ml-auto font-mono text-pine-900">{formatarValor(fatia.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
