import { Link } from 'react-router-dom';
import { Icone, type NomeIcone } from './Icone';

type Tom = 'primario' | 'atencao' | 'positivo';
const SELO: Record<Tom, string> = {
  primario: 'bg-primaria-clara text-primaria',
  atencao: 'bg-alerta-fundo text-alerta',
  positivo: 'bg-ok-fundo text-ok',
};
interface CartaoKpiProps {
  tom: Tom;
  titulo: string;
  valor: string;
  variacao?: string;
  rodape: string;
  icone?: NomeIcone;
  para?: string;
}
export function CartaoKpi({
  tom,
  titulo,
  valor,
  variacao,
  rodape,
  icone = 'mensalistas',
  para,
}: CartaoKpiProps) {
  const conteudo = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="pt-2 text-sm font-medium text-texto-suave">{titulo}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${SELO[tom]}`}>
          <Icone nome={icone} className="size-[18px]" />
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[30px] leading-tight font-semibold tracking-tight whitespace-nowrap text-texto lg:text-[32px]">
          {valor}
        </p>
        {variacao && (
          <span className="rounded-md bg-ok-fundo px-2 py-1 text-xs font-semibold text-ok">
            {variacao}
          </span>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-borda/60 pt-3">
        <p className="text-xs leading-relaxed text-texto-suave">{rodape}</p>
        {para && (
          <Icone
            nome="seta"
            className="size-4 shrink-0 text-texto-suave transition-transform group-hover:translate-x-1"
          />
        )}
      </div>
    </>
  );
  const classes =
    'group flex h-full flex-col gap-4 rounded-xl border border-borda bg-superficie p-5 transition-all duration-200 hover:-translate-y-1 hover:border-primaria/30 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria';
  return (
    <article className="h-full min-w-0">
      {para ? (
        <Link to={para} className={classes}>
          {conteudo}
        </Link>
      ) : (
        <div className={classes}>{conteudo}</div>
      )}
    </article>
  );
}
