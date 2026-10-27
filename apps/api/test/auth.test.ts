import { createHash } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { conferirSenha, hashSenha } from '../src/autenticacao/senhas';
import {
  JANELA_DO_LIMITE_MS,
  LIMITE_DE_FALHAS,
  limparFalhas,
  registrarFalha,
  verificarLimite,
} from '../src/autenticacao/limiteLogin';
import { DURACAO_DA_SESSAO_MS, NOME_DO_COOKIE, hashDoToken } from '../src/autenticacao/sessoes';
import { ErroDeCadastroDeUsuario, criarUsuario } from '../src/autenticacao/usuarios';
import { criarAppDeTeste } from './ajudantes';

const SENHA = 'senha-forte-123';
const CABECALHO = { 'X-Estaciona-App': '1' };
const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const INICIO = new Date('2026-10-26T12:00:00Z');

// O relógio do app é injetado: o teste decide a hora e a avança sem esperar.
const relogio = { agora: INICIO };
const avancar = (ms: number) => {
  relogio.agora = new Date(relogio.agora.getTime() + ms);
};

const { app, prisma, limparBanco, encerrar } = criarAppDeTeste({ agora: () => relogio.agora });

beforeEach(async () => {
  relogio.agora = INICIO;
  await limparBanco();
  await criarUsuario(prisma, { nome: 'Dono', login: 'dono', senha: SENHA, perfil: 'proprietario' });
  await criarUsuario(prisma, { nome: 'Auxiliar', login: 'aux', senha: SENHA, perfil: 'auxiliar' });
});
afterAll(encerrar);

function entrar(login: string, senha: string) {
  return request(app).post('/api/auth/login').set(CABECALHO).send({ login, senha });
}

/** Faz login e devolve só o par `nome=valor` do cookie, pronto para o cabeçalho Cookie. */
async function cookieDe(login = 'dono', senha = SENHA): Promise<string> {
  const resposta = await entrar(login, senha);
  expect(resposta.status).toBe(200);
  const cookies = resposta.headers['set-cookie'] as unknown as string[];
  return (cookies[0] ?? '').split(';')[0] ?? '';
}

const eu = (cookie: string) => request(app).get('/api/auth/me').set('Cookie', cookie);

describe('POST /api/auth/login', () => {
  it('login correto devolve a sessão e um cookie HttpOnly, Secure e SameSite=Lax', async () => {
    const resposta = await entrar('dono', SENHA);
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id: expect.any(Number), nome: 'Dono', perfil: 'proprietario' });

    const cookie = (resposta.headers['set-cookie'] as unknown as string[])[0] ?? '';
    expect(cookie).toContain(`${NOME_DO_COOKIE}=`);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('o banco guarda só o hash do token, nunca o token do cookie', async () => {
    const cookie = await cookieDe();
    const token = cookie.split('=')[1] ?? '';
    const sessoes = await prisma.sessao.findMany();
    expect(sessoes).toHaveLength(1);
    expect(sessoes[0]?.id).toBe(createHash('sha256').update(token).digest('hex'));
    expect(sessoes[0]?.id).toBe(hashDoToken(token));
    expect(sessoes[0]?.id).not.toBe(token);
    expect(sessoes[0]?.expiraEm.getTime()).toBe(INICIO.getTime() + DURACAO_DA_SESSAO_MS);
  });

  it('o login não diferencia maiúsculas de minúsculas', async () => {
    expect((await entrar('  DONO ', SENHA)).status).toBe(200);
  });

  it('senha errada, login inexistente e usuário desativado dão a mesma resposta 401', async () => {
    await prisma.usuario.update({ where: { login: 'aux' }, data: { ativo: false } });
    const respostas = await Promise.all([
      entrar('dono', 'senha-errada'),
      entrar('ninguem', SENHA),
      entrar('aux', SENHA),
    ]);
    for (const r of respostas) {
      expect(r.status).toBe(401);
      expect(r.body).toEqual({
        erro: { codigo: 'CREDENCIAIS_INVALIDAS', mensagem: 'Usuário ou senha incorretos.' },
      });
      expect(r.headers['set-cookie']).toBeUndefined();
    }
  });

  it('campos vazios dão 422 com o erro em cada campo', async () => {
    const resposta = await entrar('', '');
    expect(resposta.status).toBe(422);
    expect(resposta.body.erro.codigo).toBe('DADOS_INVALIDOS');
    expect(resposta.body.erro.campos).toEqual({
      login: 'Informe o usuário',
      senha: 'Informe a senha',
    });
    expect(await prisma.tentativaLogin.count()).toBe(0);
  });

  it('apaga as sessões vencidas de todos quando alguém entra', async () => {
    await cookieDe('aux');
    avancar(13 * HORA);
    await cookieDe('dono');
    expect(await prisma.sessao.count()).toBe(1);
  });
});

