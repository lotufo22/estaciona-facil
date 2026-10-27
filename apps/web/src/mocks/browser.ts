import { setupWorker } from 'msw/browser';
import { fixarHoje } from '../lib/hoje';
import { HOJE_MOCK } from './banco';
import { handlers } from './handlers';

/** Worker de mocks para o navegador (ligado por VITE_USAR_MOCKS=1). */
export const worker = setupWorker(...handlers);

// Os dados de exemplo são de uma data fixa; as telas passam a usar o mesmo "hoje" que eles.
fixarHoje(HOJE_MOCK);
