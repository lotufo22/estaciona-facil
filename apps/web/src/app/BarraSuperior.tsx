import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Aba } from '../components/ui/Aba';
import { Icone } from '../components/ui/Icone';
import { Marca } from '../components/ui/Marca';
import { useEhCelular } from '../lib/celular';
import { useSessao } from '../lib/sessao';
import { abasDoPerfil } from './abas';
import { useContagemVencidos } from './useContagemVencidos';

function descreverVencidos(quantidade: number): string {
  if (quantidade === 0) return 'Nenhum contrato vencido';
  return `${quantidade} contrato${quantidade === 1 ? '' : 's'} vencido${quantidade === 1 ? '' : 's'}`;
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
  const ehCelular = useEhCelular();
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
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-lg bg-primaria p-3 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Ir para o conteúdo
      </a>
      {!ehCelular && (
        <aside className="fixed inset-y-0 left-0 z-30 flex w-56 flex-col overflow-y-auto bg-barra px-4 py-7 text-white lg:w-64 lg:px-5">
          <Link
            to="/"
            aria-label="EstacionaFácil — início"
            className="rounded-lg focus-visible:outline-2 focus-visible:outline-white"
          >
            <Marca clara />
          </Link>
          <p className="mt-12 mb-3 px-4 text-[10px] font-semibold tracking-[.2em] text-barra-texto uppercase">
            Área de trabalho
          </p>
          <nav aria-label="Abas principais" className="flex flex-col gap-1.5">
            {abasDoPerfil(sessao.perfil).map((aba) => (
              <Aba
                key={aba.para}
                {...aba}
                ativa={pathname === aba.para || pathname.startsWith(`${aba.para}/`)}
              />
            ))}
          </nav>
          <div className="sidebar-dica mt-auto pt-8">
            <div className="rounded-xl border border-white/10 bg-white/[.03] p-4">
              <p className="text-sm font-medium">Tudo no seu lugar.</p>
              <p className="mt-1 text-xs leading-relaxed text-barra-texto">
                Contratos, recebimentos e despesas em uma só visão.
              </p>
            </div>
            <p className="mt-5 px-1 text-[11px] text-barra-texto">
              EstacionaFácil · Gestão com clareza
            </p>
          </div>
        </aside>
      )}
      <header className="sticky top-0 z-20 border-b border-borda bg-superficie/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          {ehCelular ? (
            <Marca compacta />
          ) : (
            <p className="hidden text-sm text-texto-suave lg:block">
              Visão geral{' '}
              <span aria-hidden="true" className="mx-2 text-borda">
                /
              </span>
              <span className="font-medium text-texto">
                {abasDoPerfil(sessao.perfil).find((aba) => pathname.startsWith(aba.para))?.rotulo ??
                  'Minha conta'}
              </span>
            </p>
          )}
          <div className="flex items-center gap-2 sm:ml-auto sm:gap-4">
            {!ehCelular && (
              <form role="search" onSubmit={buscar} className="relative">
                <Icone
                  nome="busca"
                  className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-suave"
                />
                <input
                  type="search"
                  aria-label="Buscar mensalista ou placa"
                  placeholder="Buscar mensalista ou placa…"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="min-h-11 w-52 rounded-lg border border-borda bg-fundo pr-3 pl-10 text-sm outline-none transition focus:border-primaria focus:ring-2 focus:ring-primaria/10 xl:w-72"
                />
              </form>
            )}
            {ehProprietario && vencidos.data !== undefined && (
              <Link
                to="/vencimentos?situacao=vencido"
                aria-label={descreverVencidos(vencidos.data)}
                className="relative grid size-11 place-items-center rounded-lg text-texto-suave transition-colors hover:bg-fundo focus-visible:outline-2 focus-visible:outline-primaria"
              >
                <Icone nome="alerta" className="size-5" />
                {vencidos.data > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-alerta px-1 text-[10px] font-semibold text-white"
                  >
                    {vencidos.data}
                  </span>
                )}
              </Link>
            )}
            <Link
              to="/conta"
              aria-label={`Minha conta (${sessao.nome})`}
              className="flex items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-primaria"
            >
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-full bg-primaria-clara text-xs font-semibold text-primaria"
              >
                {iniciais(sessao.nome)}
              </span>
              {!ehCelular && (
                <span className="hidden text-sm leading-tight xl:block">
                  <span className="block font-semibold">{sessao.nome}</span>
                  <span className="mt-1 block text-xs text-texto-suave">
                    {ehProprietario ? 'Perfil: proprietário' : 'Perfil: auxiliar'}
                  </span>
                </span>
              )}
            </Link>
            <button
              type="button"
              onClick={() => void sair()}
              className="min-h-11 cursor-pointer rounded-lg px-2 text-xs font-medium text-texto-suave transition-colors hover:bg-fundo hover:text-primaria focus-visible:outline-2 focus-visible:outline-primaria"
            >
              Sair
            </button>
          </div>
          {ehCelular && (
            <form role="search" onSubmit={buscar} className="relative w-full">
              <Icone
                nome="busca"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-texto-suave"
              />
              <input
                type="search"
                aria-label="Buscar mensalista ou placa"
                placeholder="Buscar mensalista ou placa…"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="min-h-11 w-full rounded-lg border border-borda bg-fundo pr-3 pl-10 text-base outline-none focus:border-primaria focus:ring-2 focus:ring-primaria/10"
              />
            </form>
          )}
        </div>
      </header>
    </>
  );
}
