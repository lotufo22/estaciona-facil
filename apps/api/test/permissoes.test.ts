import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Perfil } from '@estacionafacil/shared';
import { registrarDependencias } from '../src/dependencias';
import { tratadorDeErros } from '../src/erros';
import { exigirCabecalhoApp } from '../src/middlewares/exigirCabecalhoApp';
import { exigirLogin } from '../src/middlewares/exigirLogin';
import { exigirPerfil } from '../src/middlewares/exigirPerfil';
import { criarUsuario } from '../src/autenticacao/usuarios';
import { criarAppDeTeste } from './ajudantes';

const SENHA = 'senha-forte-123';
const CABECALHO = { 'X-Estaciona-App': '1' };

const { app, prisma, limparBanco, encerrar } = criarAppDeTeste();

type Papel = 'anonimo' | Perfil;
const PAPEIS: Papel[] = ['anonimo', 'proprietario', 'auxiliar'];

beforeAll(async () => {
  await limparBanco();
  for (const perfil of ['proprietario', 'auxiliar'] as const) {
    await criarUsuario(prisma, { nome: perfil, login: perfil, senha: SENHA, perfil });
  }
});
afterAll(encerrar);

/** Faz login e devolve o cookie. Cada chamada abre uma sessão nova e independente. */
async function entrarComo(perfil: Perfil): Promise<string> {
  const resposta = await request(app)
    .post('/api/auth/login')
    .set(CABECALHO)
    .send({ login: perfil, senha: SENHA });
  expect(resposta.status).toBe(200);
  const cookie = (resposta.headers['set-cookie'] as unknown as string[])[0] ?? '';
  return cookie.split(';')[0] ?? '';
}

/**
 * Chama a rota como o papel indicado (anônimo não manda cookie). Cada chamada usa uma sessão
 * própria: a rota de logout encerra a sessão, e isso não pode afetar os outros testes.
 */
async function chamar(servidor: Express, metodo: string, rota: string, papel: Papel) {
  const metodoHttp = metodo.toLowerCase() as 'get' | 'post' | 'patch';
  let req = request(servidor)[metodoHttp](rota).set(CABECALHO);
  if (papel !== 'anonimo') req = req.set('Cookie', await entrarComo(papel));
  return metodo === 'GET' ? req : req.send({});
}

/**
 * Matriz de permissões das rotas REAIS da spec (seção 6): [método, rota, quem pode].
 * Cada tarefa de API seguinte acrescenta aqui as rotas que cria. `publico` = qualquer pessoa.
 * Esta tabela só confere a camada de permissão: o corpo de cada pedido é vazio, então uma rota
 * permitida pode responder 422, 404 etc.; o que importa é não ser barrada por 401 ou 403.
 */
const ROTAS: { metodo: string; rota: string; quem: 'publico' | Perfil[] }[] = [
  { metodo: 'GET', rota: '/api/saude', quem: 'publico' },
  { metodo: 'POST', rota: '/api/auth/login', quem: 'publico' },
  { metodo: 'POST', rota: '/api/auth/logout', quem: ['proprietario', 'auxiliar'] },
  { metodo: 'GET', rota: '/api/auth/me', quem: ['proprietario', 'auxiliar'] },
  { metodo: 'GET', rota: '/api/mensalistas', quem: ['proprietario', 'auxiliar'] },
  { metodo: 'POST', rota: '/api/mensalistas', quem: ['proprietario'] },
  { metodo: 'GET', rota: '/api/mensalistas/1', quem: ['proprietario', 'auxiliar'] },
  { metodo: 'PATCH', rota: '/api/mensalistas/1', quem: ['proprietario'] },
  { metodo: 'POST', rota: '/api/contratos/1/renovacao', quem: ['proprietario'] },
  { metodo: 'POST', rota: '/api/contratos/1/encerramento', quem: ['proprietario'] },
  { metodo: 'POST', rota: '/api/pagamentos', quem: ['proprietario', 'auxiliar'] },
  { metodo: 'GET', rota: '/api/pagamentos', quem: ['proprietario', 'auxiliar'] },
  { metodo: 'GET', rota: '/api/pagamentos/1', quem: ['proprietario', 'auxiliar'] },
];

