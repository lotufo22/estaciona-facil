/**
 * Deixa o banco de TESTE pronto para o Playwright: confere que é mesmo de teste, aplica as
 * migrações, apaga tudo e recria as 49 vagas e os dois usuários. Com `--demo`, acrescenta ainda os
 * dados de demonstração (usados nas capturas do manual).
 *
 * Roda antes de subir a API (veja o `webServer` do playwright.config.ts) e também dentro do
 * `capturas.spec.ts`. APAGA OS DADOS do banco apontado por DATABASE_URL_TESTE.
 */
import { carregarEnv } from '../apps/api/src/ambiente';
import { criarUsuario } from '../apps/api/src/autenticacao/usuarios';
import { criarPrisma } from '../apps/api/src/prisma';
import { semearVagas } from '../apps/api/prisma/seed';
import { limparBanco } from '../apps/api/test/ajudantes';
import prepararBanco from '../apps/api/test/prepararBanco';
import { semearDemonstracao } from '../scripts/dados-de-demonstracao';
import { USUARIOS } from './ambiente';

carregarEnv();
// Confere o nome do banco ("test") e aplica as migrações; lança erro explicativo se algo estiver errado.
prepararBanco();

const url = process.env['DATABASE_URL_TESTE'];
if (!url) throw new Error('DATABASE_URL_TESTE não está definida.');

const prisma = criarPrisma(url);
try {
  await limparBanco(prisma);
  await semearVagas(prisma);
  for (const usuario of Object.values(USUARIOS)) await criarUsuario(prisma, usuario);
  if (process.argv.includes('--demo')) await semearDemonstracao(prisma);
  console.log(
    `Banco de teste pronto${process.argv.includes('--demo') ? ' (com demonstração)' : ''}.`,
  );
} finally {
  await prisma.$disconnect();
}
