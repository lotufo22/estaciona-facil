import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/generated/**',
      '**/coverage/**',
      '.netlify/**',
      // Funções da Netlify geradas por `npm run funcoes` (as fontes ficam em netlify/funcoes).
      'netlify/functions/**',
      '.superpowers/**',
      '.worktrees/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // Scripts em JavaScript puro rodam no Node.
    files: ['**/*.mjs'],
    languageOptions: { globals: { process: 'readonly', console: 'readonly' } },
  },
);
