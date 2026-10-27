/**
 * Carrega o `.env` da raiz do repositório, se existir. É opcional: no CI e na Netlify as variáveis
 * já vêm do ambiente, e o que já está definido nunca é sobrescrito pelo arquivo.
 */
export function carregarEnv(): void {
  try {
    process.loadEnvFile(new URL('../../../.env', import.meta.url));
  } catch {
    // sem .env: segue só com o ambiente
  }
}
