// Validação e normalização de CPF/CNPJ (capability: clientes).
//
// Mesmo algoritmo de dígito verificador do protótipo de referência
// (openspec/reference/prototipo.html, funções isValidCPF/isValidCNPJ) — só a
// forma muda (TypeScript, sem DOM), o cálculo é idêntico.
//
// Ver openspec/changes/implementar-clientes/design.md, Decisão 2: aqui só se
// lida com dígitos puros (é o formato persistido no banco). Máscara de
// digitação/exibição é responsabilidade exclusiva do client, nunca daqui.

export function normalizarDigitos(valor: string | null | undefined): string {
  return (valor ?? "").replace(/\D/g, "");
}

export function cpfValido(valor: string | null | undefined): boolean {
  const cpf = normalizarDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let soma = 0;
  for (let i = 0; i < 9; i++) soma += Number(cpf[i]) * (10 - i);
  let resto = 11 - (soma % 11);
  if (resto >= 10) resto = 0;
  if (resto !== Number(cpf[9])) return false;

  soma = 0;
  for (let i = 0; i < 10; i++) soma += Number(cpf[i]) * (11 - i);
  resto = 11 - (soma % 11);
  if (resto >= 10) resto = 0;
  return resto === Number(cpf[10]);
}

export function cnpjValido(valor: string | null | undefined): boolean {
  const cnpj = normalizarDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += Number(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== Number(digitos.charAt(0))) return false;

  tamanho++;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;
  for (let i = tamanho; i >= 1; i--) {
    soma += Number(numeros.charAt(tamanho - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === Number(digitos.charAt(1));
}
