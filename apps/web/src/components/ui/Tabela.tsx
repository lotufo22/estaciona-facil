import type { ReactNode } from 'react';

interface TabelaProps {
  /** Descrição lida por leitores de tela (não aparece na tela). */
  legenda: string;
  cabecalhos: string[];
  children: ReactNode;
}

/** Tabela semântica; rola na horizontal em telas estreitas (RNF06). */
export function Tabela({ legenda, cabecalhos, children }: TabelaProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-base">
        <caption className="sr-only">{legenda}</caption>
        <thead>
          <tr className="border-b border-borda text-texto-suave">
            {cabecalhos.map((c) => (
              <th key={c} scope="col" className="px-2 py-3 font-semibold">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-borda">{children}</tbody>
      </table>
    </div>
  );
}
