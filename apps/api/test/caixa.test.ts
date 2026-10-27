import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import {
  criarContratoDireto,
  criarDespesaDireta,
  criarPagamentoDireto,
  limparMovimento,
} from './ajudantesConsultas';
import { entrarComo, semearBasico } from './ajudantesRotas';

const { app, prisma, limparBanco, encerrar } = criarAppDeTeste({
  agora: () => new Date('2026-10-26T15:00:00Z'),
});

let dono = '';
let auxiliar = '';

beforeAll(async () => {
  await limparBanco();
  await semearBasico(prisma);
  dono = await entrarComo(app, 'proprietario');
  auxiliar = await entrarComo(app, 'auxiliar');
});
afterAll(encerrar);

beforeEach(async () => {
  await limparMovimento(prisma);
  const carroMensal = await criarContratoDireto(prisma, { nome: 'Ana', vencimento: '2026-11-05' });
  const motoSemanal = await criarContratoDireto(prisma, {
    nome: 'Carla',
    vencimento: '2026-11-05',
    categoria: 'moto',
    tipo: 'semanal',
  });
  // Dentro de outubro: 255 + 255 + 120 = 630,00.
  await criarPagamentoDireto(prisma, carroMensal.contratoId, {
    valor: '255.00',
    pagoEm: '2026-10-05',
    forma: 'pix',
  });
  await criarPagamentoDireto(prisma, carroMensal.contratoId, {
    valor: '255.00',
    pagoEm: '2026-10-12',
    forma: 'dinheiro',
  });
  await criarPagamentoDireto(prisma, motoSemanal.contratoId, {
    valor: '120.00',
    pagoEm: '2026-10-20',
    forma: 'pix',
  });
  // Fora de outubro: não entram no período de outubro.
  await criarPagamentoDireto(prisma, carroMensal.contratoId, {
    valor: '99.00',
    pagoEm: '2026-09-30',
  });
  await criarPagamentoDireto(prisma, carroMensal.contratoId, {
    valor: '77.00',
    pagoEm: '2026-11-01',
  });
  // Despesas: 5500 + 430 em outubro; 17 em setembro e 8 em novembro ficam de fora.
  await criarDespesaDireta(prisma, { valor: '5500.00', data: '2026-10-10' });
  await criarDespesaDireta(prisma, { valor: '430.00', data: '2026-10-15' });
  await criarDespesaDireta(prisma, { valor: '17.00', data: '2026-09-15' });
  await criarDespesaDireta(prisma, { valor: '8.00', data: '2026-11-03' });
});

const OUTUBRO = 'de=2026-10-01&ate=2026-10-31';
const consultar = (consulta: string, cookie = dono) =>
  request(app).get(`/api/caixa?${consulta}`).set('Cookie', cookie);

describe('GET /caixa', () => {
  it('soma receitas e despesas do período; resultado negativo é válido', async () => {
    const resposta = await consultar(OUTUBRO);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      de: '2026-10-01',
      ate: '2026-10-31',
      receitas: '630.00',
      despesas: '5930.00',
      resultado: '-5300.00',
      filtrado: false,
    });
  });

  it('o período é por data, inclusive nas pontas', async () => {
    const dia = await consultar('de=2026-09-30&ate=2026-09-30');
    expect(dia.body).toMatchObject({ receitas: '99.00', despesas: '0.00', resultado: '99.00' });
    const primeiro = await consultar('de=2026-11-01&ate=2026-11-01');
    expect(primeiro.body.receitas).toBe('77.00');
    expect(primeiro.body.despesas).toBe('0.00');
  });

  it('categoria=moto: receitas só de motos, resultado null e filtrado true', async () => {
    const resposta = await consultar(`${OUTUBRO}&categoria=moto`);
    expect(resposta.body).toMatchObject({
      receitas: '120.00',
      despesas: '5930.00',
      resultado: null,
      filtrado: true,
    });
  });

  it('tipo=semanal também filtra as receitas e oculta o resultado', async () => {
    const resposta = await consultar(`${OUTUBRO}&tipo=semanal`);
    expect(resposta.body).toMatchObject({ receitas: '120.00', resultado: null, filtrado: true });
  });

  it('porForma soma por forma de pagamento', async () => {
    const { porForma } = (await consultar(OUTUBRO)).body;
    const total = (forma: string) =>
      porForma.find((f: { forma: string }) => f.forma === forma)?.total;
    expect(total('pix')).toBe('375.00');
    expect(total('dinheiro')).toBe('255.00');
    expect(total('debito')).toBeUndefined();
  });

  it('serieMensal cobre todos os meses do período, inclusive os sem movimento', async () => {
    const { serieMensal } = (await consultar('de=2026-07-15&ate=2026-10-31')).body;
    expect(serieMensal).toEqual([
      { mes: '2026-07-01', receitas: '0.00', despesas: '0.00' },
      { mes: '2026-08-01', receitas: '0.00', despesas: '0.00' },
      { mes: '2026-09-01', receitas: '99.00', despesas: '17.00' },
      { mes: '2026-10-01', receitas: '630.00', despesas: '5930.00' },
    ]);
  });

  it('período sem nada: zeros e resultado 0.00', async () => {
    const resposta = await consultar('de=2025-01-01&ate=2025-01-31');
    expect(resposta.body).toMatchObject({ receitas: '0.00', despesas: '0.00', resultado: '0.00' });
    expect(resposta.body.porForma).toEqual([]);
  });

  it('ate anterior a de: 422 em campos.ate', async () => {
    const resposta = await consultar('de=2026-10-31&ate=2026-10-01');
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.campos.ate).toBeTruthy();
  });

  it('sem período ou com tipo/categoria inválidos: 422', async () => {
    expect((await consultar('')).status).toBe(422);
    expect((await consultar(`${OUTUBRO}&categoria=bike`)).status).toBe(422);
    expect((await consultar(`${OUTUBRO}&tipo=anual`)).status).toBe(422);
  });

  it('Auxiliar: 403; sem login: 401', async () => {
    expect((await consultar(OUTUBRO, auxiliar)).status).toBe(403);
    expect((await request(app).get(`/api/caixa?${OUTUBRO}`)).status).toBe(401);
  });
});
