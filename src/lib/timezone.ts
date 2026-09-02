// Fuso horário fixo da clínica (capability: agendamento — ver
// openspec/changes/corrigir-fuso-horario-agenda/design.md, Decisões 1 e 2).
//
// O Brasil não observa horário de verão desde 2019, então
// "America/Sao_Paulo" é sempre UTC-3, o ano inteiro — por isso tratamos
// isso como um offset fixo em vez de precisar de uma tz database (nova
// dependência). Se o produto algum dia precisar de fusos variáveis (DST,
// clínicas fora do Brasil), essa decisão deve ser revisitada.
//
// REGRA: todo código que cria ou exibe `dataHoraInicio` de um Agendamento
// SHALL passar por este módulo — nunca `new Date(string sem offset)` nem
// `data.getFullYear()/getHours()/...` direto num `Date`. Essas duas coisas
// dependem do fuso horário de quem executa o código (processo Node do
// servidor, ou navegador do usuário) e foram a causa raiz do bug corrigido
// nesta change: servidor e navegador podem discordar sobre que dia/hora um
// mesmo instante representa.

const OFFSET_CLINICA = "-03:00";
const OFFSET_MINUTOS_CLINICA = -180; // UTC-3

export interface DiaCalendario {
  ano: number;
  mes: number; // 1-12
  dia: number;
}

export interface ComponentesClinica extends DiaCalendario {
  hora: number; // 0-23
  minuto: number; // 0-59
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, "0");
}

/** Combina uma data (`yyyy-mm-dd`) e hora (`HH:mm`) informadas pelo
 * usuário — sempre entendidas como horário da clínica — num instante
 * (`Date`) real, sem depender do fuso horário do processo que faz o parse.
 * Retorna `Invalid Date` se `data`/`hora` não formarem uma data válida
 * (chamador deve checar `Number.isNaN(resultado.getTime())`). */
export function paraInstanteClinica(data: string, hora: string): Date {
  return new Date(`${data}T${hora}:00${OFFSET_CLINICA}`);
}

/** Deriva os componentes de calendário (ano/mês/dia/hora/minuto) de um
 * instante no fuso da clínica — nunca no fuso do processo/navegador que
 * chama isso. Implementado com aritmética manual sobre `getUTC*` (não
 * `Intl`/getters locais) para não depender do relógio ambiente. */
export function paraComponentesClinica(instante: Date): ComponentesClinica {
  const deslocado = new Date(instante.getTime() + OFFSET_MINUTOS_CLINICA * 60_000);
  return {
    ano: deslocado.getUTCFullYear(),
    mes: deslocado.getUTCMonth() + 1,
    dia: deslocado.getUTCDate(),
    hora: deslocado.getUTCHours(),
    minuto: deslocado.getUTCMinutes(),
  };
}

/** Só a parte de calendário (sem hora/minuto) de `paraComponentesClinica`. */
export function paraDiaCalendario(instante: Date): DiaCalendario {
  const { ano, mes, dia } = paraComponentesClinica(instante);
  return { ano, mes, dia };
}

/** `yyyy-mm-dd`, formato usado tanto na URL (`?semana=`) quanto no
 * formulário de novo agendamento. */
export function paraChaveDeData({ ano, mes, dia }: DiaCalendario): string {
  return `${ano}-${doisDigitos(mes)}-${doisDigitos(dia)}`;
}

/** `HH:mm` no fuso da clínica. */
export function paraChaveDeHora({ hora, minuto }: ComponentesClinica): string {
  return `${doisDigitos(hora)}:${doisDigitos(minuto)}`;
}

/** Soma (ou subtrai, com `quantidade` negativa) dias a um dia de
 * calendário. Aritmética em `Date.UTC` puro — nunca depende do fuso do
 * processo, mesmo cruzando mês/ano. */
export function adicionarDias({ ano, mes, dia }: DiaCalendario, quantidade: number): DiaCalendario {
  const utc = new Date(Date.UTC(ano, mes - 1, dia + quantidade));
  return { ano: utc.getUTCFullYear(), mes: utc.getUTCMonth() + 1, dia: utc.getUTCDate() };
}

/** 0=domingo, 1=segunda, ..., 6=sábado — calculado em `Date.UTC`, não no
 * fuso do processo. */
export function diaDaSemana({ ano, mes, dia }: DiaCalendario): number {
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay();
}

/** Segunda-feira da semana (segunda a domingo) que contém `dia`. */
export function segundaFeiraDaSemana(dia: DiaCalendario): DiaCalendario {
  const semana = diaDaSemana(dia);
  const diffParaSegunda = semana === 0 ? -6 : 1 - semana;
  return adicionarDias(dia, diffParaSegunda);
}

/** Instante correspondente a 00:00 desse dia de calendário, no fuso da clínica. */
export function inicioDoDiaClinica(dia: DiaCalendario): Date {
  return paraInstanteClinica(paraChaveDeData(dia), "00:00");
}

/** Instante correspondente a 23:59:59.999 desse dia de calendário, no fuso
 * da clínica — um milissegundo antes da meia-noite seguinte. */
export function fimDoDiaClinica(dia: DiaCalendario): Date {
  return new Date(inicioDoDiaClinica(adicionarDias(dia, 1)).getTime() - 1);
}
