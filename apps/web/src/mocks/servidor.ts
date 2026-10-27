import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Servidor de mocks para os testes (Node). */
export const servidor = setupServer(...handlers);
