import { expect, test } from '@playwright/test';
import { entrar, hoje, sair } from './ajudantes';

/**
 * Roteiro de aceitação da Fase 1 (spec, seção 13, critérios 1 a 7), contra a API e o banco de teste
 * de verdade. É uma história só, na ordem: cada passo usa o que o anterior deixou no banco.
 */
test.describe.configure({ mode: 'serial' });

const ABAS_DO_PROPRIETARIO = [
  'Painel',
  'Mensalistas',
  'Vencimentos',
  'Recebimentos',
  'Despesas',
  'Fluxo de caixa',
];
const ABAS_DO_AUXILIAR = ['Mensalistas', 'Recebimentos', 'Despesas'];

/** Dia do vencimento: o de hoje (limitado a 28), para o 1º vencimento cair daqui a um mês: "em dia". */
const DIA_DO_VENCIMENTO = String(Math.min(Number(hoje().slice(8, 10)), 28));

let mensalistaId = 0;

test('1. o Proprietário entra, vê o Painel e abre as 6 abas', async ({ page }) => {
  await entrar(page, 'dono');
  await expect(page).toHaveURL(/\/painel$/);
  await expect(page.getByRole('heading', { name: 'Painel', level: 1 })).toBeVisible();

  const abas = page.getByRole('navigation', { name: 'Abas principais' }).getByRole('link');
  await expect(abas).toHaveText(ABAS_DO_PROPRIETARIO);

  for (const aba of ABAS_DO_PROPRIETARIO) {
    await abas.filter({ hasText: aba }).click();
    await expect(page.getByRole('heading', { name: aba, level: 1 })).toBeVisible();
  }
});

test('2. cadastra um mensalista; placa repetida e vaga ocupada mostram o erro no campo', async ({
  page,
}) => {
  await entrar(page, 'dono');
  const preencher = async (dados: { nome: string; placa: string; vaga: string }) => {
    await page.goto('/mensalistas/novo');
    await page.getByLabel('Nome', { exact: true }).fill(dados.nome);
    await page.getByLabel('Telefone', { exact: true }).fill('(12) 99999-0000');
    await page.getByLabel('Placa', { exact: true }).fill(dados.placa);
    await page.getByLabel('Categoria', { exact: true }).selectOption('carro');
    await page.getByLabel('Vaga', { exact: true }).fill(dados.vaga);
    await page.getByLabel('Tipo de contrato', { exact: true }).selectOption('mensal');
    await page.getByLabel('Valor', { exact: true }).fill('255.00');
    await page.getByLabel('Dia do vencimento', { exact: true }).fill(DIA_DO_VENCIMENTO);
    await page.getByRole('button', { name: 'Cadastrar mensalista' }).click();
  };

  await preencher({ nome: 'Maria Teste', placa: 'ABC-1D23', vaga: '01' });
  await expect(page).toHaveURL(/\/mensalistas\/\d+$/);
  mensalistaId = Number(page.url().split('/').pop());

  // Mesma placa, escrita de outro jeito, em outra vaga: o erro aparece no campo Placa.
  await preencher({ nome: 'Outra Pessoa', placa: 'abc1d23', vaga: '02' });
  await expect(page.getByLabel('Placa', { exact: true })).toHaveAccessibleDescription(
    /já tem contrato ativo/,
  );
  await expect(page).toHaveURL(/\/mensalistas\/novo$/);

  // Placa nova, mas a vaga 01 já está ocupada: o erro aparece no campo Vaga.
  await preencher({ nome: 'Outra Pessoa', placa: 'DEF-2E34', vaga: '01' });
  await expect(page.getByLabel('Vaga', { exact: true })).toHaveAccessibleDescription(
    /já está ocupada/,
  );

  // E a lista mostra só a Maria.
  await page.goto('/mensalistas');
  await expect(page.getByRole('link', { name: 'Maria Teste' })).toBeVisible();
  await expect(page.getByText('Outra Pessoa')).toHaveCount(0);
});

test('3 e 4. o recebimento avança o vencimento e emite o comprovante; clique duplo não duplica', async ({
  page,
}) => {
  await entrar(page, 'auxiliar');

  const vencimentoAntes = (
    await (await page.request.get(`/api/mensalistas/${mensalistaId}`)).json()
  ).contrato.vencimento as string;

  await page.getByRole('navigation', { name: 'Abas principais' }).getByText('Recebimentos').click();
  await page.getByLabel('Buscar mensalista por nome ou placa', { exact: true }).fill('ABC1D23');
  await page.getByRole('button', { name: /Maria Teste/ }).click();
  await expect(page.getByLabel('Valor', { exact: true })).toHaveValue('255.00');

  // Dois cliques seguidos no mesmo botão: só um pagamento pode nascer.
  await page.getByRole('button', { name: 'Confirmar recebimento' }).dblclick();

  const comprovante = page.getByRole('region', { name: 'Comprovante de recebimento' });
  await expect(comprovante).toBeVisible();
  await expect(comprovante).toContainText('Maria Teste');

  const pagamentos = await (
    await page.request.get(`/api/pagamentos?de=${hoje()}&ate=${hoje()}`)
  ).json();
  expect(pagamentos.itens).toHaveLength(1);
  expect(pagamentos.total).toBe('255.00');

  const vencimentoDepois = (
    await (await page.request.get(`/api/mensalistas/${mensalistaId}`)).json()
  ).contrato.vencimento as string;
  expect(vencimentoDepois > vencimentoAntes).toBe(true);
  // Um mês exato à frente: mesmo dia do mês seguinte (o dia escolhido nunca passa de 28).
  const [anoA, mesA] = vencimentoAntes.split('-').map(Number) as [number, number];
  const esperado = mesA === 12 ? `${anoA + 1}-01` : `${anoA}-${String(mesA + 1).padStart(2, '0')}`;
  expect(vencimentoDepois).toBe(`${esperado}-${vencimentoAntes.slice(8)}`);
});

