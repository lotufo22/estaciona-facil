import type { Turno } from '@estacionafacil/shared';

export const NOME_DO_TURNO: Record<Turno, string> = { diurno: 'Diurno', noturno: 'Noturno' };

export const OPCOES_TURNO = [
  { valor: 'diurno', texto: NOME_DO_TURNO.diurno },
  { valor: 'noturno', texto: NOME_DO_TURNO.noturno },
];
