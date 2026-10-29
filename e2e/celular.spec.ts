import { expect, test, type Page } from '@playwright/test';
import { entrar } from './ajudantes';

/**
 * O sistema no celular (390 px, com toque). O proprietário disse que está sem computador e usa o
 * celular, então estas telas precisam funcionar de verdade nele. Usa os dados de demonstração.
 */

const TELAS_DO_PROPRIETARIO: [string, string][] = [
  ['Painel', '/painel'],
  ['Mensalistas', '/mensalistas'],
  ['Vencimentos', '/vencimentos'],
  ['Recebimentos', '/recebimentos'],
  ['Despesas', '/despesas'],
  ['Fluxo de caixa', '/fluxo-de-caixa'],
  ['Usuários', '/usuarios'],
  ['Minha conta', '/conta'],
  ['Novo mensalista', '/mensalistas/novo'],
];

async function larguraDaPagina(page: Page) {
  return page.evaluate(() => ({
    janela: document.documentElement.clientWidth,
    conteudo: document.documentElement.scrollWidth,
  }));
}

test('o Proprietário usa as abas na barra de baixo e o menu Mais', async ({ page }) => {
  await entrar(page, 'dono');

  const abas = page.getByRole('navigation', { name: 'Abas principais' });
  await expect(abas.getByRole('link')).toHaveText(['Painel', 'Mensalistas', 'Recebimentos']);

  // A barra fica colada no pé da tela, onde o polegar alcança.
  const altura = page.viewportSize()?.height ?? 0;
  const caixa = await abas.boundingBox();
  expect(Math.round((caixa?.y ?? 0) + (caixa?.height ?? 0))).toBe(altura);

  // As outras quatro abas ficam atrás do "Mais".
  await abas.getByRole('button', { name: 'Mais' }).tap();
  const menu = page.getByRole('list', { name: 'Mais abas' });
  await expect(menu.getByRole('link')).toHaveText([
    'Vencimentos',
    'Despesas',
    'Fluxo de caixa',
    'Usuários',
  ]);

  await menu.getByRole('link', { name: 'Fluxo de caixa' }).tap();
  await expect(page.getByRole('heading', { name: 'Fluxo de caixa', level: 1 })).toBeVisible();
  await expect(page.getByRole('list', { name: 'Mais abas' })).toHaveCount(0);
});

test('nenhuma tela rola para o lado e o cabeçalho não ocupa metade da tela', async ({ page }) => {
  await entrar(page, 'dono');
  const altura = page.viewportSize()?.height ?? 844;

  for (const [titulo, rota] of TELAS_DO_PROPRIETARIO) {
    await page.goto(rota);
    await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible();
    await page.waitForLoadState('networkidle');

    const { janela, conteudo } = await larguraDaPagina(page);
    expect(conteudo, `${titulo} rola para o lado`).toBeLessThanOrEqual(janela + 1);

    // A faixa de cima (nome, botões e busca) cabe em menos de um quarto da tela.
    const faixa = await page
      .getByRole('search')
      .locator('xpath=ancestor::div[contains(@class,"bg-barra")][1]')
      .boundingBox();
    expect(faixa?.height ?? 0, `${titulo}: cabeçalho muito alto`).toBeLessThan(altura / 4);
  }
});

test('a lista de mensalistas vira cartões, sem rolar para o lado', async ({ page }) => {
  await entrar(page, 'dono');
  await page.goto('/mensalistas');
  await expect(page.getByRole('link', { name: 'Joana Prado' })).toBeVisible();

  // No celular, cada linha é um bloco (cartão), não uma linha de tabela.
  const linha = page.getByRole('row').filter({ hasText: 'Joana Prado' });
  await expect(linha).toHaveCSS('display', 'block');
  const { janela, conteudo } = await larguraDaPagina(page);
  expect(conteudo).toBeLessThanOrEqual(janela + 1);
});

test('o Auxiliar vê as 3 abas dele na barra de baixo, sem Mais', async ({ page }) => {
  await entrar(page, 'auxiliar');
  const abas = page.getByRole('navigation', { name: 'Abas principais' });
  await expect(abas.getByRole('link')).toHaveText(['Mensalistas', 'Recebimentos', 'Despesas']);
  await expect(abas.getByRole('button', { name: 'Mais' })).toHaveCount(0);
});

test('registrar um recebimento funciona no celular', async ({ page }) => {
  await entrar(page, 'dono');
  await page.goto('/recebimentos');
  await page.getByLabel('Buscar mensalista por nome ou placa', { exact: true }).fill('Carlos');
  await page.getByRole('button', { name: /Carlos Mendes/ }).tap();
  await expect(page.getByLabel('Valor', { exact: true })).toHaveValue('255.00');
  await page.getByRole('button', { name: 'Confirmar recebimento' }).tap();
  await expect(page.getByRole('region', { name: 'Comprovante de recebimento' })).toBeVisible();
});
