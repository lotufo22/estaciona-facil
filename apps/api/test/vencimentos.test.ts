import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import { criarContratoDireto, limparMovimento } from './ajudantesConsultas';
import { entrarComo, semearBasico } from './ajudantesRotas';

// Relógio fixo: 26/10/2026 (em São Paulo).
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
  await criarContratoDireto(prisma, { nome: 'Ana', vencimento: '2026-10-10', valor: '255.00' }); // vencido
  await criarContratoDireto(prisma, { nome: 'Bruno', vencimento: '2026-09-01', valor: '100.50' }); // vencido
  await criarContratoDireto(prisma, {
    nome: 'Carla',
    vencimento: '2026-10-30',
    valor: '90.00',
    categoria: 'moto',
    tipo: 'semanal',
  }); // a vencer
  await criarContratoDireto(prisma, { nome: 'Davi', vencimento: '2026-12-01', valor: '300.00' }); // em dia
  await criarContratoDireto(prisma, {
    nome: 'Eva',
    vencimento: '2026-10-01',
    valor: '999.00',
    status: 'encerrado',
  }); // encerrado: fora
});

const consultar = (consulta = '', cookie = dono) =>
  request(app).get(`/api/vencimentos${consulta}`).set('Cookie', cookie);

describe('GET /vencimentos', () => {
  it('totais por situação batem com a regra do domínio; encerrados não aparecem', async () => {
    const resposta = await consultar();
    expect(resposta.status).toBe(200);
    expect(resposta.body.totais).toEqual({
      vencido: { quantidade: 2, total: '355.50' },
      a_vencer: { quantidade: 1, total: '90.00' },
      em_dia: { quantidade: 1, total: '300.00' },
    });
    expect(resposta.body.itens).toHaveLength(4);
    expect(resposta.body.itens.map((i: { nome: string }) => i.nome)).not.toContain('Eva');
  });

  it('ordena por vencimento crescente e devolve o item no formato da lista de mensalistas', async () => {
    const { itens } = (await consultar()).body;
    expect(itens.map((i: { nome: string }) => i.nome)).toEqual(['Bruno', 'Ana', 'Carla', 'Davi']);
    expect(itens[0]).toMatchObject({
      nome: 'Bruno',
      vencimento: '2026-09-01',
      valor: '100.50',
      situacao: 'vencido',
      categoria: 'carro',
      vaga: null,
    });
  });

  it('situacao filtra só a tabela: os totais continuam mostrando as três', async () => {
    const resposta = await consultar('?situacao=vencido');
    expect(resposta.body.itens.map((i: { nome: string }) => i.nome)).toEqual(['Bruno', 'Ana']);
    expect(resposta.body.totais.em_dia.quantidade).toBe(1);
    expect(resposta.body.totais.a_vencer.quantidade).toBe(1);
  });

  it('categoria e tipo valem para totais e tabela', async () => {
    const moto = await consultar('?categoria=moto');
    expect(moto.body.itens).toHaveLength(1);
    expect(moto.body.totais.vencido.quantidade).toBe(0);
    expect(moto.body.totais.a_vencer).toEqual({ quantidade: 1, total: '90.00' });

    const mensal = await consultar('?tipo=mensal');
    expect(mensal.body.itens).toHaveLength(3);
  });

  it('filtros inválidos: 422', async () => {
    expect((await consultar('?situacao=atrasado')).status).toBe(422);
    expect((await consultar('?categoria=bike')).status).toBe(422);
    expect((await consultar('?tipo=anual')).status).toBe(422);
  });

  it('Auxiliar: 403; sem login: 401', async () => {
    expect((await consultar('', auxiliar)).status).toBe(403);
    expect((await request(app).get('/api/vencimentos')).status).toBe(401);
  });
});
