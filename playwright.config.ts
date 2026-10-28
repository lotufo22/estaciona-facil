import { defineConfig, devices } from '@playwright/test';
import { PORTA_API, PORTA_WEB, URL_WEB } from './e2e/ambiente';

try {
  process.loadEnvFile('.env');
} catch {
  // sem .env: segue só com o ambiente (no CI, DATABASE_URL_TESTE vem do ambiente)
}

const bancoDeTeste = process.env['DATABASE_URL_TESTE'] ?? '';

// Na máquina de quem desenvolve (Windows), usa o Edge que já vem instalado: dispensa baixar o
// Chromium do Playwright. No CI, usa o Chromium do Playwright (`npx playwright install chromium`).
const navegador = process.env['CI'] ? {} : { channel: 'msedge' as const };

/**
 * Testes de ponta a ponta: navegador de verdade, front (Vite), API (Express) e Postgres de teste.
 * Sobe a API numa porta própria (3101) e o front em outra (5174), para não esbarrar no seu `npm run dev`.
 * O banco é o de DATABASE_URL_TESTE e é APAGADO a cada execução.
 */
export default defineConfig({
  testDir: './e2e',
  // Os testes de aceitação contam uma história única (cadastro -> recebimento -> painel), em ordem.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: URL_WEB,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'aceitacao',
      testMatch: 'aceitacao.spec.ts',
      use: { ...devices['Desktop Chrome'], ...navegador },
    },
    {
      // As capturas refazem o banco com os dados de demonstração, então rodam depois da aceitação.
      name: 'capturas',
      testMatch: 'capturas.spec.ts',
      dependencies: ['aceitacao'],
      use: { ...devices['Desktop Chrome'], ...navegador, viewport: { width: 1280, height: 800 } },
    },
    {
      // O proprietário usa o celular (não tem computador): o mesmo sistema numa tela de 390 px, com
      // toque. Roda depois das capturas, que deixam o banco com os dados de demonstração.
      name: 'celular',
      testMatch: 'celular.spec.ts',
      dependencies: ['capturas'],
      use: {
        ...devices['Desktop Chrome'],
        ...navegador,
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: [
    {
      command: 'npx tsx e2e/preparar-banco.ts && npx tsx apps/api/src/servidor.ts',
      url: `http://localhost:${PORTA_API}/api/saude`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: { PORT: String(PORTA_API), DATABASE_URL: bancoDeTeste },
    },
    {
      command: `npm run dev -w @estacionafacil/web -- --port ${PORTA_WEB} --strictPort`,
      url: URL_WEB,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { API_URL: `http://localhost:${PORTA_API}`, VITE_USAR_MOCKS: '0' },
    },
  ],
});
