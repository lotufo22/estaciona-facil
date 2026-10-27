import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import { CABECALHO, entrarComo, mensalistaValido, semearBasico } from './ajudantesRotas';

// Relógio fixo: 20/10/2026 (em São Paulo).
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

const criar = (corpo: Record<string, unknown>, cookie = dono) =>
  request(app).post('/api/mensalistas').set(CABECALHO).set('Cookie', cookie).send(corpo);
const listar = (consulta = '') =>
  request(app).get(`/api/mensalistas${consulta}`).set('Cookie', auxiliar);

describe('POST /mensalistas', () => {
  it('cadastra cliente, veículo e contrato e grava o histórico "criado"', async () => {
    const resposta = await criar(mensalistaValido());
    expect(resposta.status).toBe(201);
    const { mensalistaId, contratoId } = resposta.body;

    const contrato = await prisma.contrato.findUniqueOrThrow({
      where: { id: contratoId },
      include: { veiculo: true, historico: true },
    });
    expect(contrato.mensalistaId).toBe(mensalistaId);
    expect(contrato.veiculo.placa).toBe('ABC1D23');
    expect(contrato.vencimento.toISOString().slice(0, 10)).toBe('2026-11-05');
    expect(contrato.historico.map((h) => h.evento)).toEqual(['criado']);
  });

  it('placa em outro formato é a mesma placa: 409 PLACA_JA_CADASTRADA', async () => {
    expect((await criar(mensalistaValido({ placa: 'qrs-7t81', vaga: 'C01' }))).status).toBe(201);
    const resposta = await criar(mensalistaValido({ placa: 'QRS7T81', vaga: 'C02' }));
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('PLACA_JA_CADASTRADA');
    expect(resposta.body.erro.campos.placa).toBeTruthy();
  });

  it('vaga com contrato ativo: 409 VAGA_OCUPADA com campos.vaga', async () => {
    await criar(mensalistaValido());
    const resposta = await criar(mensalistaValido({ placa: 'XYZ9K88' }));
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('VAGA_OCUPADA');
    expect(resposta.body.erro.campos.vaga).toBeTruthy();
  });

  it('moto em vaga de carro: 422 em campos.vaga', async () => {
    const resposta = await criar(mensalistaValido({ categoria: 'moto', vaga: 'C01' }));
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.campos.vaga).toBeTruthy();
  });

  it('vaga que não existe: 422 em campos.vaga', async () => {
    const resposta = await criar(mensalistaValido({ vaga: 'Z99' }));
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.campos.vaga).toBeTruthy();
  });

  it('valor inválido: 422 em campos.valor', async () => {
    for (const valor of ['255,00', '0.00', '-5.00', '10.123']) {
      const resposta = await criar(mensalistaValido({ valor }));
      expect(resposta.status).toBe(422);
      expect(resposta.body.erro.campos.valor).toBeTruthy();
    }
  });

  it('Auxiliar: 403', async () => {
    const resposta = await criar(mensalistaValido(), auxiliar);
    expect(resposta.status).toBe(403);
  });

  it('não grava nada quando o contrato falha (transação)', async () => {
    await criar(mensalistaValido());
    await criar(mensalistaValido({ placa: 'XYZ9K88' })); // vaga ocupada
    expect(await prisma.mensalista.count()).toBe(1);
    expect(await prisma.veiculo.count()).toBe(1);
  });
});

describe('GET /mensalistas', () => {
  beforeEach(async () => {
    await criar(
      mensalistaValido({ nome: 'Ana Souza', placa: 'AAA1A11', vaga: 'C01', inicio: '2026-09-05' }),
    ); // vence 2026-10-05: vencido
    await criar(
      mensalistaValido({
        nome: 'Bruno Lima',
        placa: 'BBB2B22',
        vaga: 'C02',
        diaVencimento: 25,
        inicio: '2026-09-25',
      }),
    ); // vence 2026-10-25: a vencer
    await criar(
      mensalistaValido({
        nome: 'Carla Dias',
        placa: 'CCC3C33',
        categoria: 'moto',
        vaga: 'M01',
        tipo: 'semanal',
        valor: '90.00',
        inicio: '2026-10-19',
      }),
    ); // vence 2026-10-26: a vencer
  });

  it('Auxiliar também lista; itens ordenados por nome e com a situação calculada', async () => {
    const resposta = await listar();
    expect(resposta.status).toBe(200);
    expect(resposta.body.total).toBe(3);
    expect(resposta.body.pagina).toBe(1);
    expect(resposta.body.itens.map((i: { nome: string }) => i.nome)).toEqual([
      'Ana Souza',
      'Bruno Lima',
      'Carla Dias',
    ]);
    expect(resposta.body.itens[0]).toMatchObject({
      placa: 'AAA1A11',
      categoria: 'carro',
      vaga: 'C01',
      vencimento: '2026-10-05',
      valor: '255.00',
      situacao: 'vencido',
    });
  });

  it('busca por nome parcial e por placa em qualquer formato', async () => {
    expect((await listar('?busca=bru')).body.itens).toHaveLength(1);
    const porPlaca = await listar('?busca=ccc-3c33');
    expect(porPlaca.body.itens.map((i: { nome: string }) => i.nome)).toEqual(['Carla Dias']);
  });

  it('filtra por situação (com a data injetada), categoria e tipo', async () => {
    expect((await listar('?situacao=vencido')).body.total).toBe(1);
    expect((await listar('?situacao=a_vencer')).body.total).toBe(2);
    expect((await listar('?situacao=em_dia')).body.total).toBe(0);
    expect((await listar('?categoria=moto')).body.total).toBe(1);
    expect((await listar('?tipo=semanal')).body.total).toBe(1);
  });

  it('filtra por contrato', async () => {
    const todos = await listar();
    const id = todos.body.itens[1].contratoId;
    const um = await listar(`?contrato=${id}`);
    expect(um.body.itens.map((i: { nome: string }) => i.nome)).toEqual(['Bruno Lima']);
  });

  it('pagina de 10 em 10 e informa o total', async () => {
    const resposta = await listar('?pagina=2');
    expect(resposta.body).toMatchObject({ itens: [], total: 3, pagina: 2, porPagina: 10 });
  });

  it('não lista contratos encerrados', async () => {
    const id = (await listar()).body.itens[0].contratoId;
    await request(app).post(`/api/contratos/${id}/encerramento`).set(CABECALHO).set('Cookie', dono);
    expect((await listar()).body.total).toBe(2);
  });

  it('filtro com valor inválido: 422', async () => {
    expect((await listar('?situacao=atrasado')).status).toBe(422);
  });
});

