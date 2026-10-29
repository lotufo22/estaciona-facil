import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { criarAppDeTeste } from './ajudantes';
import { CABECALHO, SENHA, entrarComo, semearBasico } from './ajudantesRotas';

const { app, prisma, limparBanco, encerrar } = criarAppDeTeste();

let dono = '';
let auxiliar = '';

beforeAll(async () => {
  await limparBanco();
  await semearBasico(prisma);
});
afterAll(encerrar);

// Cada teste começa com o proprietário e o auxiliar de sempre, cada um com uma sessão nova.
beforeEach(async () => {
  await prisma.usuario.deleteMany({ where: { login: { notIn: ['proprietario', 'auxiliar'] } } });
  await prisma.usuario.updateMany({ data: { ativo: true, nome: 'x' } });
  await prisma.usuario.update({
    where: { login: 'proprietario' },
    data: { nome: 'proprietario' },
  });
  await prisma.usuario.update({ where: { login: 'auxiliar' }, data: { nome: 'auxiliar' } });
  // Os testes de senha trocam a senha: volta para a de sempre.
  const { hashSenha } = await import('../src/autenticacao/senhas');
  await prisma.usuario.updateMany({ data: { senhaHash: await hashSenha(SENHA) } });
  await prisma.sessao.deleteMany();
  dono = await entrarComo(app, 'proprietario');
  auxiliar = await entrarComo(app, 'auxiliar');
});

const como = (cookie: string) => ({
  listar: () => request(app).get('/api/usuarios').set('Cookie', cookie),
  criar: (corpo: Record<string, unknown>) =>
    request(app).post('/api/usuarios').set(CABECALHO).set('Cookie', cookie).send(corpo),
  atualizar: (id: number | string, corpo: Record<string, unknown>) =>
    request(app).patch(`/api/usuarios/${id}`).set(CABECALHO).set('Cookie', cookie).send(corpo),
  nome: (corpo: Record<string, unknown>) =>
    request(app).patch('/api/conta').set(CABECALHO).set('Cookie', cookie).send(corpo),
  senha: (corpo: Record<string, unknown>) =>
    request(app).post('/api/conta/senha').set(CABECALHO).set('Cookie', cookie).send(corpo),
  eu: () => request(app).get('/api/auth/me').set('Cookie', cookie),
});

const entrar = (login: string, senha: string) =>
  request(app).post('/api/auth/login').set(CABECALHO).send({ login, senha });

const novo = { nome: 'Carlos Souza', login: 'Carlos', senha: 'senha-do-carlos-1' };

describe('quem pode gerenciar usuários', () => {
  it('o auxiliar não lista, não cadastra e não altera usuários (403)', async () => {
    const dele = como(auxiliar);
    expect((await dele.listar()).status).toBe(403);
    expect((await dele.criar(novo)).status).toBe(403);
    expect((await dele.atualizar(1, { nome: 'Outro nome' })).status).toBe(403);
  });

  it('sem login dá 401', async () => {
    expect((await request(app).get('/api/usuarios')).status).toBe(401);
  });
});

describe('GET /api/usuarios', () => {
  it('lista todos, sem nunca devolver a senha', async () => {
    const resposta = await como(dono).listar();
    expect(resposta.status).toBe(200);
    expect(resposta.body.itens).toEqual([
      {
        id: expect.any(Number),
        nome: 'auxiliar',
        login: 'auxiliar',
        perfil: 'auxiliar',
        ativo: true,
      },
      {
        id: expect.any(Number),
        nome: 'proprietario',
        login: 'proprietario',
        perfil: 'proprietario',
        ativo: true,
      },
    ]);
    expect(JSON.stringify(resposta.body)).not.toMatch(/senha|hash|argon/i);
  });
});

describe('POST /api/usuarios', () => {
  it('cadastra um auxiliar, com login normalizado, e ele já consegue entrar', async () => {
    const resposta = await como(dono).criar(novo);
    expect(resposta.status).toBe(201);
    expect(resposta.body).toEqual({
      id: expect.any(Number),
      nome: 'Carlos Souza',
      login: 'carlos',
      perfil: 'auxiliar',
      ativo: true,
    });
    const entrada = await entrar('CARLOS', novo.senha);
    expect(entrada.status).toBe(200);
    expect(entrada.body.perfil).toBe('auxiliar');
  });

  it('guarda a senha só como hash', async () => {
    await como(dono).criar(novo);
    const u = await prisma.usuario.findUniqueOrThrow({ where: { login: 'carlos' } });
    expect(u.senhaHash).toMatch(/^\$argon2id\$/);
    expect(u.senhaHash).not.toContain(novo.senha);
  });

  it('o perfil enviado no corpo é ignorado: nunca nasce um segundo proprietário', async () => {
    const resposta = await como(dono).criar({ ...novo, perfil: 'proprietario' });
    expect(resposta.status).toBe(201);
    expect(resposta.body.perfil).toBe('auxiliar');
  });

  it('login já usado dá 409 LOGIN_EM_USO no campo login', async () => {
    const resposta = await como(dono).criar({ ...novo, login: 'Auxiliar' });
    expect(resposta.status).toBe(409);
    expect(resposta.body.erro.codigo).toBe('LOGIN_EM_USO');
    expect(resposta.body.erro.campos).toHaveProperty('login');
  });

  it.each([
    [{ senha: 'curta' }, 'senha'],
    [{ login: 'a b' }, 'login'],
    [{ login: 'ab' }, 'login'],
    [{ nome: 'Jo' }, 'nome'],
  ])('dados inválidos %j dão 422 no campo %s', async (troca, campo) => {
    const resposta = await como(dono).criar({ ...novo, ...troca });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.campos).toHaveProperty(campo);
  });
});

