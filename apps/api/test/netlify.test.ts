import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { carregarEnv } from '../src/ambiente';
import { criarApp } from '../src/app';
import { criarUsuario } from '../src/autenticacao/usuarios';
import { criarAppDeTeste } from './ajudantes';

const RAIZ = new URL('../../../', import.meta.url);
const lerNaRaiz = (caminho: string) => readFileSync(new URL(caminho, RAIZ), 'utf8');

/** Evento no formato que a Netlify entrega a uma função (o que `serverless-http` lê). */
function evento(
  metodo: string,
  caminho: string,
  extras: { corpo?: unknown; cabecalhos?: Record<string, string> } = {},
) {
  return {
    httpMethod: metodo,
    path: caminho,
    headers: {
      'x-forwarded-for': '203.0.113.7',
      ...(extras.corpo === undefined ? {} : { 'content-type': 'application/json' }),
      ...extras.cabecalhos,
    },
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    body: extras.corpo === undefined ? null : JSON.stringify(extras.corpo),
    isBase64Encoded: false,
  };
}

const { prisma, limparBanco, encerrar } = criarAppDeTeste();

type FuncaoApi = typeof import('../../../netlify/nucleo/api');
let api: FuncaoApi;

beforeAll(async () => {
  carregarEnv();
  // A função lê a conexão de DATABASE_URL; nos testes ela aponta para o banco de teste.
  process.env['DATABASE_URL'] = process.env['DATABASE_URL_TESTE'];
  api = await import('../../../netlify/nucleo/api');
});
afterAll(async () => {
  await encerrar();
});
beforeEach(async () => {
  await limparBanco();
});

const chamar = (e: ReturnType<typeof evento>) =>
  api.atenderEvento(e, {} as never) as Promise<{
    statusCode: number;
    body: string;
    headers?: Record<string, string>;
    multiValueHeaders?: Record<string, string[]>;
  }>;

describe('função api', () => {
  it('GET /api/saude devolve 200', async () => {
    const resposta = await chamar(evento('GET', '/api/saude'));
    expect(resposta.statusCode).toBe(200);
    expect(JSON.parse(resposta.body)).toEqual({ status: 'ok' });
  });

  it('aceita o caminho como a Netlify o reescreve (/.netlify/functions/api/...)', async () => {
    const resposta = await chamar(evento('GET', '/.netlify/functions/api/saude'));
    expect(resposta.statusCode).toBe(200);
  });

  it('rota inexistente devolve o 404 no formato da spec', async () => {
    const resposta = await chamar(evento('GET', '/api/nao-existe'));
    expect(resposta.statusCode).toBe(404);
    expect(JSON.parse(resposta.body).erro.codigo).toBe('NAO_ENCONTRADO');
  });

  it('reaproveita a mesma instância do app entre invocações', async () => {
    expect(api.obterApp()).toBe(api.obterApp());
    await chamar(evento('GET', '/api/saude'));
    await chamar(evento('GET', '/api/saude'));
    expect(api.obterApp()).toBe(api.obterApp());
  });

  it('o login pela função devolve o cookie de sessão HttpOnly', async () => {
    await criarUsuario(prisma, {
      nome: 'Dono',
      login: 'dono',
      senha: 'senha-forte-123',
      perfil: 'proprietario',
    });
    const resposta = await chamar(
      evento('POST', '/api/auth/login', {
        corpo: { login: 'dono', senha: 'senha-forte-123' },
        cabecalhos: { 'x-estaciona-app': '1' },
      }),
    );
    expect(resposta.statusCode).toBe(200);
    const cookies = resposta.multiValueHeaders?.['set-cookie'] ?? [
      resposta.headers?.['set-cookie'],
    ];
    expect(cookies.join(';')).toMatch(/HttpOnly/);
    expect(cookies.join(';')).toMatch(/Secure/);
  });

  it('o limite de tentativas enxerga o IP de quem chamou (X-Forwarded-For), não o do proxy', async () => {
    await criarUsuario(prisma, {
      nome: 'Dono',
      login: 'dono',
      senha: 'senha-forte-123',
      perfil: 'proprietario',
    });
    const errar = (ip: string) =>
      chamar(
        evento('POST', '/api/auth/login', {
          corpo: { login: 'dono', senha: 'errada' },
          cabecalhos: { 'x-estaciona-app': '1', 'x-forwarded-for': ip },
        }),
      );
    for (let i = 0; i < 5; i += 1) await errar('203.0.113.7');
    const falhas = await prisma.tentativaLogin.findMany();
    expect(falhas.length).toBe(5);
    expect(new Set(falhas.map((f) => f.ip))).toEqual(new Set(['203.0.113.7']));
  });
});

