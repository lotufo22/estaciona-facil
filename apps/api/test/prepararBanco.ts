import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { carregarEnv } from '../src/ambiente';

/**
 * Erro cujo `stack` é só a mensagem. O Vitest 5 quebra ao mapear a pilha de um erro lançado no
 * globalSetup ("code.charCodeAt is not a function") e esconderia o texto que explica o problema.
 */
function falha(mensagem: string, causa?: unknown): Error {
  const erro = new Error(mensagem, causa === undefined ? undefined : { cause: causa });
  erro.stack = mensagem;
  return erro;
}

/** Nome do banco da URL, sem a barra inicial (`.../estaciona_teste?x=1` vira `estaciona_teste`). */
function nomeDoBanco(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

/**
 * Roda uma vez antes de todos os testes (globalSetup do Vitest): confere que o banco é mesmo de
 * teste e aplica as migrações nele. Os testes apagam os dados, então a trava abaixo é de propósito.
 */
export default function prepararBanco(): void {
  carregarEnv();

  const url = process.env['DATABASE_URL_TESTE'];
  if (!url) {
    throw falha(
      [
        'DATABASE_URL_TESTE não está definida.',
        'Crie um banco só para os testes e aponte para ele no .env da raiz, por exemplo:',
        '  createdb -U postgres estaciona_teste',
        '  DATABASE_URL_TESTE=postgresql://USUARIO:SENHA@localhost:5432/estaciona_teste',
        '(veja apps/api/README.md)',
      ].join('\n'),
    );
  }

  const nome = nomeDoBanco(url);
  if (!/test/i.test(nome)) {
    throw falha(
      `Os testes apagam todos os dados do banco, e "${nome}" não parece um banco de teste ` +
        '(o nome precisa conter "test" ou "teste"). Aponte DATABASE_URL_TESTE para um banco só dos testes.',
    );
  }

  const cli = fileURLToPath(
    new URL('../../../node_modules/prisma/build/index.js', import.meta.url),
  );
  try {
    execFileSync(process.execPath, [cli, 'migrate', 'deploy'], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: { ...process.env, DATABASE_URL_MIGRACAO: url },
      stdio: 'pipe',
    });
  } catch (erro) {
    const saida = erro as { stdout?: Buffer; stderr?: Buffer };
    throw falha(
      `Não foi possível aplicar as migrações no banco de teste "${nome}".\n` +
        `${saida.stdout?.toString() ?? ''}${saida.stderr?.toString() ?? ''}`,
      erro,
    );
  }
}
