import type { ErroApi } from '@estacionafacil/shared';

export class ErroApiCliente extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
    public readonly campos?: Record<string, string>,
  ) {
    super(mensagem);
    this.name = 'ErroApiCliente';
  }
}

let aoExpirar: () => void = () => window.location.assign('/entrar?expirou=1');

/** Define o que acontece quando a API responde 401 numa chamada que exigia sessão. */
export function definirAoExpirar(funcao: () => void): void {
  aoExpirar = funcao;
}

interface Opcoes {
  metodo?: 'GET' | 'POST' | 'PATCH';
  corpo?: unknown;
  /** Vai no cabeçalho Idempotency-Key (obrigatório em POST /pagamentos). */
  idempotencia?: string;
  /** Login e /auth/me: 401 aqui é "não está logado", não "sessão expirou". */
  naoRedirecionarEm401?: boolean;
}

const MENSAGEM_GENERICA = 'Não foi possível completar a operação. Tente de novo.';

export async function apiFetch<T>(caminho: string, opcoes: Opcoes = {}): Promise<T> {
  const metodo = opcoes.metodo ?? 'GET';
  const cabecalhos: Record<string, string> = { Accept: 'application/json' };
  if (metodo !== 'GET') cabecalhos['X-Estaciona-App'] = '1';
  if (opcoes.corpo !== undefined) cabecalhos['Content-Type'] = 'application/json';
  if (opcoes.idempotencia) cabecalhos['Idempotency-Key'] = opcoes.idempotencia;

  let resposta: Response;
  try {
    resposta = await fetch(`/api${caminho}`, {
      method: metodo,
      headers: cabecalhos,
      body: opcoes.corpo === undefined ? undefined : JSON.stringify(opcoes.corpo),
      credentials: 'same-origin',
    });
  } catch {
    throw new ErroApiCliente(
      0,
      'SEM_CONEXAO',
      'Sem conexão com o servidor. Confira a internet e tente de novo.',
    );
  }

  if (resposta.ok) {
    if (resposta.status === 204) return undefined as T;
    return (await resposta.json()) as T;
  }

  if (resposta.status === 401 && !opcoes.naoRedirecionarEm401) aoExpirar();

  const corpo = (await resposta.json().catch(() => null)) as ErroApi | null;
  throw new ErroApiCliente(
    resposta.status,
    corpo?.erro?.codigo ?? 'ERRO_DESCONHECIDO',
    corpo?.erro?.mensagem ?? MENSAGEM_GENERICA,
    corpo?.erro?.campos,
  );
}
