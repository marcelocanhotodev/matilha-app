// Grade semanal de agendamentos (capability: agendamento). Server
// Component: lê `?semana=` da query string (Requirement: Visualização
// semanal por profissional — grade única, sem filtro de profissional, ver
// openspec/changes/implementar-agendamento/design.md, Decisão 7), busca os
// agendamentos da semana + os dados que o formulário de criação precisa
// (pacientes ativos, usuários da clínica, catálogo ativo), e passa tudo
// para o Client Component da grade (só ela precisa de `onClick` por
// célula).
//
// Fuso horário: todo cálculo de dia/semana e toda leitura de
// `dataHoraInicio` passa por `src/lib/timezone.ts` — nunca
// `new Date(y,m,d,...)`/`getFullYear()` direto, que dependeriam do fuso do
// processo Node. O Client Component (`grade-semanal.tsx`) recebe os
// componentes de calendário já resolvidos no fuso da clínica e não refaz
// esse cálculo (ver openspec/changes/corrigir-fuso-horario-agenda/design.md,
// Decisão 3 — isso também elimina o erro de hidratação que o round-trip
// anterior causava).

import { getClinicaAtual } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  adicionarDias,
  fimDoDiaClinica,
  inicioDoDiaClinica,
  paraChaveDeData,
  paraComponentesClinica,
  paraDiaCalendario,
  segundaFeiraDaSemana,
  type DiaCalendario,
} from "@/lib/timezone";
import { GradeSemanal, type AgendamentoGrade, type DiaColuna } from "./grade-semanal";

const DIAS_DA_SEMANA = 5; // segunda a sexta
const REGEX_SEMANA = /^\d{4}-\d{2}-\d{2}$/;

function paraDiaCalendarioDaQuery(semana: string | undefined): DiaCalendario {
  if (semana && REGEX_SEMANA.test(semana)) {
    const [ano, mes, dia] = semana.split("-").map(Number);
    // `Date.UTC` só pra validar que é uma data real (ex.: rejeita
    // "2026-02-31") — a leitura de volta é sempre via `getUTC*`, nunca
    // dependente do fuso do processo.
    const candidata = new Date(Date.UTC(ano, mes - 1, dia));
    if (!Number.isNaN(candidata.getTime()) && candidata.getUTCFullYear() === ano && candidata.getUTCMonth() === mes - 1 && candidata.getUTCDate() === dia) {
      return { ano, mes, dia };
    }
  }
  return paraDiaCalendario(new Date());
}

export default async function AgendaPage({ searchParams }: { searchParams: { semana?: string } }) {
  const clinicaId = await getClinicaAtual();

  const diaBase = paraDiaCalendarioDaQuery(searchParams.semana);
  const segunda = segundaFeiraDaSemana(diaBase);
  const dias = Array.from({ length: DIAS_DA_SEMANA }, (_, i) => adicionarDias(segunda, i));
  const sexta = dias[DIAS_DA_SEMANA - 1];

  const inicioDaSemana = inicioDoDiaClinica(segunda);
  const fimDaSemana = fimDoDiaClinica(sexta);

  const semanaAnterior = paraChaveDeData(adicionarDias(segunda, -7));
  const semanaSeguinte = paraChaveDeData(adicionarDias(segunda, 7));
  const hojeChave = paraChaveDeData(paraDiaCalendario(new Date()));

  const [agendamentosBrutos, pacientesAtivos, vinculosUsuarios, catalogoAtivo] = await Promise.all([
    prisma.agendamento.findMany({
      where: { clinicaId, dataHoraInicio: { gte: inicioDaSemana, lte: fimDaSemana } },
      include: { paciente: { select: { nome: true, especie: true } }, itemCatalogo: { select: { nome: true } } },
      orderBy: { dataHoraInicio: "asc" },
    }),
    prisma.paciente.findMany({
      where: { clinicaId, ativo: true },
      select: { id: true, nome: true, cliente: { select: { nome: true } } },
      orderBy: { nome: "asc" },
    }),
    // Requirement "Criação de agendamento" — seletor de veterinário lista
    // todo usuário vinculado à clínica ativa, sem filtro de papel (design.md,
    // Decisão 4).
    prisma.usuarioClinica.findMany({
      where: { clinicaId },
      include: { usuario: { select: { id: true, nome: true } } },
    }),
    prisma.itemCatalogo.findMany({
      where: { clinicaId, ativo: true },
      orderBy: { nome: "asc" },
    }),
  ]);

  // Resolve dia/hora de exibição no fuso da clínica aqui — o client nunca
  // reconstrói isso a partir de `dataHoraInicio`.
  const agendamentos: AgendamentoGrade[] = agendamentosBrutos.map((a) => {
    const { ano, mes, dia, hora, minuto } = paraComponentesClinica(a.dataHoraInicio);
    return {
      id: a.id,
      diaChave: paraChaveDeData({ ano, mes, dia }),
      horaDecimal: hora + minuto / 60,
      horaLabel: `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`,
      duracaoMinutos: a.duracaoMinutos,
      paciente: a.paciente,
      itemCatalogo: a.itemCatalogo,
    };
  });

  const diasColunas: DiaColuna[] = dias.map((d) => ({ chave: paraChaveDeData(d), ...d }));

  const pacientesOpcoes = pacientesAtivos.map((p) => ({ id: p.id, nome: p.nome, tutorNome: p.cliente.nome }));
  const veterinariosOpcoes = vinculosUsuarios.map((v) => ({ id: v.usuario.id, nome: v.usuario.nome }));

  return (
    <main className="flex flex-col gap-4">
      <h1 className="font-display text-2xl text-pine-900">Agenda</h1>
      <GradeSemanal
        agendamentos={agendamentos}
        dias={diasColunas}
        hojeChave={hojeChave}
        semanaAnteriorHref={`?semana=${semanaAnterior}`}
        semanaSeguinteHref={`?semana=${semanaSeguinte}`}
        pacientes={pacientesOpcoes}
        veterinarios={veterinariosOpcoes}
        catalogo={catalogoAtivo}
      />
    </main>
  );
}
