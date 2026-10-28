/**
 * Gera as funções da Netlify em JavaScript puro, a partir de `netlify/funcoes/*.mts`.
 *
 * Por que não deixar a Netlify empacotar: nas funções v2 (as únicas empacotadas como ES modules, e
 * as que precisamos por causa do `import.meta.url` do cliente do Prisma) ela só copia arquivos, e o
 * pacote `@estacionafacil/shared` é TypeScript, que o Node não executa dentro de `node_modules`.
 * Aqui tudo vira um bundle ESM por função. Só o `argon2` fica de fora: é um módulo nativo, a
 * Netlify o leva junto em `node_modules` (com os binários prontos).
 *
 *   npm run funcoes
 */
import { build } from 'esbuild';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Módulos que NÃO entram no bundle (nativos: o Netlify os envia em node_modules). */
const EXTERNOS = ['argon2'];

export async function empacotarFuncoes(saida = join(RAIZ, 'netlify/functions')) {
  const origem = join(RAIZ, 'netlify/funcoes');
  const entradas = readdirSync(origem)
    .filter((nome) => nome.endsWith('.mts'))
    .map((nome) => join(origem, nome));

  rmSync(saida, { recursive: true, force: true });
  mkdirSync(saida, { recursive: true });

  await build({
    entryPoints: entradas,
    outdir: saida,
    outExtension: { '.js': '.mjs' },
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    external: EXTERNOS,
    logLevel: 'warning',
    // Bibliotecas CommonJS dentro de um bundle ESM usam `require` para os módulos do Node.
    banner: {
      js: "import { createRequire as __criarRequire } from 'node:module'; const require = __criarRequire(import.meta.url);",
    },
  });
  return saida;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const saida = await empacotarFuncoes();
  console.log(`Funções geradas em ${saida}`);
}
