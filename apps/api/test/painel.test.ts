import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import {
  criarContratoDireto,
  criarDespesaDireta,
  criarEventoCriado,
  criarPagamentoDireto,
  limparMovimento,
} from './ajudantesConsultas';
import { entrarComo, semearBasico } from './ajudantesRotas';

// Relógio fixo: 26/10/2026 (em São Paulo).
const { app, prisma, limparBanco, encerrar } = criarAppDeTeste({
  agora: () => new Date('2026-10-26T15:00:00Z'),
});

let dono = '';
let auxiliar = '';
let contratoDaAna = 0;

beforeAll(async () => {
  await limparBanco();
  await semearBasico(prisma);
  dono = await entrarComo(app, 'proprietario');
  auxiliar = await entrarComo(app, 'auxiliar');
});
afterAll(encerrar);

beforeEach(async () => {
  await limparMovimento(prisma);
  const ana = await criarContratoDireto(prisma, {
    nome: 'Ana',
    vencimento: '2026-10-10',
    valor: '255.00',
  }); // vencido
  contratoDaAna = ana.contratoId;
  await criarContratoDireto(prisma, { nome: 'Bruno', vencimento: '2026-09-01', valor: '100.50' }); // vencido
  await criarContratoDireto(prisma, { nome: 'Carla', vencimento: '2026-10-30', valor: '90.00' }); // a vencer
  const davi = await criarContratoDireto(prisma, {
    nome: 'Davi',
    vencimento: '2026-12-01',
    valor: '300.00',
  }); // em dia
  await criarContratoDireto(prisma, { nome: 'Eva', vencimento: '2026-10-01', status: 'encerrado' }); // fora
  await criarContratoDireto(prisma, { nome: 'Fábio', vencimento: '2026-10-01', arquivado: true }); // fora
  await criarEventoCriado(prisma, ana.contratoId, '2026-10-03'); // novo no mês
  await criarEventoCriado(prisma, davi.contratoId, '2026-09-20'); // do mês passado
});

const consultar = (cookie = dono) => request(app).get('/api/painel').set('Cookie', cookie);

describe('GET /painel', () => {
  it('mensalistasAtivos ignora encerrados e arquivados; novosNoMes conta só os do mês', async () => {
    const { body } = await consultar();
    expect(body.mensalistasAtivos).toBe(4);
    expect(body.novosNoMes).toBe(1);
  });

  it('vencidos.total soma os valores dos contratos vencidos; aVencer idem', async () => {
    const { body } = await consultar();
    expect(body.vencidos).toEqual({ quantidade: 2, total: '355.50' });
    expect(body.aVencer).toEqual({ quantidade: 1, total: '90.00' });
    expect(body.situacao).toEqual({ emDia: 1, aVencer: 1, vencido: 2 });
  });

  it('variacao do resultado é null quando o mês anterior é zero', async () => {
    await criarPagamentoDireto(prisma, contratoDaAna, { valor: '600.00', pagoEm: '2026-10-05' });
    await criarDespesaDireta(prisma, { valor: '200.00', data: '2026-10-10' });
    // Setembro: receita 400 e despesa 400, resultado zero.
    await criarPagamentoDireto(prisma, contratoDaAna, { valor: '400.00', pagoEm: '2026-09-05' });
    await criarDespesaDireta(prisma, { valor: '400.00', data: '2026-09-10' });

    const { body } = await consultar();
    expect(body.resultadoDoMes).toEqual({
      receitas: '600.00',
      despesas: '200.00',
      resultado: '400.00',
      variacao: null,
    });
  });

  it('variacao é a diferença percentual sobre o resultado do mês anterior', async () => {
    await criarPagamentoDireto(prisma, contratoDaAna, { valor: '600.00', pagoEm: '2026-10-05' });
    await criarDespesaDireta(prisma, { valor: '200.00', data: '2026-10-10' });
    // Setembro: resultado 300,00 -> outubro (400,00) subiu 33%.
    await criarPagamentoDireto(prisma, contratoDaAna, { valor: '400.00', pagoEm: '2026-09-05' });
    await criarDespesaDireta(prisma, { valor: '100.00', data: '2026-09-10' });

    expect((await consultar()).body.resultadoDoMes.variacao).toBe(33);
  });

  it('variacao com resultado anterior negativo usa o módulo', async () => {
    await criarPagamentoDireto(prisma, contratoDaAna, { valor: '100.00', pagoEm: '2026-10-05' });
    await criarDespesaDireta(prisma, { valor: '100.00', data: '2026-09-10' }); // setembro: -100
    // Outubro: +100 -> subiu 200% sobre |-100|.
    expect((await consultar()).body.resultadoDoMes.variacao).toBe(200);
  });

  it('serieMensal traz os 6 últimos meses, do mais antigo ao atual', async () => {
    await criarPagamentoDireto(prisma, contratoDaAna, { valor: '600.00', pagoEm: '2026-10-05' });
    await criarDespesaDireta(prisma, { valor: '50.00', data: '2026-06-10' });
    const { serieMensal } = (await consultar()).body;
    expect(serieMensal.map((m: { mes: string }) => m.mes)).toEqual([
      '2026-05-01',
      '2026-06-01',
      '2026-07-01',
      '2026-08-01',
      '2026-09-01',
      '2026-10-01',
    ]);
    expect(serieMensal[1]).toEqual({ mes: '2026-06-01', receitas: '0.00', despesas: '50.00' });
    expect(serieMensal[5]).toEqual({ mes: '2026-10-01', receitas: '600.00', despesas: '0.00' });
  });

  it('ultimosRecebimentos traz os 5 mais recentes no formato do comprovante', async () => {
    for (const dia of ['01', '02', '03', '04', '05', '06']) {
      await criarPagamentoDireto(prisma, contratoDaAna, {
        valor: '10.00',
        pagoEm: `2026-10-${dia}`,
      });
    }
    const { ultimosRecebimentos } = (await consultar()).body;
    expect(ultimosRecebimentos.map((p: { pagoEm: string }) => p.pagoEm)).toEqual([
      '2026-10-06',
      '2026-10-05',
      '2026-10-04',
      '2026-10-03',
      '2026-10-02',
    ]);
    expect(ultimosRecebimentos[0]).toMatchObject({
      mensalista: 'Ana',
      valor: '10.00',
      forma: 'pix',
    });
  });

  it('sem nenhum movimento: zeros, sem quebrar', async () => {
    const { body } = await consultar();
    expect(body.resultadoDoMes).toEqual({
      receitas: '0.00',
      despesas: '0.00',
      resultado: '0.00',
      variacao: null,
    });
    expect(body.ultimosRecebimentos).toEqual([]);
  });

  it('Auxiliar: 403; sem login: 401', async () => {
    expect((await consultar(auxiliar)).status).toBe(403);
    expect((await request(app).get('/api/painel')).status).toBe(401);
  });
});
