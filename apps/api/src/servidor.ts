import { criarApp } from './app';
import { carregarEnv } from './ambiente';
import { criarPrisma } from './prisma';

// Servidor local (`npm run dev -w @estacionafacil/api`). Só abre a porta: toda a lógica está em `criarApp`.
carregarEnv();

const urlDoBanco = process.env['DATABASE_URL'];
if (!urlDoBanco) {
  console.error('Defina DATABASE_URL no .env da raiz (veja o .env.example).');
  process.exit(1);
}

const porta = Number(process.env['PORT'] ?? 3001);
criarApp({ prisma: criarPrisma(urlDoBanco) }).listen(porta, () => {
  console.log(`API em http://localhost:${porta}/api`);
});
