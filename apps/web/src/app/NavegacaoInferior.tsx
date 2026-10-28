import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icone } from '../components/ui/Icone';
import type { AbaDefinicao } from './abas';

interface NavegacaoInferiorProps {
  principais: AbaDefinicao[];
  mais: AbaDefinicao[];
  pathname: string;
}

const estaNaAba = (pathname: string, aba: AbaDefinicao) =>
  pathname === aba.para || pathname.startsWith(`${aba.para}/`);

const CLASSE_DO_ITEM =
  'flex min-h-16 flex-1 flex-col items-center justify-center gap-1 px-1 text-sm focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-white';

/**
 * Barra de abas na parte de baixo da tela, onde o polegar alcança (só no celular). As abas do dia a
 * dia ficam à mostra; as outras, quando existem, ficam atrás do botão "Mais".
 */
export function NavegacaoInferior({ principais, mais, pathname }: NavegacaoInferiorProps) {
  const [aberto, setAberto] = useState(false);
  const idDoMenu = useId();
  const emUmaDasOutras = mais.some((aba) => estaNaAba(pathname, aba));

  // Ao trocar de tela, o menu fecha.
  useEffect(() => setAberto(false), [pathname]);

  // Esc fecha o menu.
  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && setAberto(false);
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto]);

  return (
    <>
      {aberto && (
        <button
          type="button"
          aria-label="Fechar o menu"
          tabIndex={-1}
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-30 cursor-default bg-black/40"
        />
      )}

      <nav
        aria-label="Abas principais"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-barra-ativa bg-barra pb-[env(safe-area-inset-bottom)] text-white"
      >
        {aberto && (
          <ul
            id={idDoMenu}
            aria-label="Mais abas"
            className="absolute right-2 bottom-full mb-2 flex w-64 flex-col overflow-hidden rounded-lg bg-barra shadow-lg ring-1 ring-barra-ativa"
          >
            {mais.map((aba) => (
              <li key={aba.para}>
                <Link
                  to={aba.para}
                  aria-current={estaNaAba(pathname, aba) ? 'page' : undefined}
                  className={`flex min-h-14 items-center gap-3 px-4 text-base ${
                    estaNaAba(pathname, aba)
                      ? 'bg-barra-ativa font-semibold text-white'
                      : 'text-barra-texto'
                  }`}
                >
                  <Icone nome={aba.icone} className="size-6 text-barra-icone" />
                  {aba.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="flex">
          {principais.map((aba) => {
            const ativa = estaNaAba(pathname, aba);
            return (
              <Link
                key={aba.para}
                to={aba.para}
                aria-current={ativa ? 'page' : undefined}
                className={`${CLASSE_DO_ITEM} ${
                  ativa ? 'bg-barra-ativa font-semibold text-white' : 'text-barra-texto'
                }`}
              >
                <Icone nome={aba.icone} className="size-6 text-barra-icone" />
                {aba.rotulo}
              </Link>
            );
          })}

          {mais.length > 0 && (
            <button
              type="button"
              aria-expanded={aberto}
              aria-controls={aberto ? idDoMenu : undefined}
              onClick={() => setAberto((valor) => !valor)}
              className={`${CLASSE_DO_ITEM} cursor-pointer ${
                aberto || emUmaDasOutras
                  ? 'bg-barra-ativa font-semibold text-white'
                  : 'text-barra-texto'
              }`}
            >
              <Icone nome="mais" className="size-6 text-barra-icone" />
              Mais
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
