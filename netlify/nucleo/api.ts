import serverless from 'serverless-http';
import type { Express } from 'express';
import { criarApp } from '../../apps/api/src/app';
import { criarPrisma } from '../../apps/api/src/prisma';

/**
 * Função da Netlify que serve a API inteira: o redirecionamento do `netlify.toml` manda `/api/*`
 * para cá, e o Express (o mesmo `criarApp` do servidor local) responde. Domínio único, então o
 * cookie de sessão funciona e não há CORS.
 *
 * O ponto de entrada fica em `functions/api.mts`, só com `export default`: a Netlify empacota como ES modules apenas as funções v2 (`Request`/`Response`) que NÃO exportam `handler`. As v1 saem em CommonJS, e aí o `import.meta.url` do cliente gerado do Prisma fica indefinido e a função cai ao iniciar. Por isso a lógica mora aqui e os testes importam daqui.
 */

let app: Express | undefined;
let atendedor: ReturnType<typeof serverless> | undefined;

/** Cria o app uma vez por instância da função e o reaproveita nas invocações seguintes. */
export function obterApp(): Express {
  if (!app) {
    const url = process.env['DATABASE_URL'];
    if (!url) throw new Error('DATABASE_URL não está definida nas variáveis do site.');
    // Uma conexão por instância: a conexão passa pelo pooler do Supabase em modo transação.
    app = criarApp({ prisma: criarPrisma(url, { maximoDeConexoes: 1 }), confiarNoProxy: true });
  }
  return app;
}

const PREFIXO_DA_FUNCAO = '/.netlify/functions/api';

/** Com o redirecionamento, o caminho pode chegar como `/api/...` ou como `/.netlify/functions/api/...`. */
function normalizarCaminho(caminho: string): string {
  if (caminho.startsWith(PREFIXO_DA_FUNCAO))
    return `/api${caminho.slice(PREFIXO_DA_FUNCAO.length)}`;
  return caminho;
}

type Evento = Parameters<ReturnType<typeof serverless>>[0];
type Contexto = Parameters<ReturnType<typeof serverless>>[1];

/**
 * IP de quem chamou: o cabeçalho que a própria Netlify preenche na borda (o cliente não o controla)
 * ou, na falta dele, o último item do `X-Forwarded-For` (o que o proxy anexou).
 */
export function ipDoCliente(
  cabecalhos: Record<string, string | undefined> = {},
): string | undefined {
  const daNetlify = cabecalhos['x-nf-client-connection-ip']?.trim();
  if (daNetlify) return daNetlify;
  const encaminhados = cabecalhos['x-forwarded-for']?.split(',');
  return encaminhados?.[encaminhados.length - 1]?.trim() || undefined;
}

/** Atende um evento no formato Lambda (o que o `serverless-http` entende). */
export const atenderEvento = async (evento: Evento, contexto: Contexto) => {
  // O `serverless-http` monta um socket falso, sem endereço, e o Express só consegue ler o
  // `X-Forwarded-For` quando há um endereço de socket. Sem este ajuste, o limite de tentativas de
  // login enxergaria todo mundo como o mesmo "desconhecido".
  atendedor ??= serverless(obterApp(), {
    request(requisicao: { socket: object }, e: { headers?: Record<string, string> }) {
      const ip = ipDoCliente(e.headers);
      if (ip) Object.defineProperty(requisicao.socket, 'remoteAddress', { value: ip });
    },
  });
  const e = evento as { path?: string; rawPath?: string };
  if (typeof e.path === 'string') e.path = normalizarCaminho(e.path);
  if (typeof e.rawPath === 'string') e.rawPath = normalizarCaminho(e.rawPath);
  return atendedor(evento, contexto);
};

/** Respostas que, por regra do HTTP, não podem ter corpo. */
const SEM_CORPO = new Set([101, 204, 205, 304]);

/** Converte o `Request` da Netlify (função v2) em evento, chama o Express e devolve `Response`. */
export async function atender(requisicao: Request, contexto?: { ip?: string }): Promise<Response> {
  const url = new URL(requisicao.url);
  const temCorpo = requisicao.method !== 'GET' && requisicao.method !== 'HEAD';

  const cabecalhos: Record<string, string> = {};
  requisicao.headers.forEach((valor, nome) => {
    cabecalhos[nome.toLowerCase()] = valor;
  });
  if (contexto?.ip) cabecalhos['x-nf-client-connection-ip'] = contexto.ip;

  const multiplos: Record<string, string[]> = {};
  url.searchParams.forEach((valor, nome) => {
    (multiplos[nome] ??= []).push(valor);
  });

  const resultado = (await atenderEvento(
    {
      httpMethod: requisicao.method,
      path: url.pathname,
      headers: cabecalhos,
      queryStringParameters: Object.fromEntries(url.searchParams),
      multiValueQueryStringParameters: multiplos,
      body: temCorpo ? await requisicao.text() : null,
      isBase64Encoded: false,
    } as unknown as Evento,
    {} as Contexto,
  )) as {
    statusCode: number;
    body?: string;
    headers?: Record<string, string | number | boolean>;
    multiValueHeaders?: Record<string, string[]>;
  };

  const respostaCabecalhos = new Headers();
  const jaTrataramComoLista = new Set(Object.keys(resultado.multiValueHeaders ?? {}));
  for (const [nome, valor] of Object.entries(resultado.headers ?? {})) {
    if (!jaTrataramComoLista.has(nome)) respostaCabecalhos.set(nome, String(valor));
  }
  // `Set-Cookie` precisa de uma linha por cookie, por isso vem como lista.
  for (const [nome, valores] of Object.entries(resultado.multiValueHeaders ?? {})) {
    for (const valor of valores) respostaCabecalhos.append(nome, valor);
  }

  return new Response(SEM_CORPO.has(resultado.statusCode) ? null : (resultado.body ?? ''), {
    status: resultado.statusCode,
    headers: respostaCabecalhos,
  });
}
