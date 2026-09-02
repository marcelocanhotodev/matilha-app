// Cálculo de idade de paciente a partir da data de nascimento (capability:
// pacientes, task 2.1). A idade nunca é armazenada — só calculada em tempo
// de exibição (ver openspec/specs/pacientes/spec.md, Requirement "Idade
// derivada da data de nascimento"). Lógica portada de calcIdadeLabel em
// openspec/reference/prototipo.html, mesmo comportamento exato (meses se
// menor que 1 ano, anos e meses caso contrário).

export function calcularIdadeLabel(nascimento: Date, hoje: Date = new Date()): string {
  let meses = (hoje.getFullYear() - nascimento.getFullYear()) * 12 + (hoje.getMonth() - nascimento.getMonth());
  if (hoje.getDate() < nascimento.getDate()) meses--;
  if (meses < 0) return "";

  if (meses < 12) {
    return `${meses} ${meses === 1 ? "mês" : "meses"}`;
  }

  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;
  return mesesRestantes > 0 ? `${anos}a ${mesesRestantes}m` : `${anos} ${anos === 1 ? "ano" : "anos"}`;
}
