import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { reiniciarBancoMock } from '../mocks/banco';
import { servidor } from '../mocks/servidor';

beforeAll(() => servidor.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  servidor.resetHandlers();
  reiniciarBancoMock();
});

afterAll(() => servidor.close());
