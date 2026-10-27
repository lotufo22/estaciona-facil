import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Prepara o banco de testes (confere o nome e aplica as migrações) antes de qualquer teste.
    globalSetup: ['./test/prepararBanco.ts'],
    // Todos os arquivos usam o mesmo Postgres e apagam os dados entre os testes:
    // rodar arquivos em paralelo faria um apagar os dados do outro.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
  },
});
