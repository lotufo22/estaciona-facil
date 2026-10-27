const NBSP = ' ';

/** Converte texto decimal ("255.00") em centavos inteiros (25500). */
export function paraCentavos(valor: string): number {
  const m = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(valor);
  if (!m) throw new Error(`Valor inválido: "${valor}" (esperado texto decimal como "255.00")`);
  const centavos = Number(m[2]) * 100 + Number((m[3] ?? '').padEnd(2, '0'));
  return m[1] === '-' ? -centavos : centavos;
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
