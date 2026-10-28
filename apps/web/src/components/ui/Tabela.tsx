import { useId, type ReactNode } from 'react';

interface TabelaProps {
  /** Descrição lida por leitores de tela (não aparece na tela). */
  legenda: string;
  cabecalhos: string[];
  children: ReactNode;
}

/** Texto seguro para dentro de `content: "..."` do CSS. */
function paraCss(texto: string): string {
  return texto.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\s+/g, ' ');
}

/**
 * Tabela semântica. No computador é uma tabela; no celular (até 639 px) cada linha vira um cartão, com
 * o nome da coluna ao lado de cada valor, em vez de obrigar a rolar para o lado. Os rótulos vêm dos
 * `cabecalhos` e são aplicados por CSS, então as telas que usam a tabela não precisam saber disso.
 */
export function Tabela({ legenda, cabecalhos, children }: TabelaProps) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = `[data-tabela="${id}"]`;
  // Colunas de botão ("Ação", "Comprovante") não precisam de rótulo: o botão já diz o que faz, e
  // ocupa a largura do cartão. A primeira coluna (o nome) vira o título do cartão, também sem rótulo.
  const SEM_ROTULO = new Set(['Ação', 'Comprovante']);
  const rotulos = cabecalhos
    .map((c, i) => {
      const celula = `${t} td:nth-child(${i + 1})`;
      if (SEM_ROTULO.has(c))
        return `${celula}{display:block;padding-top:.5rem}${celula}::before{display:none}`;
      if (i === 0)
        return `${celula}{font-size:1.125rem;justify-content:flex-start;text-align:left}${celula}::before{display:none}`;
      return `${celula}::before{content:"${paraCss(c)}"}`;
    })
    .join('');

  const celular = `
@media (max-width:639px){
  ${t},${t} tbody,${t} tr,${t} td{display:block}
  ${t} thead{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  ${t} tr{background:var(--color-superficie);border:1px solid var(--color-borda);border-radius:.5rem;margin-bottom:.75rem;padding:.5rem .75rem}
  ${t} td{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.375rem 0;text-align:right}
  ${t} td::before{color:var(--color-texto-suave);flex:none;font-weight:600;text-align:left}
  ${rotulos}
}`;

  return (
    <div className="overflow-x-auto">
      <style>{celular}</style>
      <table data-tabela={id} className="w-full border-collapse text-left text-base">
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
