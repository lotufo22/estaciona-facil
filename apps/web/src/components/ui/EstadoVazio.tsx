import type { ReactNode } from 'react';

interface EstadoVazioProps {
  titulo: string;
  orientacao: string;
  acao?: ReactNode;
}

export function EstadoVazio({ titulo, orientacao, acao }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-borda bg-superficie p-10 text-center">
      <p className="text-xl font-semibold text-texto">{titulo}</p>
      <p className="text-base text-texto-suave">{orientacao}</p>
      {acao}
    </div>
  );
}
