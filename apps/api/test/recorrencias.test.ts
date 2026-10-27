import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { gerarDespesasRecorrentes } from '../src/servicos/recorrencias';
import { criarAppDeTeste } from './ajudantes';
import { CABECALHO, entrarComo, semearBasico } from './ajudantesRotas';

const { app, prisma, limparBanco, encerrar } = criarAppDeTeste();

beforeAll(async () => {
  await limparBanco();
  await semearBasico(prisma);
});
afterAll(encerrar);

beforeEach(async () => {
  await prisma.despesa.deleteMany();
  await prisma.recorrenciaDespesa.deleteMany();
});

const criarRecorrencia = (diaDoMes: number, extra: { ativa?: boolean; descricao?: string } = {}) =>
  prisma.recorrenciaDespesa.create({
    data: {
      descricao: extra.descricao ?? 'Aluguel',
      valor: '2500.00',
      diaDoMes,
      ativa: extra.ativa ?? true,
    },
  });

const lancamentos = () =>
  prisma.despesa.findMany({ orderBy: { data: 'asc' }, include: { recorrencia: true } });
const dia = (d: Date | null) => d?.toISOString().slice(0, 10);

describe('gerarDespesasRecorrentes', () => {
  it('cria o lançamento do mês no dia da recorrência e devolve quantos criou', async () => {
    const r = await criarRecorrencia(5);
    expect(await gerarDespesasRecorrentes(prisma, '2026-11-05')).toBe(1);

    const [unico] = await lancamentos();
    expect(unico).toMatchObject({
      descricao: 'Aluguel',
      tipo: 'fixa',
      recorrenciaId: r.id,
      registradoPor: null,
    });
    expect(unico?.valor.toFixed(2)).toBe('2500.00');
    expect(dia(unico?.data ?? null)).toBe('2026-11-05');
    expect(dia(unico?.competencia ?? null)).toBe('2026-11-01');
  });

  it('rodar de novo no mesmo dia devolve 0 e não duplica', async () => {
    await criarRecorrencia(5);
    expect(await gerarDespesasRecorrentes(prisma, '2026-11-05')).toBe(1);
    expect(await gerarDespesasRecorrentes(prisma, '2026-11-05')).toBe(0);
    expect(await prisma.despesa.count()).toBe(1);
  });

  it('rodar em 2026-11-20 sem ter rodado antes ainda cria o de novembro (recuperação)', async () => {
    await criarRecorrencia(5);
    expect(await gerarDespesasRecorrentes(prisma, '2026-11-20')).toBe(1);
    const [unico] = await lancamentos();
    expect(dia(unico?.data ?? null)).toBe('2026-11-05');
  });

  it('antes do dia da recorrência ainda não gera', async () => {
    await criarRecorrencia(5);
    expect(await gerarDespesasRecorrentes(prisma, '2026-11-04')).toBe(0);
    expect(await prisma.despesa.count()).toBe(0);
  });

  it('recorrência pausada não gera', async () => {
    await criarRecorrencia(5, { ativa: false });
    expect(await gerarDespesasRecorrentes(prisma, '2026-11-20')).toBe(0);
  });

  it('dia 31: em fevereiro cai no último dia (2027-02-28) e em março volta ao 31', async () => {
    await criarRecorrencia(31);
    expect(await gerarDespesasRecorrentes(prisma, '2027-02-27')).toBe(0);
    expect(await gerarDespesasRecorrentes(prisma, '2027-02-28')).toBe(1);
    expect(await gerarDespesasRecorrentes(prisma, '2027-03-30')).toBe(0);
    expect(await gerarDespesasRecorrentes(prisma, '2027-03-31')).toBe(1);
    expect((await lancamentos()).map((l) => dia(l.data))).toEqual(['2027-02-28', '2027-03-31']);
  });

  it('dia 29 em fevereiro de ano bissexto cai no dia 29', async () => {
    await criarRecorrencia(29);
    expect(await gerarDespesasRecorrentes(prisma, '2028-02-29')).toBe(1);
    expect(dia((await lancamentos())[0]?.data ?? null)).toBe('2028-02-29');
  });

  it('gera uma por recorrência ativa e uma de cada mês', async () => {
    await criarRecorrencia(5);
    await criarRecorrencia(10, { descricao: 'Internet' });
    expect(await gerarDespesasRecorrentes(prisma, '2026-11-12')).toBe(2);
    expect(await gerarDespesasRecorrentes(prisma, '2026-12-12')).toBe(2);
    expect(await prisma.despesa.count()).toBe(4);
  });

  it('o lançamento criado no cadastro da fixa não é duplicado pela geração do mesmo mês', async () => {
    const dono = await entrarComo(app, 'proprietario');
    const resposta = await request(app)
      .post('/api/despesas')
      .set(CABECALHO)
      .set('Cookie', dono)
      .send({
        descricao: 'Aluguel',
        valor: '2500.00',
        tipo: 'fixa',
        data: '2026-11-05',
        diaDoMes: 5,
      });
    expect(resposta.status).toBe(201);

    expect(await gerarDespesasRecorrentes(prisma, '2026-11-05')).toBe(0);
    expect(await prisma.despesa.count()).toBe(1);
    expect(await gerarDespesasRecorrentes(prisma, '2026-12-05')).toBe(1);
    expect(await prisma.despesa.count()).toBe(2);
  });

  it('duas execuções simultâneas criam um único lançamento', async () => {
    await criarRecorrencia(5);
    const [a, b] = await Promise.all([
      gerarDespesasRecorrentes(prisma, '2026-11-05'),
      gerarDespesasRecorrentes(prisma, '2026-11-05'),
    ]);
    expect(a + b).toBe(1);
    expect(await prisma.despesa.count()).toBe(1);
  });
});
