import { hojeEmSaoPaulo } from '@estacionafacil/shared';

let dataFixa: string | null = null;

/**
 * Fixa a data de "hoje" (AAAA-MM-DD). Só os dados de exemplo fazem isso: eles são de uma data
 * específica, e as telas precisam enxergar o mesmo "hoje" que eles em qualquer dia em que o app rode.
 * Passe `null` para voltar à data real.
 */
export function fixarHoje(data: string | null): void {
  dataFixa = data;
}

/** Hoje em São Paulo (AAAA-MM-DD), ou a data fixada pelos dados de exemplo. */
export function hoje(): string {
  return dataFixa ?? hojeEmSaoPaulo();
}
