// Máscaras de campos brasileiros (capability: clientes) — portadas do
// protótipo de referência (openspec/reference/prototipo.html, funções
// maskCPF/maskCNPJ/maskCelular/maskCEP), mesma lógica exata.
//
// Uso duplo: aplicadas ao vivo na digitação (modal de cadastro/edição) E na
// exibição de valores já normalizados vindos do banco (tabela, modal de
// edição) — ver openspec/changes/implementar-clientes/design.md, Decisão 2:
// o banco guarda dígitos puros, a máscara é sempre responsabilidade do
// client.

export function maskCPF(v: string): string {
  v = v.replace(/\D/g, "").slice(0, 11);
  return v
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCNPJ(v: string): string {
  v = v.replace(/\D/g, "").slice(0, 14);
  return v
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function maskCelular(v: string): string {
  v = v.replace(/\D/g, "").slice(0, 11);
  return v.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function maskCEP(v: string): string {
  v = v.replace(/\D/g, "").slice(0, 8);
  return v.replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}
