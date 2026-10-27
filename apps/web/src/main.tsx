import '@fontsource-variable/inter';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Roteador } from './app/Roteador';
import './estilos.css';

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado em index.html');

async function iniciar(elemento: HTMLElement) {
  // Dados de exemplo (Mock Service Worker) enquanto a API real não está ligada.
  if (import.meta.env.VITE_USAR_MOCKS === '1') {
    const { worker } = await import('./mocks/browser');
    await worker.start({ onUnhandledFrame: 'bypass' });
  }
  createRoot(elemento).render(
    <StrictMode>
      <Roteador />
    </StrictMode>,
  );
}

void iniciar(raiz);
