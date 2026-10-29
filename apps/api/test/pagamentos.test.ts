import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import { CABECALHO, entrarComo, mensalistaValido, semearBasico } from './ajudantesRotas';

// Relógio fixo: 26/10/2026 (em São Paulo).
const { app, prisma, limparBanco, encerrar } = criarAppDeTeste({
  agora: () => new Date('2026-10-26T15:00:00Z'),
});

let dono = '';
let auxiliar = '';
let chaveSeq = 0;

beforeAll(async () => {
  await limparBanco();
  await semearBasico(prisma);
  dono = await entrarComo(app, 'proprietario');
  auxiliar = await entrarComo(app, 'auxiliar');
});
afterAll(encerrar);

beforeEach(async () => {
  await prisma.pagamento.deleteMany();
  await prisma.historicoContrato.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.mensalista.deleteMany();
});

const criarContrato = async (corpo: Record<string, unknown> = {}) => {
  const resposta = await request(app)
    .post('/api/mensalistas')
    .set(CABECALHO)
    .set('Cookie', dono)
    .send(mensalistaValido(corpo));
  expect(resposta.status).toBe(201);
  return resposta.body as { mensalistaId: number; contratoId: number };
};

const pagar = (
  corpo: Record<string, unknown>,
  { chave = `chave-${(chaveSeq += 1)}`, cookie = auxiliar } = {},
) => {
  let req = request(app).post('/api/pagamentos').set(CABECALHO).set('Cookie', cookie);
  if (chave) req = req.set('Idempotency-Key', chave);
  return req.send(corpo);
};

const dadosDePagamento = (contratoId: number, sobrescritas: Record<string, unknown> = {}) => ({
  contratoId,
  valor: '255.00',
  forma: 'pix',
  pagoEm: '2026-10-04',
  ...sobrescritas,
});