describe('limite de tentativas', () => {
  async function falhar(vezes: number) {
    for (let i = 0; i < vezes; i += 1) {
      expect((await entrar('dono', 'errada')).status).toBe(401);
    }
  }

  it('a 6ª tentativa em 15 minutos dá 429, mesmo com a senha certa', async () => {
    await falhar(LIMITE_DE_FALHAS);
    const resposta = await entrar('dono', SENHA);
    expect(resposta.status).toBe(429);
    expect(resposta.body.erro.codigo).toBe('MUITAS_TENTATIVAS');
    expect(resposta.headers['set-cookie']).toBeUndefined();
  });

  it('o 429 diz em quanto tempo tentar de novo (Retry-After)', async () => {
    await falhar(LIMITE_DE_FALHAS);
    avancar(MINUTO);
    const resposta = await entrar('dono', SENHA);
    expect(resposta.status).toBe(429);
    expect(resposta.headers['retry-after']).toBe(String((JANELA_DO_LIMITE_MS - MINUTO) / 1000));
  });

  it('continua bloqueado aos 14min59s e volta a aceitar depois de 15 minutos', async () => {
    await falhar(LIMITE_DE_FALHAS);

    avancar(15 * MINUTO - 1000);
    expect((await entrar('dono', SENHA)).status).toBe(429);

    avancar(2000);
    expect((await entrar('dono', SENHA)).status).toBe(200);
  });

  it('quem já está bloqueado não gera novas falhas (o bloqueio não se prolonga sozinho)', async () => {
    await falhar(LIMITE_DE_FALHAS);
    await entrar('dono', 'errada');
    await entrar('dono', 'errada');
    expect(await prisma.tentativaLogin.count()).toBe(LIMITE_DE_FALHAS);
  });

  it('o bloqueio é por login: outro usuário, no mesmo IP, continua entrando', async () => {
    await falhar(LIMITE_DE_FALHAS);
    expect((await entrar('aux', SENHA)).status).toBe(200);
  });

  it('um login certo zera a contagem do login naquele IP', async () => {
    await falhar(4);
    expect((await entrar('dono', SENHA)).status).toBe(200);
    expect(await prisma.tentativaLogin.count()).toBe(0);
    await falhar(4);
    expect((await entrar('dono', SENHA)).status).toBe(200);
  });

  it('login inexistente também conta (não revela quais logins existem)', async () => {
    for (let i = 0; i < LIMITE_DE_FALHAS; i += 1) await entrar('ninguem', 'x');
    const resposta = await entrar('ninguem', 'x');
    expect(resposta.status).toBe(429);
  });

  it('as falhas gravam login (minúsculo), IP e hora', async () => {
    await entrar(' DONO ', 'errada');
    const [falha] = await prisma.tentativaLogin.findMany();
    expect(falha?.login).toBe('dono');
    expect(falha?.ip).toBeTruthy();
    expect(falha?.ocorridaEm.getTime()).toBe(INICIO.getTime());
  });

  it('falhas com mais de 15 minutos são apagadas na próxima falha', async () => {
    await falhar(2);
    avancar(16 * MINUTO);
    await falhar(1);
    expect(await prisma.tentativaLogin.count()).toBe(1);
  });

  describe('contagem por login e IP', () => {
    it('conta separado para cada par (login, IP)', async () => {
      for (let i = 0; i < LIMITE_DE_FALHAS; i += 1) {
        await registrarFalha(prisma, 'dono', '10.0.0.1', INICIO);
      }
      expect((await verificarLimite(prisma, 'dono', '10.0.0.1', INICIO)).bloqueado).toBe(true);
      expect((await verificarLimite(prisma, 'dono', '10.0.0.2', INICIO)).bloqueado).toBe(false);
      expect((await verificarLimite(prisma, 'aux', '10.0.0.1', INICIO)).bloqueado).toBe(false);
    });

    it('4 falhas ainda não bloqueiam; a 5ª bloqueia', async () => {
      for (let i = 0; i < LIMITE_DE_FALHAS - 1; i += 1) {
        await registrarFalha(prisma, 'dono', '10.0.0.1', INICIO);
      }
      expect((await verificarLimite(prisma, 'dono', '10.0.0.1', INICIO)).bloqueado).toBe(false);
      await registrarFalha(prisma, 'dono', '10.0.0.1', INICIO);
      expect((await verificarLimite(prisma, 'dono', '10.0.0.1', INICIO)).bloqueado).toBe(true);
    });

    it('limparFalhas só mexe no par informado', async () => {
      await registrarFalha(prisma, 'dono', '10.0.0.1', INICIO);
      await registrarFalha(prisma, 'dono', '10.0.0.2', INICIO);
      await limparFalhas(prisma, 'dono', '10.0.0.1');
      expect(await prisma.tentativaLogin.count()).toBe(1);
    });
  });
});