describe('matriz de permissões das rotas da spec', () => {
  for (const { metodo, rota, quem } of ROTAS) {
    describe(`${metodo} ${rota}`, () => {
      for (const papel of PAPEIS) {
        const permitido = quem === 'publico' || (papel !== 'anonimo' && quem.includes(papel));
        const esperado = permitido
          ? 'passa pela permissão'
          : papel === 'anonimo'
            ? '401 NAO_AUTENTICADO'
            : '403 SEM_PERMISSAO';

        it(`${papel}: ${esperado}`, async () => {
          const resposta = await chamar(app, metodo, rota, papel);
          if (permitido) {
            expect(resposta.body?.erro?.codigo).not.toBe('NAO_AUTENTICADO');
            expect(resposta.body?.erro?.codigo).not.toBe('SEM_PERMISSAO');
          } else if (papel === 'anonimo') {
            expect(resposta.status).toBe(401);
            expect(resposta.body.erro.codigo).toBe('NAO_AUTENTICADO');
          } else {
            expect(resposta.status).toBe(403);
            expect(resposta.body.erro.codigo).toBe('SEM_PERMISSAO');
          }
        });
      }
    });
  }
});

describe('exigirPerfil', () => {
  // App mínimo só para exercitar o middleware com rotas restritas, que ainda não existem no app real.
  function criarAppMinimo(): Express {
    const mini = express();
    registrarDependencias(mini, { prisma, agora: () => new Date() });
    mini.use(cookieParser());
    mini.use(exigirCabecalhoApp);
    const ok = (_req: express.Request, res: express.Response) => res.json({ ok: true });
    mini.get('/qualquer-logado', exigirLogin, ok);
    mini.get('/so-proprietario', exigirLogin, exigirPerfil('proprietario'), ok);
    mini.post('/so-proprietario', exigirLogin, exigirPerfil('proprietario'), ok);
    mini.get('/so-auxiliar', exigirLogin, exigirPerfil('auxiliar'), ok);
    mini.get('/qualquer-perfil-listado', exigirLogin, exigirPerfil('proprietario', 'auxiliar'), ok);
    mini.use(tratadorDeErros);
    return mini;
  }
  const mini = criarAppMinimo();

  const casos: { rota: string; quem: Papel[] }[] = [
    { rota: '/qualquer-logado', quem: ['proprietario', 'auxiliar'] },
    { rota: '/so-proprietario', quem: ['proprietario'] },
    { rota: '/so-auxiliar', quem: ['auxiliar'] },
    { rota: '/qualquer-perfil-listado', quem: ['proprietario', 'auxiliar'] },
  ];

  for (const { rota, quem } of casos) {
    for (const papel of PAPEIS) {
      const permitido = quem.includes(papel);
      it(`${rota} como ${papel}: ${permitido ? '200' : papel === 'anonimo' ? '401' : '403'}`, async () => {
        const resposta = await chamar(mini, 'GET', rota, papel);
        if (permitido) {
          expect(resposta.status).toBe(200);
        } else if (papel === 'anonimo') {
          expect(resposta.status).toBe(401);
          expect(resposta.body.erro.codigo).toBe('NAO_AUTENTICADO');
        } else {
          expect(resposta.status).toBe(403);
          expect(resposta.body.erro).toEqual({
            codigo: 'SEM_PERMISSAO',
            mensagem: 'Você não tem permissão para acessar esta página.',
          });
        }
      });
    }
  }

  it('o 403 vale também para escritas (POST) de perfil sem permissão', async () => {
    const resposta = await chamar(mini, 'POST', '/so-proprietario', 'auxiliar');
    expect(resposta.status).toBe(403);
  });

  it('a permissão é conferida na API, sem depender de nada que o navegador mande', async () => {
    const resposta = await request(mini)
      .get('/so-proprietario')
      .set('Cookie', await entrarComo('auxiliar'))
      .set('X-Perfil', 'proprietario');
    expect(resposta.status).toBe(403);
  });
});
