import { Link } from 'react-router-dom';
import { juntar } from './classes';
import { Icone, type NomeIcone } from './Icone';

interface AbaProps {
  para: string;
  rotulo: string;
  icone: NomeIcone;
  ativa: boolean;
}

export function Aba({ para, rotulo, icone, ativa }: AbaProps) {
  return (
    <Link
      to={para}
      aria-current={ativa ? 'page' : undefined}
      className={juntar(
        'inline-flex min-h-12 items-center gap-3 rounded-lg px-4 text-sm whitespace-nowrap transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
        ativa
          ? 'bg-barra-ativa font-semibold text-white shadow-[inset_3px_0_0_#ffc107]'
          : 'text-barra-texto hover:translate-x-1 hover:bg-barra-ativa/60 hover:text-white',
      )}
    >
      <Icone nome={icone} className="size-5 text-barra-icone" />
      {rotulo}
    </Link>
  );
}
