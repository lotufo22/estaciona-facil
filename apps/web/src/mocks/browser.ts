import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Worker de mocks para o navegador (ligado por VITE_USAR_MOCKS=1). */
export const worker = setupWorker(...handlers);
