import { diasEntre } from './datas';

export const AVISO_DIAS = 7;

export type Situacao = 'em_dia' | 'a_vencer' | 'vencido';

/**
 * Situação calculada (nunca gravada): vencido se o vencimento já passou;
 * a vencer se faltam de 0 a `avisoDias` dias; em dia nos demais casos.
 */
export function situacaoDoContrato(
  vencimento: string,
  hoje: string,
  avisoDias: number = AVISO_DIAS,
): Situacao {
  const diasRestantes = diasEntre(hoje, vencimento);
  if (diasRestantes < 0) return 'vencido';
  if (diasRestantes <= avisoDias) return 'a_vencer';
  return 'em_dia';
}
