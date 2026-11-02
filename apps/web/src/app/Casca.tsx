import { Outlet, useLocation } from 'react-router-dom';
import { useEhCelular } from '../lib/celular';
import { useSessao } from '../lib/sessao';
import { abasDoCelular } from './abas';
import { BarraSuperior } from './BarraSuperior';
import { NavegacaoInferior } from './NavegacaoInferior';
import { Rodape } from './Rodape';

/**
 * Moldura das telas internas: cabeçalho, conteúdo e rodapé. A navegação fica na lateral do
 * computador e na barra inferior do celular.
 */
export function Casca() {
  const ehCelular = useEhCelular();
  const { sessao } = useSessao();
  const { pathname } = useLocation();
  const abas = sessao ? abasDoCelular(sessao.perfil) : null;

  return (
    <div className="app-shell flex min-h-screen flex-col sm:pl-56 lg:pl-64">
      <BarraSuperior />
      <main
        id="conteudo"
        tabIndex={-1}
        className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-10"
      >
        <div key={pathname} className="pagina-entrada flex min-w-0 flex-col gap-6">
          <Outlet />
        </div>
      </main>
      {/* No celular, o rodapé ganha espaço extra para não ficar escondido atrás da barra fixa. */}
      <Rodape celular={ehCelular} />
      {ehCelular && abas && (
        <NavegacaoInferior principais={abas.principais} mais={abas.mais} pathname={pathname} />
      )}
    </div>
  );
}
