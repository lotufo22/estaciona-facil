import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Aba } from '../components/ui/Aba';
import { Icone } from '../components/ui/Icone';
import { useSessao } from '../lib/sessao';
import { abasDoPerfil } from './abas';
import { useContagemVencidos } from './useContagemVencidos';

function descreverVencidos(quantidade: number): string {
  if (quantidade === 0) return 'Nenhum contrato vencido';
  if (quantidade === 1) return '1 contrato vencido';
  return `${quantidade} contratos vencidos`;
}

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

export function BarraSuperior() {
  const { sessao, sair } = useSessao();
  const { pathname } = useLocation();
  const navegar = useNavigate();
  const [busca, setBusca] = useState('');
  const ehProprietario = sessao?.perfil === 'proprietario';
  const vencidos = useContagemVencidos(ehProprietario);

  if (!sessao) return null;

  function buscar(evento: FormEvent) {
    evento.preventDefault();
    const texto = busca.trim();
    navegar(texto ? `/mensalistas?busca=${encodeURIComponent(texto)}` : '/mensalistas');
  }

  return (
    <div className="bg-barra text-white">
      <div className="flex flex-wrap items-center justify-between gap-4 px-8 py-4">
        <p className="text-[28px] leading-9 font-bold">EstacionaFácil</p>

        <div className="flex flex-wrap items-center gap-6">
          <form role="search" onSubmit={buscar} className="relative">
            <Icone
              nome="busca"
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-barra-icone"
            />
            <input
              type="search"
              aria-label="Buscar mensalista ou placa"
              placeholder="Buscar mensalista ou placa…"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="min-h-12 w-72 rounded-full bg-barra-ativa pr-4 pl-12 text-base text-white placeholder:text-barra-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            />
          </form>

          {ehProprietario && vencidos.data !== undefined && (
            <Link
              to="/vencimentos?situacao=vencido"
              aria-label={descreverVencidos(vencidos.data)}
              className="relative grid size-12 place-items-center rounded-full text-barra-icone hover:bg-barra-ativa focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Icone nome="alerta" className="size-6" />
              {vencidos.data > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 grid min-w-5 place-items-center rounded-full bg-atraso px-1 text-sm font-semibold text-white"
                >
                  {vencidos.data}
                </span>
              )}
            </Link>
          )}

          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-full bg-primaria text-base font-semibold"
            >
              {iniciais(sessao.nome)}
            </span>
            <span className="text-base font-semibold">{sessao.nome}</span>
            <button
              type="button"
              onClick={() => void sair()}
              className="min-h-12 cursor-pointer rounded-lg px-4 text-base text-barra-texto underline hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <nav aria-label="Abas principais" className="flex gap-1 overflow-x-auto px-6 pb-2">
        {abasDoPerfil(sessao.perfil).map((aba) => (
          <Aba
            key={aba.para}
            para={aba.para}
            rotulo={aba.rotulo}
            icone={aba.icone}
            ativa={pathname === aba.para || pathname.startsWith(`${aba.para}/`)}
          />
        ))}
      </nav>
    </div>
  );
}
