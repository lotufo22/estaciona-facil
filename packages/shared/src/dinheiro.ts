const NBSP = ' ';

/** Converte texto decimal ("255.00") em centavos inteiros (25500). */
export function paraCentavos(valor: string): number {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(valor);
  if (!m) throw new Error(`Valor inválido: "${valor}" (esperado texto decimal como "255.00")`);
  const centavos = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
  return m[1] === '-' ? -centavos : centavos;
}

/**
 * Aceita o valor como a pessoa digita ("150", "150,5", "150,50", "1.250,00", "R$ 80") e devolve o
 * texto decimal com duas casas ("150.00"). Texto que não é um valor fica como veio, para a
 * validação recusar.
 */
export function normalizarValor(texto: string): string {
  let t = texto.trim().replace(/^R\$\s*/, '');
  // Com vírgula, os pontos são separadores de milhar ("1.250,00").
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.');
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return texto;
  return `${m[1]}.${(m[2] ?? '').padEnd(2, '0')}`;
}

/** Converte centavos inteiros (25500) em texto decimal com duas casas ("255.00"). */
export function deCentavos(centavos: number): string {
  if (!Number.isInteger(centavos)) throw new Error(`Centavos devem ser inteiros: ${centavos}`);
  const sinal = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  return `${sinal}${Math.floor(absoluto / 100)}.${String(absoluto % 100).padStart(2, '0')}`;
}

/** Formata texto decimal em reais, ex.: "11340.00" → "R$ 11.340,00" (espaço não separável). */
export function formatarReais(valor: string): string {
  const centavos = paraCentavos(valor);
  const sinal = centavos < 0 ? '-' : '';
  const absoluto = Math.abs(centavos);
  const reais = String(Math.floor(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sinal}R$${NBSP}${reais},${String(absoluto % 100).padStart(2, '0')}`;
}