describe('função gerar-despesas', () => {
  it('chama gerarDespesasRecorrentes com o dia de hoje em São Paulo e devolve quantas criou', async () => {
    const { gerarDespesasDoDia, executarEResponder } =
      await import('../../../netlify/nucleo/gerar-despesas');
    await prisma.recorrenciaDespesa.create({
      data: { descricao: 'Aluguel', valor: '2500.00', diaDoMes: 5 },
    });
    // 02:00 UTC de 06/11 ainda é 05/11 em São Paulo.
    const criadas = await gerarDespesasDoDia(prisma, new Date('2026-11-06T02:00:00Z'));
    expect(criadas).toBe(1);
    const despesa = await prisma.despesa.findFirstOrThrow();
    expect(despesa.data.toISOString().slice(0, 10)).toBe('2026-11-05');
    expect(await gerarDespesasDoDia(prisma, new Date('2026-11-06T02:00:00Z'))).toBe(0);

    process.env['DATABASE_URL'] = process.env['DATABASE_URL_TESTE'];
    const resposta = await executarEResponder();
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ criadas: expect.any(Number) });
  });
});

describe('ponto de entrada v2 (Request -> Response)', () => {
  const pedir = async (metodo: string, caminho: string, corpo?: unknown, ip = '203.0.113.9') => {
    const { default: entrada } = await import('../../../netlify/funcoes/api.mjs');
    return entrada(
      new Request(`https://exemplo.netlify.app${caminho}`, {
        method: metodo,
        headers: {
          'x-estaciona-app': '1',
          ...(corpo === undefined ? {} : { 'content-type': 'application/json' }),
        },
        ...(corpo === undefined ? {} : { body: JSON.stringify(corpo) }),
      }),
      { ip },
    );
  };

  it('responde GET /api/saude como Response', async () => {
    const resposta = await pedir('GET', '/api/saude');
    expect(resposta.status).toBe(200);
    expect(await resposta.json()).toEqual({ status: 'ok' });
  });

  it('devolve o Set-Cookie da sessão e o IP vem do contexto da Netlify', async () => {
    await criarUsuario(prisma, {
      nome: 'Dono',
      login: 'dono',
      senha: 'senha-forte-123',
      perfil: 'proprietario',
    });
    const resposta = await pedir(
      'POST',
      '/api/auth/login',
      { login: 'dono', senha: 'errada' },
      '198.51.100.4',
    );
    expect(resposta.status).toBe(401);
    expect((await prisma.tentativaLogin.findFirstOrThrow()).ip).toBe('198.51.100.4');

    const certa = await pedir('POST', '/api/auth/login', {
      login: 'dono',
      senha: 'senha-forte-123',
    });
    expect(certa.status).toBe(200);
    expect(certa.headers.getSetCookie().join(';')).toMatch(/HttpOnly/);
  });

  it('resposta sem corpo (204) não quebra o Response', async () => {
    await criarUsuario(prisma, {
      nome: 'Dono',
      login: 'dono',
      senha: 'senha-forte-123',
      perfil: 'proprietario',
    });
    const entrada = await pedir('POST', '/api/auth/login', {
      login: 'dono',
      senha: 'senha-forte-123',
    });
    const cookie = entrada.headers.getSetCookie()[0]?.split(';')[0] ?? '';
    const { default: api204 } = await import('../../../netlify/funcoes/api.mjs');
    const saida = await api204(
      new Request('https://exemplo.netlify.app/api/auth/logout', {
        method: 'POST',
        headers: { 'x-estaciona-app': '1', cookie },
      }),
      {},
    );
    expect(saida.status).toBe(204);
  });
});

