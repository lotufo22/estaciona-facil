import type { Perfil } from '@estacionafacil/shared';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../app/Roteador';
import { entrarNoMock } from '../mocks/banco';

interface Opcoes {
  /** Perfil já autenticado no mock; omita para começar sem sessão. */
  perfil?: Perfil;
}

/** Renderiza o app inteiro (provedores, sessão e rotas) numa rota inicial. */
export function renderizarApp(rota: string, { perfil }: Opcoes = {}) {
  if (perfil) entrarNoMock(perfil);
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <App />
    </MemoryRouter>,
  );
}