test('4. os contratos aparecem como em dia, a vencer ou vencido (aqui: em dia)', async ({
  page,
}) => {
  await entrar(page, 'dono');
  await page.goto('/vencimentos');
  await expect(page.getByRole('heading', { name: 'Vencimentos', level: 1 })).toBeVisible();
  const linha = page.getByRole('row', { name: /Maria Teste/ });
  await expect(linha).toContainText('Em dia');
});

test('5. a despesa fixa é lançada e fica como recorrência', async ({ page }) => {
  await entrar(page, 'dono');
  await page.getByRole('navigation', { name: 'Abas principais' }).getByText('Despesas').click();
  await page.getByLabel('Descrição', { exact: true }).fill('Aluguel do terreno');
  await page.getByLabel('Valor', { exact: true }).fill('2500.00');
  await page.getByLabel('Tipo', { exact: true }).selectOption('Fixa');
  await page.getByLabel('Dia do mês', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Lançar despesa' }).click();
  await expect(page.getByText('Aluguel do terreno').first()).toBeVisible();

  const recorrencias = await (await page.request.get('/api/recorrencias')).json();
  expect(recorrencias.itens).toEqual([
    expect.objectContaining({
      descricao: 'Aluguel do terreno',
      valor: '2500.00',
      diaDoMes: 5,
      ativa: true,
    }),
  ]);
  const despesas = await (await page.request.get('/api/despesas')).json();
  expect(despesas.itens).toHaveLength(1);
});

test('6. o Painel mostra o resultado do mês e o Fluxo de caixa oculta o resultado com filtro', async ({
  page,
}) => {
  await entrar(page, 'dono');
  // Receita de R$ 255,00 e despesa de R$ 2.500,00: o mês fecha em -R$ 2.245,00.
  await expect(page.getByText('Resultado do mês')).toBeVisible();
  await expect(page.getByText(/2\.245,00/).first()).toBeVisible();

  await page
    .getByRole('navigation', { name: 'Abas principais' })
    .getByText('Fluxo de caixa')
    .click();
  await expect(page.getByText('Resultado do período')).toBeVisible();
  await page.getByLabel('Categoria', { exact: true }).selectOption('Moto');
  await expect(page.getByText(/só é calculado sem filtro/)).toBeVisible();
  await expect(page.getByText('Resultado do período')).toHaveCount(0);
});

test('7. o Auxiliar vê só 3 abas e é devolvido a /recebimentos fora do perfil', async ({
  page,
}) => {
  await entrar(page, 'auxiliar');
  await expect(page).toHaveURL(/\/recebimentos$/);
  const abas = page.getByRole('navigation', { name: 'Abas principais' }).getByRole('link');
  await expect(abas).toHaveText(ABAS_DO_AUXILIAR);

  await page.goto('/fluxo-de-caixa');
  await expect(page).toHaveURL(/\/recebimentos$/);

  // A API barra por conta própria: esconder a aba não basta.
  expect((await page.request.get('/api/painel')).status()).toBe(403);
  expect((await page.request.get('/api/caixa?de=2026-01-01&ate=2026-12-31')).status()).toBe(403);
});

test('7. sem login nenhum dado é acessível', async ({ request }) => {
  for (const rota of ['/api/mensalistas', '/api/pagamentos', '/api/despesas', '/api/painel']) {
    expect((await request.get(rota)).status(), rota).toBe(401);
  }
});

test('sessão expirada volta ao login com o aviso', async ({ page, context }) => {
  await entrar(page, 'dono');
  await context.clearCookies(); // a sessão some, como se tivesse vencido
  await page.getByRole('navigation', { name: 'Abas principais' }).getByText('Vencimentos').click();
  await expect(page).toHaveURL(/\/entrar\?expirou=1$/);
  await expect(page.getByText('Sua sessão expirou. Entre de novo.')).toBeVisible();
});

test('sair encerra a sessão', async ({ page }) => {
  await entrar(page, 'dono');
  await sair(page);
  await page.goto('/painel');
  await expect(page).toHaveURL(/\/entrar/);
});
