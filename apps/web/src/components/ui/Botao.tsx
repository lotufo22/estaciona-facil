import type { ComponentProps } from 'react';
import { juntar } from './classes';

export interface BotaoProps extends ComponentProps<'button'> {
  variante?: 'primario' | 'secundario';
}

const BASE =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-5 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-60';

const VARIANTES = {
  primario: 'bg-acao text-white shadow-sm hover:bg-primaria-escura hover:shadow-md',
  secundario: 'border border-borda bg-superficie text-texto hover:bg-primaria-clara',
};

/** Classes do botão, para dar a mesma cara a um link (`LinkBotao`). */
export function classesDoBotao(variante: keyof typeof VARIANTES = 'primario'): string {
  return juntar(BASE, VARIANTES[variante]);
}

export function Botao({ variante = 'primario', type = 'button', className, ...resto }: BotaoProps) {
  return <button type={type} className={juntar(BASE, VARIANTES[variante], className)} {...resto} />;
}
