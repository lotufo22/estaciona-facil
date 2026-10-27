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
      '.superpowers/**',
      '.worktrees/**',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
);
