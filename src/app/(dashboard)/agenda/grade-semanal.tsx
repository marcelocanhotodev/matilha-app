"use client";

// Grade semanal (Requirement: Visualização semanal por profissional — grade
// única, sem filtro de profissional, ver openspec/changes/
// implementar-agendamento/design.md, Decisão 7). Client Component: cada
// célula vazia precisa de `onClick` pra abrir o formulário de novo
// agendamento (mesmo padrão de todo "Novo X" do projeto — estado local, não
// URL). Matemática de posicionamento portada do protótipo
// (openspec/reference/prototipo.html, `renderCalendar()`), trocando os
// números fixos por dataHoraInicio/duracaoMinutos reais.
//
// Fuso horário: este componente NUNCA deriva dia/hora a partir de
// `new Date(...).getFullYear()/getHours()/...` — isso dependeria do fuso
// horário do navegador e foi a causa raiz de um bug real (ver
// openspec/changes/corrigir-fuso-horario-agenda/): servidor e navegador
// podiam discordar sobre que dia um mesmo instante representava, e o
// round-trip de datas entre os dois causava até erro de hidratação do
// React. Todo dia/hora chega já resolvido no fuso da clínica via props
// (`dias`, `agendamentos[].diaChave`/`horaDecimal`/`horaLabel`,
// `hojeChave`), calculado no servidor com `src/lib/timezone.ts`.

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ItemCatalogo } from "@prisma/client";
import { NovoAgendamentoModal, type PacienteOpcao, type VeterinarioOpcao } from "./novo-agendamento-modal";

const DIAS_LABEL = ["SEG", "TER", "QUA", "QUI", "SEX"];
const START_HOUR = 8;
const END_HOUR = 18;
const ROW_H = 64; // px por hora

const SPECIES_META: Record<string, { label: string; bg: string; borda: string }> = {
  CAO: { label: "Cão", bg: "#fbf0dc", borda: "#e2a23f" },
  GATO: { label: "Gato", bg: "#f1ecf5", borda: "#9482ac" },
  OUTRO: { label: "Outro", bg: "#e9f4f0", borda: "#5f9e8a" },
};

export interface DiaColuna {
  chave: string; // yyyy-mm-dd, no fuso da clínica
  ano: number;
  mes: number; // 1-12
  dia: number;
}

export interface AgendamentoGrade {
  id: number;
  diaChave: string; // yyyy-mm-dd, no fuso da clínica — já resolvido no servidor
  horaDecimal: number; // ex.: 9.5 = 09:30, já no fuso da clínica
  horaLabel: string; // "09:30", já formatado no fuso da clínica
  duracaoMinutos: number;
  paciente: { nome: string; especie: string };
  itemCatalogo: { nome: string } | null;
}

function formatarCabecalho(d: DiaColuna): string {
  // `d` já é o dia certo no fuso da clínica — ancorar em UTC aqui só evita
  // que o navegador desloque a data de novo ao montar o Date só pra extrair
  // o nome do mês abreviado.
  const data = new Date(Date.UTC(d.ano, d.mes - 1, d.dia));
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).format(data);
}

export function GradeSemanal({
  agendamentos,
  dias,
  hojeChave,
  semanaAnteriorHref,
  semanaSeguinteHref,
  pacientes,
  veterinarios,
  catalogo,
}: {
  agendamentos: AgendamentoGrade[];
  dias: DiaColuna[];
  hojeChave: string;
  semanaAnteriorHref: string;
  semanaSeguinteHref: string;
  pacientes: PacienteOpcao[];
  veterinarios: VeterinarioOpcao[];
  catalogo: ItemCatalogo[];
}) {
  const router = useRouter();

  const [celulaSelecionada, setCelulaSelecionada] = useState<{ data: string; hora: string } | null>(null);

  function aoClicarCelula(dia: DiaColuna, hora: number) {
    setCelulaSelecionada({ data: dia.chave, hora: `${String(hora).padStart(2, "0")}:00` });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <a href={semanaAnteriorHref} className="rounded-md border border-sage-300 bg-white px-3 py-1.5 text-sm text-pine-800 hover:bg-sand-100">
          ‹ Semana anterior
        </a>
        <div className="font-display text-lg text-pine-900">
          {formatarCabecalho(dias[0])} – {formatarCabecalho(dias[4])}
        </div>
        <a href={semanaSeguinteHref} className="rounded-md border border-sage-300 bg-white px-3 py-1.5 text-sm text-pine-800 hover:bg-sand-100">
          Próxima semana ›
        </a>
      </div>

      <div className="grid grid-cols-[56px_repeat(5,1fr)] overflow-hidden rounded-md border border-sage-300 bg-white">
        <div className="border-b border-r border-sage-300 bg-sand-50" />
        {dias.map((dia, i) => (
          <div
            key={dia.chave}
            className={`border-b border-r border-sage-300 bg-sand-50 py-2 text-center last:border-r-0 ${
              dia.chave === hojeChave ? "text-gold-600" : ""
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-pine-700">{DIAS_LABEL[i]}</div>
            <div className="font-display text-lg">{dia.dia}</div>
          </div>
        ))}

        <div className="flex flex-col border-r border-sage-300">
          {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((h) => (
            <div
              key={h}
              style={{ height: ROW_H }}
              className="border-b border-dashed border-sage-300 px-1 pt-1 text-right font-mono text-[11px] text-pine-700"
            >
              {String(h).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {dias.map((dia) => {
          const agendamentosDoDia = agendamentos.filter((a) => a.diaChave === dia.chave);
          return (
            <div key={dia.chave} className="relative border-r border-sage-300 last:border-r-0">
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map((h) => (
                <button
                  key={h}
                  type="button"
                  style={{ height: ROW_H }}
                  onClick={() => aoClicarCelula(dia, h)}
                  className="block w-full border-b border-dashed border-sage-300 text-left hover:bg-sand-50"
                />
              ))}

              {agendamentosDoDia.map((a) => {
                const meta = SPECIES_META[a.paciente.especie] ?? SPECIES_META.OUTRO;
                const top = (a.horaDecimal - START_HOUR) * ROW_H + 2;
                const height = (a.duracaoMinutos / 60) * ROW_H - 4;
                return (
                  <div
                    key={a.id}
                    onClick={(e) => e.stopPropagation()} // Scenario "Clique em agendamento existente não abre edição"
                    title={`${a.paciente.nome} — ${a.itemCatalogo?.nome ?? "Sem serviço previsto"} (${a.horaLabel})`}
                    style={{ top, height: Math.max(height, 20), background: meta.bg, borderLeftColor: meta.borda }}
                    className="absolute left-1 right-1 cursor-pointer overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-xs shadow-sm"
                  >
                    <div className="font-mono text-[10px] font-semibold text-pine-900">{a.horaLabel}</div>
                    <div className="truncate font-medium text-pine-900">{a.paciente.nome}</div>
                    {a.itemCatalogo && <div className="truncate text-pine-700">{a.itemCatalogo.nome}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {celulaSelecionada && (
        <NovoAgendamentoModal
          pacientes={pacientes}
          veterinarios={veterinarios}
          catalogo={catalogo}
          dataInicial={celulaSelecionada.data}
          horaInicial={celulaSelecionada.hora}
          onClose={() => setCelulaSelecionada(null)}
          onSaved={() => {
            setCelulaSelecionada(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