describe('PATCH /api/usuarios/:id', () => {
  async function criarCarlos() {
    const criado = await como(dono).criar(novo);
    return criado.body.id as number;
  }

  it('muda o nome', async () => {
    const id = await criarCarlos();
    const resposta = await como(dono).atualizar(id, { nome: 'Carlos de Souza' });
    expect(resposta.status).toBe(200);
    expect(resposta.body.nome).toBe('Carlos de Souza');
  });

  it('redefinir a senha vale na hora e derruba as sessões dele', async () => {
    const id = await criarCarlos();
    const sessaoAntiga = (await entrar('carlos', novo.senha)).headers[
      'set-cookie'
    ] as unknown as string[];
    const cookieAntigo = (sessaoAntiga[0] ?? '').split(';')[0] ?? '';
    expect((await como(cookieAntigo).eu()).status).toBe(200);

    const resposta = await como(dono).atualizar(id, { senha: 'outra-senha-nova-9' });
    expect(resposta.status).toBe(200);

    expect((await como(cookieAntigo).eu()).status).toBe(401);
    expect((await entrar('carlos', novo.senha)).status).toBe(401);
    expect((await entrar('carlos', 'outra-senha-nova-9')).status).toBe(200);
  });

  it('desativar impede entrar e derruba a sessão; reativar devolve o acesso', async () => {
    const id = await criarCarlos();
    const cookie =
      ((await entrar('carlos', novo.senha)).headers['set-cookie'] as unknown as string[])[0]?.split(
        ';',
      )[0] ?? '';

    expect((await como(dono).atualizar(id, { ativo: false })).body.ativo).toBe(false);
    expect((await como(cookie).eu()).status).toBe(401);
    expect((await entrar('carlos', novo.senha)).status).toBe(401);

    expect((await como(dono).atualizar(id, { ativo: true })).body.ativo).toBe(true);
    expect((await entrar('carlos', novo.senha)).status).toBe(200);
  });

  it('o proprietário não é alterado por aqui (403): ele usa "Minha conta"', async () => {
    const eu = await prisma.usuario.findUniqueOrThrow({ where: { login: 'proprietario' } });
    const resposta = await como(dono).atualizar(eu.id, { ativo: false });
    expect(resposta.status).toBe(403);
    expect(resposta.body.erro.codigo).toBe('SEM_PERMISSAO');
    const depois = await prisma.usuario.findUniqueOrThrow({ where: { id: eu.id } });
    expect(depois.ativo).toBe(true);
  });

  it('usuário inexistente dá 404 e corpo vazio dá 422', async () => {
    expect((await como(dono).atualizar(99999, { nome: 'Fulano de Tal' })).status).toBe(404);
    expect((await como(dono).atualizar('abc', { nome: 'Fulano de Tal' })).status).toBe(404);
    const id = await criarCarlos();
    expect((await como(dono).atualizar(id, {})).status).toBe(422);
  });
});

describe('PATCH /api/conta', () => {
  it('qualquer usuário muda o próprio nome, e o /auth/me já mostra', async () => {
    const resposta = await como(auxiliar).nome({ nome: 'Maria Auxiliar' });
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({
      id: expect.any(Number),
      nome: 'Maria Auxiliar',
      perfil: 'auxiliar',
    });
    expect((await como(auxiliar).eu()).body.nome).toBe('Maria Auxiliar');
  });

  it('nome curto dá 422', async () => {
    expect((await como(auxiliar).nome({ nome: 'Ma' })).status).toBe(422);
  });
});

describe('POST /api/conta/senha', () => {
  it('troca a senha: mantém esta sessão, derruba as outras e vale no próximo login', async () => {
    const outra = await entrarComo(app, 'auxiliar');

    const resposta = await como(auxiliar).senha({
      senhaAtual: SENHA,
      novaSenha: 'minha-senha-nova-7',
    });
    expect(resposta.status).toBe(204);

    expect((await como(auxiliar).eu()).status).toBe(200);
    expect((await como(outra).eu()).status).toBe(401);
    expect((await entrar('auxiliar', SENHA)).status).toBe(401);
    expect((await entrar('auxiliar', 'minha-senha-nova-7')).status).toBe(200);
  });

  it('senha atual errada dá 422 no campo senhaAtual e nada muda', async () => {
    const resposta = await como(auxiliar).senha({
      senhaAtual: 'errada-errada-1',
      novaSenha: 'minha-senha-nova-7',
    });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.campos).toHaveProperty('senhaAtual');
    expect((await entrar('auxiliar', SENHA)).status).toBe(200);
  });

  it('senha nova curta dá 422 no campo novaSenha', async () => {
    const resposta = await como(auxiliar).senha({ senhaAtual: SENHA, novaSenha: 'curta' });
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.campos).toHaveProperty('novaSenha');
  });

  it('sem login dá 401', async () => {
    const resposta = await request(app).post('/api/conta/senha').set(CABECALHO).send({});
    expect(resposta.status).toBe(401);
  });
});
