import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { criarApp } from '../src/app';
import type { PrismaClient } from '../src/prisma';
import { criarAppDeTeste } from './ajudantes';

const { app, encerrar } = criarAppDeTeste();

afterAll(encerrar);
afterEach(() => vi.restoreAllMocks());

describe('GET /api/saude', () => {
  it('responde 200 { status: "ok" } quando o banco responde', async () => {
    const resposta = await request(app).get('/api/saude');
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ status: 'ok' });
  });

  it('usa os cabeçalhos de segurança do helmet e não anuncia o Express', async () => {
    const resposta = await request(app).get('/api/saude');
    expect(resposta.headers['x-content-type-options']).toBe('nosniff');
    expect(resposta.headers['x-powered-by']).toBeUndefined();
  });
});

describe('erros no formato da spec', () => {
  it('rota inexistente dá 404 NAO_ENCONTRADO', async () => {
    const resposta = await request(app).get('/api/nao-existe');
    expect(resposta.status).toBe(404);
    expect(resposta.body).toEqual({
      erro: { codigo: 'NAO_ENCONTRADO', mensagem: 'Rota não encontrada.' },
    });
  });

  it('fora do prefixo /api também dá 404 no mesmo formato', async () => {
    const resposta = await request(app).get('/qualquer-coisa');
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it('JSON malformado dá 400 DADOS_INVALIDOS', async () => {
    const resposta = await request(app)
      .post('/api/qualquer')
      .set('Content-Type', 'application/json')
      .send('{ isto não é json');
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro).toEqual({
      codigo: 'DADOS_INVALIDOS',
      mensagem: 'O corpo da requisição não é um JSON válido.',
    });
  });

  it('corpo grande demais dá 413', async () => {
    const resposta = await request(app)
      .post('/api/qualquer')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ texto: 'x'.repeat(200_000) }));
    expect(resposta.status).toBe(413);
    expect(resposta.body.erro.codigo).toBe('DADOS_INVALIDOS');
  });

  it('erro inesperado dá 500 sem expor detalhes internos, e vai para o log', async () => {
    const registro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const prismaQuebrado = {
      $queryRaw: () =>
        Promise.reject(new Error('falha em postgresql://admin:segredo123@interno:5432/x')),
    } as unknown as PrismaClient;

    const resposta = await request(criarApp({ prisma: prismaQuebrado })).get('/api/saude');

    expect(resposta.status).toBe(500);
    expect(resposta.body.erro.codigo).toBe('ERRO_INTERNO');
    const texto = JSON.stringify(resposta.body);
    expect(texto).not.toContain('segredo123');
    expect(texto).not.toContain('postgresql');
    expect(registro).toHaveBeenCalledTimes(1);
  });
});
