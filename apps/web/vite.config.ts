import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/** Onde está a API local; o Vite repassa `/api` para ela, então o navegador fala com uma origem só. */
const API_LOCAL = process.env.API_URL ?? 'http://localhost:3001';

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    // Dados de exemplo (Mock Service Worker) só no modo `mocks` (`npm run dev:mocks`) ou com
    // VITE_USAR_MOCKS=1. `npm run dev` e o build falam com a API de verdade.
    'import.meta.env.VITE_USAR_MOCKS': JSON.stringify(
      process.env.VITE_USAR_MOCKS ?? (mode === 'mocks' ? '1' : '0'),
    ),
  },
  server: {
    proxy: { '/api': API_LOCAL },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));
