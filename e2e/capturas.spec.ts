import { execSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { test } from '@playwright/test';
import { entrar } from './ajudantes';
import { URL_WEB } from './ambiente';

/**
 * Gera as imagens do manual do usuário em `docs/manual/capturas/`, a partir dos dados de
 * demonstração. Refaz o banco de teste antes (apaga tudo e semeia a demonstração).
 */
const PASTA = 'docs/manual/capturas';

test.describe.configure({ mode: 'serial' });

test.beforeAll(() => {
  mkdirSync(PASTA, { recursive: true });
  execSync('npx tsx e2e/preparar-banco.ts --demo', { stdio: 'inherit' });
});

const PAGINAS_DO_PROPRIETARIO: [string, string][] = [
  ['02-painel', '/painel'],
  ['03-mensalistas', '/mensalistas'],
  ['04-novo-mensalista', '/mensalistas/novo'],
  ['05-vencimentos', '/vencimentos'],
  ['06-recebimentos', '/recebimentos'],
  ['07-despesas', '/despesas'],
  ['08-fluxo-de-caixa', '/fluxo-de-caixa'],
];

test('tela de entrada', async ({ page }) => {
  await page.goto('/entrar');
  await page.getByRole('heading', { name: 'Entrar', level: 1 }).waitFor();
  await page.screenshot({ path: `${PASTA}/01-entrar.png` });
});

test('telas do Proprietário', async ({ page }) => {
  await entrar(page, 'dono');
  for (const [arquivo, rota] of PAGINAS_DO_PROPRIETARIO) {
    await page.goto(rota);
    await page.getByRole('heading', { level: 1 }).waitFor();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${PASTA}/${arquivo}.png`, fullPage: true });
  }
});

test('detalhe de um mensalista e comprovante', async ({ page }) => {
  await entrar(page, 'dono');
  await page.goto('/mensalistas');
  await page.getByRole('link', { name: 'Joana Prado' }).click();
  await page.getByRole('heading', { level: 1 }).waitFor();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${PASTA}/09-detalhe-mensalista.png`, fullPage: true });

  await page.goto('/recebimentos');
  await page.getByLabel('Buscar mensalista por nome ou placa', { exact: true }).fill('ABC1D23');
  await page.getByRole('button', { name: /Joana Prado/ }).click();
  await page.getByRole('button', { name: 'Confirmar recebimento' }).click();
  await page.getByRole('region', { name: 'Comprovante de recebimento' }).waitFor();
  await page.screenshot({ path: `${PASTA}/10-comprovante.png`, fullPage: true });
});

test('telas do Auxiliar', async ({ page }) => {
  await entrar(page, 'auxiliar');
  await page.getByRole('heading', { name: 'Recebimentos', level: 1 }).waitFor();
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${PASTA}/11-auxiliar-recebimentos.png`, fullPage: true });
});

test('telas no celular', async ({ browser }) => {
  // O proprietário usa o celular: o manual mostra as telas como ele as vê.
  const contexto = await browser.newContext({
    baseURL: URL_WEB,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  });
  const page = await contexto.newPage();
  await entrar(page, 'dono');

  for (const [arquivo, rota, titulo] of [
    ['12-celular-painel', '/painel', 'Painel'],
    ['13-celular-mensalistas', '/mensalistas', 'Mensalistas'],
    ['14-celular-recebimentos', '/recebimentos', 'Recebimentos'],
  ] as const) {
    await page.goto(rota);
    await page.getByRole('heading', { name: titulo, level: 1 }).waitFor();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: `${PASTA}/${arquivo}.png` });
  }

  await page.goto('/painel');
  await page.getByRole('heading', { name: 'Painel', level: 1 }).waitFor();
  await page.getByRole('button', { name: 'Mais' }).tap();
  await page.getByRole('list', { name: 'Mais abas' }).waitFor();
  await page.screenshot({ path: `${PASTA}/15-celular-menu-mais.png` });
  await contexto.close();
});
