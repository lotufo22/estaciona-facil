import type { CodigoErro, ErroApi } from '@estacionafacil/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';

/** Erro previsto: vira a resposta `{ erro: { codigo, mensagem, campos } }` da spec, com este status. */
export class ErroHttp extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: CodigoErro,
    mensagem: string,
    public readonly campos?: Record<string, string>,
  ) {
    super(mensagem);
    this.name = 'ErroHttp';
  }
}

function corpoDoErro(
  codigo: CodigoErro,
  mensagem: string,
  campos?: Record<string, string>,
): ErroApi {
  return { erro: { codigo, mensagem, ...(campos ? { campos } : {}) } };
}

/** Rota que nenhuma das anteriores atendeu. */
export const rotaNaoEncontrada: RequestHandler = (_req, _res, next) => {
  next(new ErroHttp(404, 'NAO_ENCONTRADO', 'Rota não encontrada.'));
};

/** Erros do leitor de JSON do Express (corpo malformado ou grande demais). */
function erroDoCorpo(erro: unknown): { status: number; mensagem: string } | null {
  const tipo = (erro as { type?: unknown } | null)?.type;
  if (tipo === 'entity.parse.failed') {
    return { status: 400, mensagem: 'O corpo da requisição não é um JSON válido.' };
  }
  if (tipo === 'entity.too.large') {
    return { status: 413, mensagem: 'O corpo da requisição é grande demais.' };
  }
  return null;
}

/**
 * Último middleware: converte qualquer erro no formato da spec. Erro inesperado vira 500 com
 * mensagem genérica; os detalhes (que podem ter dados internos) só vão para o log do servidor.
 */
export const tratadorDeErros: ErrorRequestHandler = (erro, _req, res, next) => {
  if (res.headersSent) {
    next(erro);
    return;
  }
  if (erro instanceof ErroHttp) {
    res.status(erro.status).json(corpoDoErro(erro.codigo, erro.message, erro.campos));
    return;
  }
  const doCorpo = erroDoCorpo(erro);
  if (doCorpo) {
    res.status(doCorpo.status).json(corpoDoErro('DADOS_INVALIDOS', doCorpo.mensagem));
    return;
  }
  console.error('Erro inesperado:', erro instanceof Error ? (erro.stack ?? erro.message) : erro);
  res.status(500).json(corpoDoErro('ERRO_INTERNO', 'Algo deu errado. Tente de novo em instantes.'));
};
