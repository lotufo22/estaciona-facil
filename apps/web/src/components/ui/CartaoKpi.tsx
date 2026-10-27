import { Icone, type NomeIcone } from './Icone';

type Tom = 'primario' | 'atencao' | 'positivo';

const FUNDO: Record<Tom, string> = {
  primario: 'bg-primaria',
  atencao: 'bg-atraso',
  positivo: 'bg-ok',
};

const TEXTO_DO_SELO: Record<Tom, string> = {
  primario: 'text-primaria',
  atencao: 'text-atraso',
  positivo: 'text-ok',
};

interface CartaoKpiProps {
  tom: Tom;
  titulo: string;
  valor: string;
  variacao?: string;
  rodape: string;
  icone?: NomeIcone;
}

export function CartaoKpi({
  tom,
  titulo,
  valor,
  variacao,
  rodape,
  icone = 'mensalistas',
}: CartaoKpiProps) {
  return (
    <article className={`flex flex-col gap-5 rounded-lg p-6 text-white ${FUNDO[tom]}`}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-white/20">
            <Icone nome={icone} className="size-7" />
          </span>
          <p className="text-base font-semibold uppercase">{titulo}</p>
        </div>
        {/* O valor nunca quebra (nem em "-R$ 3.201,50"); se o selo não couber ao lado, desce. */}
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-4xl font-bold whitespace-nowrap">{valor}</p>
          {variacao && (
            <span
              className={`rounded-full bg-superficie px-3 py-1 text-base font-semibold whitespace-nowrap ${TEXTO_DO_SELO[tom]}`}
            >
              {variacao}
            </span>
          )}
        </div>
      </div>
      <hr className="border-white/30" />
      <div className="flex items-center justify-between gap-4">
        <p className="text-base">{rodape}</p>
        <Icone nome="seta" className="size-5 shrink-0" />
      </div>
    </article>
  );
}