describe('empacotamento das funções', () => {
  it('gera ES modules que carregam sozinhos (sem TypeScript, sem import.meta indefinido)', async () => {
    // Um defeito aqui só aparece depois de empacotado: o cliente do Prisma usa import.meta.url, e
    // uma função empacotada em CommonJS cairia ao iniciar. Por isso o teste usa o bundle de verdade.
    execFileSync(process.execPath, ['scripts/empacotar-funcoes.mjs'], { cwd: fileURLToPath(RAIZ) });
    const caminho = fileURLToPath(new URL('netlify/functions/api.mjs', RAIZ));
    const codigo = readFileSync(caminho, 'utf8');
    // É um ES module que exporta a função (bibliotecas CommonJS embutidas podem ter module.exports
    // dentro delas, o que não importa; o arquivo em si é que precisa ser ESM).
    expect(codigo).toMatch(/\bexport\s*\{[^}]*\bas default\b[^}]*\}/);
    expect(codigo).toMatch(/import\.meta\.url/);

    const { default: entrada } = (await import(pathToFileURL(caminho).href)) as {
      default: (r: Request, c?: { ip?: string }) => Promise<Response>;
    };
    const resposta = await entrada(new Request('https://exemplo.netlify.app/api/saude'), {});
    expect(resposta.status).toBe(200);
  }, 60_000);

  it('só o ponto de entrada tem export default: um handler nomeado faria a Netlify usar CommonJS', () => {
    for (const nome of ['api', 'gerar-despesas']) {
      const fonte = lerNaRaiz(`netlify/funcoes/${nome}.mts`);
      expect(fonte).toMatch(/export default/);
      expect(fonte).not.toMatch(/export (const|function|async function) handler/);
    }
  });
});

describe('criarApp atrás de proxy', () => {
  it('confiarNoProxy liga o trust proxy do Express; por padrão fica desligado', () => {
    expect(criarApp({ prisma }).get('trust proxy')).toBeFalsy();
    expect(criarApp({ prisma, confiarNoProxy: true }).get('trust proxy')).toBe(1);
  });
});

describe('netlify.toml', () => {
  const toml = lerNaRaiz('netlify.toml');

  it('redireciona /api/* para a função api, com status 200', () => {
    expect(toml).toMatch(/from\s*=\s*"\/api\/\*"/);
    expect(toml).toMatch(/to\s*=\s*"\/\.netlify\/functions\/api\/:splat"/);
    expect(toml).toMatch(/status\s*=\s*200/);
  });

  it('tem o fallback do SPA para index.html', () => {
    expect(toml).toMatch(/from\s*=\s*"\/\*"\s*\n\s*to\s*=\s*"\/index\.html"/);
  });

  it('agenda a geração de despesas às 03:00 UTC', () => {
    expect(toml).toMatch(/\[functions\."gerar-despesas"\]\s*\n\s*schedule\s*=\s*"0 3 \* \* \*"/);
  });

  it('desliga a publicação automática em produção (build de produção cancelado)', () => {
    expect(toml).toMatch(/\[context\.production\]\s*\n(?:\s*#.*\n)*\s*ignore\s*=\s*"exit 0"/);
  });

  it('gera o cliente do Prisma, o front e as funções antes de publicar', () => {
    expect(toml).toMatch(/npm run funcoes/);
    expect(toml).toMatch(/directory\s*=\s*"netlify\/functions"/);
    expect(toml).toMatch(/npm run gerar -w @estacionafacil\/api/);
    expect(toml).toMatch(/publish\s*=\s*"apps\/web\/dist"/);
  });

  it('leva os binários de Linux do argon2 no pacote da função, mesmo montado no Windows', () => {
    // Sem isto, o pacote montado num Windows só leva o binário do Windows, e o login cai na Netlify.
    expect(toml).toMatch(
      /included_files\s*=\s*\[[^\]]*node_modules\/argon2\/prebuilds\/linux-x64\/\*\*/,
    );
    expect(toml).toMatch(
      /included_files\s*=\s*\[[^\]]*node_modules\/argon2\/prebuilds\/linux-arm64\/\*\*/,
    );
  });
});
