import type { ReactNode } from 'react';

interface CabecalhoPaginaProps {
  titulo: string;
  subtitulo?: string;
  /** Botão de ação principal da página (ex.: "Novo mensalista"). */
  acao?: ReactNode;
}

export function CabecalhoPagina({ titulo, subtitulo, acao }: CabecalhoPaginaProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] leading-9 font-bold text-texto">{titulo}</h1>
        {subtitulo && <p className="text-base text-texto-suave">{subtitulo}</p>}
      </div>
      {acao}
    </header>
  );
}