describe('GET /api/auth/me', () => {
  it('sem cookie dá 401 NAO_AUTENTICADO', async () => {
    const resposta = await request(app).get('/api/auth/me');
    expect(resposta.status).toBe(401);
    expect(resposta.body.erro.codigo).toBe('NAO_AUTENTICADO');
  });

  it('com a sessão devolve o usuário e o perfil', async () => {
    const resposta = await eu(await cookieDe('aux'));
    expect(resposta.status).toBe(200);
    expect(resposta.body).toEqual({ id: expect.any(Number), nome: 'Auxiliar', perfil: 'auxiliar' });
  });

  it('cookie inventado dá 401', async () => {
    const resposta = await eu(`${NOME_DO_COOKIE}=token-que-nao-existe`);
    expect(resposta.status).toBe(401);
  });

  it('usuário desativado perde o acesso mesmo com a sessão ainda válida', async () => {
    const cookie = await cookieDe('aux');
    await prisma.usuario.update({ where: { login: 'aux' }, data: { ativo: false } });
    expect((await eu(cookie)).status).toBe(401);
  });
});

describe('POST /api/auth/logout', () => {
  it('encerra a sessão: o mesmo cookie passa a dar 401 e a linha some do banco', async () => {
    const cookie = await cookieDe();
    expect((await eu(cookie)).status).toBe(200);

    const saida = await request(app).post('/api/auth/logout').set(CABECALHO).set('Cookie', cookie);
    expect(saida.status).toBe(204);
    const limpar = (saida.headers['set-cookie'] as unknown as string[])[0] ?? '';
    expect(limpar).toContain(`${NOME_DO_COOKIE}=;`);

    expect((await eu(cookie)).status).toBe(401);
    expect(await prisma.sessao.count()).toBe(0);
  });

  it('só encerra a própria sessão: a de outra pessoa continua valendo', async () => {
    const dono = await cookieDe('dono');
    const aux = await cookieDe('aux');
    await request(app).post('/api/auth/logout').set(CABECALHO).set('Cookie', dono);
    expect((await eu(aux)).status).toBe(200);
  });

  it('sem login dá 401', async () => {
    const resposta = await request(app).post('/api/auth/logout').set(CABECALHO);
    expect(resposta.status).toBe(401);
  });
});

describe('expiração por inatividade (12 horas)', () => {
  it('sessão sem uso por mais de 12 horas dá 401 e é apagada', async () => {
    const cookie = await cookieDe();
    avancar(12 * HORA + 1000);
    const resposta = await eu(cookie);
    expect(resposta.status).toBe(401);
    expect(await prisma.sessao.count()).toBe(0);
  });

  it('um segundo antes das 12 horas ainda vale', async () => {
    const cookie = await cookieDe();
    avancar(12 * HORA - 1000);
    expect((await eu(cookie)).status).toBe(200);
  });

  it('cada uso renova o prazo: usar a cada 11 horas mantém a sessão por mais de um dia', async () => {
    const cookie = await cookieDe();
    avancar(11 * HORA);
    expect((await eu(cookie)).status).toBe(200);
    avancar(11 * HORA);
    expect((await eu(cookie)).status).toBe(200);
    avancar(11 * HORA);
    expect((await eu(cookie)).status).toBe(200);

    avancar(12 * HORA + 1000);
    expect((await eu(cookie)).status).toBe(401);
  });
});

