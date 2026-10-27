import { Outlet } from 'react-router-dom';
import { BarraSuperior } from './BarraSuperior';
import { Rodape } from './Rodape';

/** Moldura de todas as telas internas: barra com abas, conteúdo e rodapé. */
export function Casca() {
  return (
    <div className="flex min-h-screen flex-col">
      <BarraSuperior />
      <main className="flex flex-1 flex-col gap-6 p-8">
        <Outlet />
      </main>
      <Rodape />
    </div>
  );
}