describe('GET /mensalistas/:id', () => {
  it('devolve contrato atual e histórico do mais recente para o mais antigo', async () => {
    const { mensalistaId, contratoId } = (await criar(mensalistaValido())).body;
    await request(app)
      .post(`/api/contratos/${contratoId}/renovacao`)
      .set(CABECALHO)
      .set('Cookie', dono)
      .send({ meses: 1, motivo: 'Cortesia da casa' });

    const resposta = await request(app)
      .get(`/api/mensalistas/${mensalistaId}`)
      .set('Cookie', auxiliar);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      id: mensalistaId,
      nome: 'Joana Prado',
      telefone: '12999990000',
      placa: 'ABC1D23',
      categoria: 'carro',
      contrato: { id: contratoId, vaga: 'C01', status: 'ativo', vencimento: '2026-12-05' },
    });
    expect(resposta.body.historico.map((h: { evento: string }) => h.evento)).toEqual([
      'renovado',
      'criado',
    ]);
    expect(resposta.body.historico[0]).toMatchObject({
      detalhes: 'Cortesia da casa',
      usuario: 'proprietario',
      em: '2026-10-20',
    });
  });

  it('id inexistente: 404', async () => {
    const resposta = await request(app).get('/api/mensalistas/999').set('Cookie', auxiliar);
    expect(resposta.status).toBe(404);
    expect(resposta.body.erro.codigo).toBe('NAO_ENCONTRADO');
  });
});

describe('PATCH /mensalistas/:id', () => {
  const alterar = (id: number, corpo: Record<string, unknown>, cookie = dono) =>
    request(app).patch(`/api/mensalistas/${id}`).set(CABECALHO).set('Cookie', cookie).send(corpo);

  it('atualiza telefone, placa, vaga e valor e devolve o detalhe', async () => {
    const { mensalistaId } = (await criar(mensalistaValido())).body;
    const resposta = await alterar(mensalistaId, {
      telefone: '(12) 3333-4444',
      placa: 'xyz-9k88',
      vaga: 'C02',
      valor: '300.00',
    });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      telefone: '1233334444',
      placa: 'XYZ9K88',
      contrato: { vaga: 'C02', valor: '300.00' },
    });
  });

  it('vaga null tira o mensalista da vaga', async () => {
    const { mensalistaId } = (await criar(mensalistaValido())).body;
    const resposta = await alterar(mensalistaId, { vaga: null });
    expect(resposta.status).toBe(200);
    expect(resposta.body.contrato.vaga).toBeNull();
  });

  it('placa de outro contrato ativo: 409', async () => {
    await criar(mensalistaValido({ placa: 'AAA1A11', vaga: 'C01' }));
    const { mensalistaId } = (await criar(mensalistaValido({ placa: 'BBB2B22', vaga: 'C02' })))
      .body;
    const resposta = await alterar(mensalistaId, { placa: 'aaa-1a11' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('PLACA_JA_CADASTRADA');
  });

  it('vaga de outro contrato ativo: 409; vaga de categoria errada: 422', async () => {
    await criar(mensalistaValido({ placa: 'AAA1A11', vaga: 'C01' }));
    const { mensalistaId } = (await criar(mensalistaValido({ placa: 'BBB2B22', vaga: 'C02' })))
      .body;
    expect((await alterar(mensalistaId, { vaga: 'C01' })).body.erro.codigo).toBe('VAGA_OCUPADA');
    expect((await alterar(mensalistaId, { vaga: 'M01' })).status).toBe(422);
  });

  it('corpo vazio: 422; id inexistente: 404; Auxiliar: 403', async () => {
    const { mensalistaId } = (await criar(mensalistaValido())).body;
    expect((await alterar(mensalistaId, {})).status).toBe(422);
    expect((await alterar(999, { valor: '1.00' })).status).toBe(404);
    expect((await alterar(mensalistaId, { valor: '1.00' }, auxiliar)).status).toBe(403);
  });

  it('contrato encerrado: 409 CONTRATO_ENCERRADO', async () => {
    const { mensalistaId, contratoId } = (await criar(mensalistaValido())).body;
    await request(app)
      .post(`/api/contratos/${contratoId}/encerramento`)
      .set(CABECALHO)
      .set('Cookie', dono);
    const resposta = await alterar(mensalistaId, { valor: '1.00' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('CONTRATO_ENCERRADO');
  });
});