describe('cabeçalho X-Estaciona-App (proteção contra CSRF)', () => {
  it('POST sem o cabeçalho dá 403, inclusive no login', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .send({ login: 'dono', senha: SENHA });
    expect(resposta.status).toBe(403);
    expect(resposta.body.erro.codigo).toBe('SEM_PERMISSAO');
    expect(await prisma.sessao.count()).toBe(0);
  });

  it('o cabeçalho é conferido antes de a rota existir: POST em rota inexistente também dá 403', async () => {
    expect((await request(app).post('/api/nao-existe')).status).toBe(403);
    expect((await request(app).post('/api/nao-existe').set(CABECALHO)).status).toBe(404);
  });

  it.each(['patch', 'put', 'delete'] as const)('%s sem o cabeçalho dá 403', async (metodo) => {
    expect((await request(app)[metodo]('/api/nao-existe')).status).toBe(403);
  });

  it('leitura (GET) não exige o cabeçalho', async () => {
    expect((await request(app).get('/api/saude')).status).toBe(200);
  });

  it('o valor do cabeçalho precisa ser 1', async () => {
    const resposta = await request(app)
      .post('/api/auth/login')
      .set('X-Estaciona-App', '0')
      .send({ login: 'dono', senha: SENHA });
    expect(resposta.status).toBe(403);
  });
});

describe('senhas e cadastro de usuários', () => {
  it('a senha é guardada como hash argon2id, com sal (hashes diferentes para a mesma senha)', async () => {
    const [usuario] = await prisma.usuario.findMany({ where: { login: 'dono' } });
    expect(usuario?.senhaHash.startsWith('$argon2id$')).toBe(true);
    expect(usuario?.senhaHash).not.toContain(SENHA);

    const outro = await hashSenha(SENHA);
    expect(outro).not.toBe(usuario?.senhaHash);
    expect(await conferirSenha(SENHA, outro)).toBe(true);
  });

  it('conferirSenha recusa senha errada e hash inválido, sem lançar erro', async () => {
    const hash = await hashSenha(SENHA);
    expect(await conferirSenha('errada', hash)).toBe(false);
    expect(await conferirSenha(SENHA, 'isto-nao-e-um-hash')).toBe(false);
  });

  it('o cadastro recusa senha com menos de 10 caracteres', async () => {
    const tentativa = criarUsuario(prisma, {
      nome: 'Novo',
      login: 'novo',
      senha: '123456789',
      perfil: 'proprietario',
    });
    await expect(tentativa).rejects.toBeInstanceOf(ErroDeCadastroDeUsuario);
    await expect(tentativa).rejects.toThrow('A senha precisa ter pelo menos 10 caracteres.');
    expect(await prisma.usuario.count({ where: { login: 'novo' } })).toBe(0);
  });

  it('aceita senha com exatamente 10 caracteres', async () => {
    await expect(
      criarUsuario(prisma, {
        nome: 'Novo',
        login: 'novo',
        senha: '1234567890',
        perfil: 'auxiliar',
      }),
    ).resolves.toMatchObject({ login: 'novo' });
  });

  it('o cadastro recusa login repetido (sem diferenciar maiúsculas) e campos vazios', async () => {
    await expect(
      criarUsuario(prisma, { nome: 'Outro', login: 'DONO', senha: SENHA, perfil: 'auxiliar' }),
    ).rejects.toThrow('Já existe um usuário com este login.');
    await expect(
      criarUsuario(prisma, { nome: ' ', login: 'x', senha: SENHA, perfil: 'auxiliar' }),
    ).rejects.toThrow('Informe o nome.');
    await expect(
      criarUsuario(prisma, { nome: 'X', login: ' ', senha: SENHA, perfil: 'auxiliar' }),
    ).rejects.toThrow('Informe o login.');
  });

  it('grava o login em minúsculo e o nome sem espaços nas pontas', async () => {
    await criarUsuario(prisma, {
      nome: '  Maria  ',
      login: ' Maria ',
      senha: SENHA,
      perfil: 'auxiliar',
    });
    const usuario = await prisma.usuario.findUnique({ where: { login: 'maria' } });
    expect(usuario?.nome).toBe('Maria');
  });
});
