import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import { CABECALHO, entrarComo, semearBasico } from './ajudantesRotas';

const { app, prisma, limparBanco, encerrar } = criarAppDeTeste({
  agora: () => new Date('2026-11-05T15:00:00Z'),
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
  await prisma.despesa.deleteMany();
  await prisma.recorrenciaDespesa.deleteMany();
});

const lancar = (corpo: Record<string, unknown>, cookie = auxiliar) =>
  request(app).post('/api/despesas').set(CABECALHO).set('Cookie', cookie).send(corpo);
const listar = (consulta = '') =>
  request(app).get(`/api/despesas${consulta}`).set('Cookie', auxiliar);

const variavel = (sobrescritas: Record<string, unknown> = {}) => ({
  descricao: 'Material de limpeza',
  valor: '45.90',
  tipo: 'variavel',
  data: '2026-11-03',
  ...sobrescritas,
});
const fixa = (sobrescritas: Record<string, unknown> = {}) => ({
  descricao: 'Aluguel',
  valor: '2500.00',
  tipo: 'fixa',
  data: '2026-11-05',
  diaDoMes: 5,
  ...sobrescritas,
});

describe('POST /despesas', () => {
  it('variável: grava o lançamento, sem recorrência', async () => {
    const resposta = await lancar(variavel());
    expect(resposta.status).toBe(201);
    expect(resposta.body.recorrenciaId).toBeNull();
    expect(await prisma.recorrenciaDespesa.count()).toBe(0);

    const gravada = await prisma.despesa.findUniqueOrThrow({
      where: { id: resposta.body.despesaId },
    });
    expect(gravada).toMatchObject({ tipo: 'variavel', competencia: null, recorrenciaId: null });
    expect(gravada.valor.toFixed(2)).toBe('45.90');
  });

  it('fixa: cria o lançamento do mês e a recorrência, ligados por competencia', async () => {
    const resposta = await lancar(fixa());
    expect(resposta.status).toBe(201);
    expect(resposta.body.recorrenciaId).toEqual(expect.any(Number));

    const recorrencia = await prisma.recorrenciaDespesa.findUniqueOrThrow({
      where: { id: resposta.body.recorrenciaId },
    });
    expect(recorrencia).toMatchObject({ descricao: 'Aluguel', diaDoMes: 5, ativa: true });
    expect(recorrencia.valor.toFixed(2)).toBe('2500.00');

    const despesa = await prisma.despesa.findUniqueOrThrow({
      where: { id: resposta.body.despesaId },
    });
    expect(despesa.recorrenciaId).toBe(recorrencia.id);
    expect(despesa.competencia?.toISOString().slice(0, 10)).toBe('2026-11-01');
  });

  it('fixa sem diaDoMes: 422 em campos.diaDoMes e nada gravado', async () => {
    const resposta = await lancar(fixa({ diaDoMes: undefined }));
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.campos.diaDoMes).toBeTruthy();
    expect(await prisma.despesa.count()).toBe(0);
    expect(await prisma.recorrenciaDespesa.count()).toBe(0);
  });

  it('valor inválido: 422 em campos.valor', async () => {
    for (const valor of ['abc', '0.00', '-1.00', '10.123']) {
      const resposta = await lancar(variavel({ valor }));
      expect(resposta.status).toBe(422);
      expect(resposta.body.erro.campos.valor).toBeTruthy();
    }
  });

  it('Proprietário e Auxiliar podem lançar; sem login: 401', async () => {
    expect((await lancar(variavel(), dono)).status).toBe(201);
    expect((await lancar(variavel(), auxiliar)).status).toBe(201);
    const anonima = await request(app).post('/api/despesas').set(CABECALHO).send(variavel());
    expect(anonima.status).toBe(401);
  });
});

describe('GET /despesas', () => {
  beforeEach(async () => {
    await lancar(variavel({ data: '2026-10-28', descricao: 'Troca de lâmpadas', valor: '30.00' }));
    await lancar(variavel({ data: '2026-11-03' }));
    await lancar(fixa());
  });

  it('lista do mais recente para o mais antigo, com quem lançou e o total', async () => {
    const resposta = await listar();
    expect(resposta.status).toBe(200);
    expect(resposta.body.itens.map((i: { data: string }) => i.data)).toEqual([
      '2026-11-05',
      '2026-11-03',
      '2026-10-28',
    ]);
    expect(resposta.body.itens[0]).toMatchObject({
      descricao: 'Aluguel',
      valor: '2500.00',
      tipo: 'fixa',
      registradoPor: 'auxiliar',
      recorrenciaId: expect.any(Number),
    });
    expect(resposta.body.total).toBe('2575.90');
  });

  it('filtra por período e por tipo', async () => {
    const mes = await listar('?de=2026-11-01&ate=2026-11-30');
    expect(mes.body.itens).toHaveLength(2);
    const fixas = await listar('?tipo=fixa');
    expect(fixas.body.itens).toHaveLength(1);
    expect(fixas.body.total).toBe('2500.00');
  });

  it('filtros inválidos: 422', async () => {
    expect((await listar('?tipo=mensal')).status).toBe(422);
    expect((await listar('?de=05/11/2026')).status).toBe(422);
  });
});

describe('PATCH /recorrencias/:id', () => {
  const alterar = (id: number, corpo: Record<string, unknown>, cookie = dono) =>
    request(app).patch(`/api/recorrencias/${id}`).set(CABECALHO).set('Cookie', cookie).send(corpo);

  it('Proprietário pausa e retoma; a resposta traz a recorrência', async () => {
    const { recorrenciaId } = (await lancar(fixa())).body;
    const pausada = await alterar(recorrenciaId, { ativa: false });
    expect(pausada.status).toBe(200);
    expect(pausada.body).toEqual({
      id: recorrenciaId,
      descricao: 'Aluguel',
      valor: '2500.00',
      diaDoMes: 5,
      ativa: false,
    });
    expect((await alterar(recorrenciaId, { ativa: true })).body.ativa).toBe(true);
  });

  it('Auxiliar: 403; inexistente: 404; corpo inválido: 422', async () => {
    const { recorrenciaId } = (await lancar(fixa())).body;
    expect((await alterar(recorrenciaId, { ativa: false }, auxiliar)).status).toBe(403);
    expect((await alterar(999, { ativa: false })).status).toBe(404);
    expect((await alterar(recorrenciaId, { ativa: 'não' })).status).toBe(422);
  });
});

describe('GET /recorrencias', () => {
  it('lista as despesas fixas, inclusive as pausadas', async () => {
    const a = (await lancar(fixa())).body.recorrenciaId;
    await lancar(fixa({ descricao: 'Internet', valor: '150.00', diaDoMes: 10 }));
    await request(app)
      .patch(`/api/recorrencias/${a}`)
      .set(CABECALHO)
      .set('Cookie', dono)
      .send({ ativa: false });

    const resposta = await request(app).get('/api/recorrencias').set('Cookie', auxiliar);
    expect(resposta.status).toBe(200);
    expect(resposta.body.itens.map((i: { descricao: string }) => i.descricao)).toEqual([
      'Aluguel',
      'Internet',
    ]);
    expect(resposta.body.itens[0].ativa).toBe(false);
  });
});
