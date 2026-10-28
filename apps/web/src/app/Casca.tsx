import { Outlet, useLocation } from 'react-router-dom';
import { useEhCelular } from '../lib/celular';
import { useSessao } from '../lib/sessao';
import { abasDoCelular } from './abas';
import { BarraSuperior } from './BarraSuperior';
import { NavegacaoInferior } from './NavegacaoInferior';
import { Rodape } from './Rodape';

/**
 * Moldura de todas as telas internas: barra superior, conteúdo e rodapé. No computador as abas ficam
 * na barra superior; no celular, numa barra fixa na parte de baixo.
 */
export function Casca() {
  const ehCelular = useEhCelular();
  const { sessao } = useSessao();
  const { pathname } = useLocation();
  const abas = sessao ? abasDoCelular(sessao.perfil) : null;

  return (
    <div className="flex min-h-screen flex-col">
      <BarraSuperior />
      <main className={`flex flex-1 flex-col gap-6 ${ehCelular ? 'p-4' : 'p-8'}`}>
        <Outlet />
      </main>
      {/* No celular, o rodapé ganha espaço extra para não ficar escondido atrás da barra fixa. */}
      <Rodape celular={ehCelular} />
      {ehCelular && abas && (
        <NavegacaoInferior principais={abas.principais} mais={abas.mais} pathname={pathname} />
      )}
    </div>
  );
}
