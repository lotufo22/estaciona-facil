import { defineConfig } from 'prisma/config';

// O Prisma 7 não carrega o .env sozinho. O arquivo fica na raiz do repositório e é opcional:
// no CI e na Netlify as variáveis já vêm do ambiente.
try {
  process.loadEnvFile(new URL('../../.env', import.meta.url));
} catch {
  // sem .env: usa só o que já está no ambiente
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // As migrações usam a URL do pooler em modo sessão (spec, seção 9); o app usa DATABASE_URL.
    url: process.env['DATABASE_URL_MIGRACAO'] ?? process.env['DATABASE_URL'] ?? '',
  },
});
