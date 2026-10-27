import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import { CABECALHO, entrarComo, mensalistaValido, semearBasico } from './ajudantesRotas';

const { app, prisma, limparBanco, encerrar } = criarAppDeTeste({
  agora: () => new Date('2026-10-20T15:00:00Z'),
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
  await prisma.historicoContrato.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.mensalista.deleteMany();
});

const criar = (corpo: Record<string, unknown> = mensalistaValido()) =>
  request(app).post('/api/mensalistas').set(CABECALHO).set('Cookie', dono).send(corpo);
const renovar = (id: number, corpo: Record<string, unknown>, cookie = dono) =>
  request(app)
    .post(`/api/contratos/${id}/renovacao`)
    .set(CABECALHO)
    .set('Cookie', cookie)
    .send(corpo);
const encerrarContrato = (id: number, cookie = dono) =>
  request(app).post(`/api/contratos/${id}/encerramento`).set(CABECALHO).set('Cookie', cookie);

describe('POST /contratos/:id/renovacao', () => {
  it('1 mês a partir de 2026-10-05, dia 5, leva a 2026-11-05 e grava histórico com o motivo', async () => {
    const { contratoId } = (await criar(mensalistaValido({ inicio: '2026-09-05' }))).body; // vence 2026-10-05
    const resposta = await renovar(contratoId, { meses: 1, motivo: 'Cliente viajou' });
    expect(resposta.status).toBe(200);
    expect(resposta.body.contrato.vencimento).toBe('2026-11-05');

    const historico = await prisma.historicoContrato.findMany({
      where: { contratoId, evento: 'renovado' },
    });
    expect(historico).toHaveLength(1);
    expect(historico[0]?.detalhes).toBe('Cliente viajou');
  });

  it('vários meses somam mês a mês, respeitando mês curto', async () => {
    const { contratoId } = (
      await criar(mensalistaValido({ diaVencimento: 31, inicio: '2026-12-31' }))
    ).body; // vence 2027-01-31
    const dois = await renovar(contratoId, { meses: 2, motivo: 'Acordo' });
    expect(dois.body.contrato.vencimento).toBe('2027-03-31');
    const mais = await renovar(contratoId, { meses: 1, motivo: 'Mais um' });
    expect(mais.body.contrato.vencimento).toBe('2027-04-30');
  });

  it('sem motivo ou com meses fora do limite: 422', async () => {
    const { contratoId } = (await criar()).body;
    expect((await renovar(contratoId, { meses: 1 })).status).toBe(422);
    expect((await renovar(contratoId, { meses: 1, motivo: ' ' })).status).toBe(422);
    expect((await renovar(contratoId, { meses: 0, motivo: 'Teste' })).status).toBe(422);
  });

  it('contrato encerrado: 409 CONTRATO_ENCERRADO', async () => {
    const { contratoId } = (await criar()).body;
    await encerrarContrato(contratoId);
    const resposta = await renovar(contratoId, { meses: 1, motivo: 'Teste' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONTRATO_ENCERRADO');
  });

  it('contrato inexistente: 404; Auxiliar: 403', async () => {
    expect((await renovar(999, { meses: 1, motivo: 'Teste' })).status).toBe(404);
    const { contratoId } = (await criar()).body;
    expect((await renovar(contratoId, { meses: 1, motivo: 'Teste' }, auxiliar)).status).toBe(403);
  });
});

describe('POST /contratos/:id/encerramento', () => {
  it('libera a vaga e a placa: novo contrato com os mesmos dados dá 201', async () => {
    const { contratoId } = (await criar()).body;
    const resposta = await encerrarContrato(contratoId);
    expect(resposta.status).toBe(200);
    expect(resposta.body.contrato).toMatchObject({
      status: 'encerrado',
      encerradoEm: '2026-10-20',
    });

    const novo = await criar();
    expect(novo.status).toBe(201);
    expect(novo.body.contratoId).not.toBe(contratoId);
    expect(await prisma.veiculo.count()).toBe(1); // o mesmo veículo é reaproveitado
  });

  it('grava o histórico "encerrado"', async () => {
    const { contratoId } = (await criar()).body;
    await encerrarContrato(contratoId);
    const eventos = await prisma.historicoContrato.findMany({
      where: { contratoId },
      orderBy: { id: 'asc' },
    });
    expect(eventos.map((e) => e.evento)).toEqual(['criado', 'encerrado']);
  });

  it('encerrar de novo: 409 CONTRATO_ENCERRADO', async () => {
    const { contratoId } = (await criar()).body;
    await encerrarContrato(contratoId);
    const resposta = await encerrarContrato(contratoId);
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONTRATO_ENCERRADO');
  });

  it('contrato inexistente: 404; Auxiliar: 403', async () => {
    expect((await encerrarContrato(999)).status).toBe(404);
    const { contratoId } = (await criar()).body;
    expect((await encerrarContrato(contratoId, auxiliar)).status).toBe(403);
  });
});