describe('POST /pagamentos', () => {
  it('registra o pagamento, avança o vencimento e grava o histórico', async () => {
    const { contratoId, mensalistaId } = await criarContrato({ inicio: '2026-09-05' }); // vence 2026-10-05
    const resposta = await pagar(dadosDePagamento(contratoId));
    expect(resposta.status).toBe(201);
    expect(resposta.body.novoVencimento).toBe('2026-11-05');
    expect(resposta.body.pagamento).toMatchObject({
      mensalista: 'Joana Prado',
      placa: 'ABC1D23',
      valor: '255.00',
      forma: 'pix',
      pagoEm: '2026-10-04',
    });
    expect(resposta.body.pagamento.numero).toBe(resposta.body.pagamento.id);

    const gravado = await prisma.pagamento.findUniqueOrThrow({
      where: { id: resposta.body.pagamento.id },
    });
    expect(gravado.mesReferencia.toISOString().slice(0, 10)).toBe('2026-10-01');

    const detalhe = await request(app).get(`/api/mensalistas/${mensalistaId}`).set('Cookie', dono);
    expect(detalhe.body.contrato.vencimento).toBe('2026-11-05');
    expect(detalhe.body.historico[0]).toMatchObject({
      evento: 'pagamento',
      usuario: 'auxiliar',
    });
  });

  it('Proprietário também registra', async () => {
    const { contratoId } = await criarContrato();
    expect((await pagar(dadosDePagamento(contratoId), { cookie: dono })).status).toBe(201);
  });

  it('sem Idempotency-Key: 400 CHAVE_IDEMPOTENCIA_AUSENTE e nada gravado', async () => {
    const { contratoId } = await criarContrato();
    const resposta = await pagar(dadosDePagamento(contratoId), { chave: '' });
    expect(resposta.status).toBe(400);
    expect(resposta.body.erro.codigo).toBe('CHAVE_IDEMPOTENCIA_AUSENTE');
    expect(await prisma.pagamento.count()).toBe(0);
  });

  it('repetir a chave devolve o mesmo corpo e 201, sem nova linha nem novo avanço', async () => {
    const { contratoId } = await criarContrato({ inicio: '2026-09-05' });
    const primeira = await pagar(dadosDePagamento(contratoId), { chave: 'repetida' });
    const segunda = await pagar(dadosDePagamento(contratoId), { chave: 'repetida' });
    expect(segunda.status).toBe(201);
    expect(segunda.body).toEqual(primeira.body);
    expect(await prisma.pagamento.count()).toBe(1);
  });

  it('duas chamadas simultâneas com a mesma chave criam uma linha e o vencimento avança uma vez', async () => {
    const { contratoId } = await criarContrato({ inicio: '2026-09-05' });
    const [a, b] = await Promise.all([
      pagar(dadosDePagamento(contratoId), { chave: 'simultanea' }),
      pagar(dadosDePagamento(contratoId), { chave: 'simultanea' }),
    ]);
    expect([a.status, b.status]).toEqual([201, 201]);
    expect(a.body).toEqual(b.body);
    expect(await prisma.pagamento.count()).toBe(1);
    const contrato = await prisma.contrato.findUniqueOrThrow({ where: { id: contratoId } });
    expect(contrato.vencimento.toISOString().slice(0, 10)).toBe('2026-11-05');
  });

  it('dois pagamentos simultâneos com chaves diferentes avançam dois meses (sem perder um)', async () => {
    const { contratoId } = await criarContrato({ inicio: '2026-09-05' });
    const resultados = await Promise.all([
      pagar(dadosDePagamento(contratoId)),
      pagar(dadosDePagamento(contratoId)),
    ]);
    expect(resultados.map((r) => r.status)).toEqual([201, 201]);
    const contrato = await prisma.contrato.findUniqueOrThrow({ where: { id: contratoId } });
    expect(contrato.vencimento.toISOString().slice(0, 10)).toBe('2026-12-05');
  });

  it('contrato vencido há 3 meses: um pagamento cobre um mês e continua vencido', async () => {
    const { contratoId, mensalistaId } = await criarContrato({ inicio: '2026-06-05' }); // vence 2026-07-05
    const resposta = await pagar(dadosDePagamento(contratoId, { pagoEm: '2026-10-26' }));
    expect(resposta.status).toBe(201);
    expect(resposta.body.novoVencimento).toBe('2026-08-05');
    const detalhe = await request(app).get(`/api/mensalistas/${mensalistaId}`).set('Cookie', dono);
    expect(detalhe.body.contrato.situacao).toBe('vencido');
    const gravado = await prisma.pagamento.findFirstOrThrow();
    expect(gravado.mesReferencia.toISOString().slice(0, 10)).toBe('2026-07-01');
  });

  it('contrato semanal avança 7 dias', async () => {
    const { contratoId } = await criarContrato({ tipo: 'semanal', inicio: '2026-10-19' }); // vence 2026-10-26
    const resposta = await pagar(dadosDePagamento(contratoId, { pagoEm: '2026-10-26' }));
    expect(resposta.body.novoVencimento).toBe('2026-11-02');
  });

  it('contrato encerrado: 409 CONTRATO_ENCERRADO e nada gravado', async () => {
    const { contratoId } = await criarContrato();
    await request(app)
      .post(`/api/contratos/${contratoId}/encerramento`)
      .set(CABECALHO)
      .set('Cookie', dono);
    const resposta = await pagar(dadosDePagamento(contratoId));
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONTRATO_ENCERRADO');
    expect(await prisma.pagamento.count()).toBe(0);
  });

  it('contrato inexistente: 404', async () => {
    const resposta = await pagar(dadosDePagamento(999));
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it('valor inválido: 422 em campos.valor', async () => {
    const { contratoId } = await criarContrato();
    for (const valor of ['abc', '0.00', '255.001', '-1.00']) {
      const resposta = await pagar(dadosDePagamento(contratoId, { valor }));
      expect(resposta.status).toBe(422);
      expect(resposta.body.erro.campos.valor).toBeTruthy();
    }
    expect(await prisma.pagamento.count()).toBe(0);
  });

  it('sem login: 401', async () => {
    const resposta = await request(app)
      .post('/api/pagamentos')
      .set(CABECALHO)
      .set('Idempotency-Key', 'x')
      .send({});
    expect(resposta.status).toBe(401);
  });
});

describe('GET /pagamentos e /pagamentos/:id', () => {
  const listar = (consulta = '') =>
    request(app).get(`/api/pagamentos${consulta}`).set('Cookie', auxiliar);

  beforeEach(async () => {
    const a = await criarContrato({ placa: 'AAA1A11', vaga: 'C01', inicio: '2026-09-05' });
    const b = await criarContrato({ nome: 'Bruno Lima', placa: 'BBB2B22', vaga: 'C02' });
    await pagar(dadosDePagamento(a.contratoId, { pagoEm: '2026-10-25', forma: 'dinheiro' }));
    await pagar(dadosDePagamento(b.contratoId, { pagoEm: '2026-10-26', valor: '100.50' }));
    await pagar(dadosDePagamento(a.contratoId, { pagoEm: '2026-10-26', valor: '49.50' }));
  });

  it('filtra por dia e soma o total', async () => {
    const resposta = await listar('?de=2026-10-26&ate=2026-10-26');
    expect(resposta.status).toBe(200);
    expect(resposta.body.itens).toHaveLength(2);
    expect(resposta.body.itens.every((i: { pagoEm: string }) => i.pagoEm === '2026-10-26')).toBe(
      true,
    );
    expect(resposta.body.total).toBe('150.00');
  });

  it('sem filtro lista tudo, mais recente primeiro', async () => {
    const resposta = await listar();
    expect(resposta.body.itens).toHaveLength(3);
    expect(resposta.body.itens[0].pagoEm).toBe('2026-10-26');
    expect(resposta.body.itens[2].pagoEm).toBe('2026-10-25');
    expect(resposta.body.total).toBe('405.00');
  });

  it('filtra por forma', async () => {
    const resposta = await listar('?forma=dinheiro');
    expect(resposta.body.itens).toHaveLength(1);
    expect(resposta.body.total).toBe('255.00');
  });

  it('filtros inválidos: 422', async () => {
    expect((await listar('?forma=cheque')).status).toBe(422);
    expect((await listar('?de=26/10/2026')).status).toBe(422);
  });

  it('GET /pagamentos/:id devolve o comprovante; id inexistente: 404', async () => {
    const lista = await listar();
    const item = lista.body.itens[0];
    const um = await request(app).get(`/api/pagamentos/${item.id}`).set('Cookie', auxiliar);
    expect(um.status).toBe(200);
    expect(um.body).toEqual(item);
    const nenhum = await request(app).get('/api/pagamentos/9999').set('Cookie', auxiliar);
    expect(nenhum.status).toBe(404);
    expect(nenhum.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});
