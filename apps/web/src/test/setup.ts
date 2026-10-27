import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { fixarHoje } from '../lib/hoje';
import { HOJE_MOCK, reiniciarBancoMock } from '../mocks/banco';
import { servidor } from '../mocks/servidor';

beforeAll(() => {
  servidor.listen({ onUnhandledFrame: 'error' });
  fixarHoje(HOJE_MOCK);
});

afterEach(() => {
  cleanup();
  servidor.resetHandlers();
  reiniciarBancoMock();
});

afterAll(() => servidor.close());
