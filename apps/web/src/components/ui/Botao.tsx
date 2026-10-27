import type { ComponentProps } from 'react';
import { juntar } from './classes';

export interface BotaoProps extends ComponentProps<'button'> {
  variante?: 'primario' | 'secundario';
}

const BASE =
  'inline-flex min-h-12 cursor-pointer items-center justify-center rounded-xl px-6 text-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTES = {
  primario: 'bg-primaria text-white hover:bg-primaria-escura',
  secundario: 'border-2 border-primaria bg-superficie text-primaria hover:bg-primaria-clara',
};

export function Botao({ variante = 'primario', type = 'button', className, ...resto }: BotaoProps) {
  return <button type={type} className={juntar(BASE, VARIANTES[variante], className)} {...resto} />;
}
