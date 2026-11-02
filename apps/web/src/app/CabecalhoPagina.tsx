import type { ReactNode } from 'react';
interface CabecalhoPaginaProps {
  titulo: string;
  subtitulo?: string;
  acao?: ReactNode;
}
export function CabecalhoPagina({ titulo, subtitulo, acao }: CabecalhoPaginaProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 pb-1">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl leading-tight font-semibold tracking-tight text-texto sm:text-[32px]">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="max-w-2xl text-sm leading-relaxed text-texto-suave">{subtitulo}</p>
        )}
      </div>
      {acao}
    </header>
  );
}
