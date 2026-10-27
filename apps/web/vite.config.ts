import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  define: {
    // Mocks ligados por padrão em `vite dev` enquanto a API real não existe;
    // desligados no build. Sobrescreva com VITE_USAR_MOCKS=0 ou 1.
    'import.meta.env.VITE_USAR_MOCKS': JSON.stringify(
      process.env.VITE_USAR_MOCKS ?? (command === 'serve' ? '1' : '0'),
    ),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
}));
