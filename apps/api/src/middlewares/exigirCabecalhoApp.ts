import type { RequestHandler } from 'express';
import { ErroHttp } from '../erros';

const METODOS_QUE_SO_LEEM = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Proteção contra CSRF (spec, seção 6): qualquer requisição que altera dados precisa trazer
 * `X-Estaciona-App: 1`. Um formulário de outro site consegue enviar o cookie, mas não consegue
 * acrescentar um cabeçalho próprio sem a permissão do navegador (CORS), que esta API não dá.
 */
export const exigirCabecalhoApp: RequestHandler = (req, _res, next) => {
  if (METODOS_QUE_SO_LEEM.has(req.method) || req.get('X-Estaciona-App') === '1') {
    next();
    return;
  }
  next(new ErroHttp(403, 'SEM_PERMISSAO', 'Requisição não autorizada.'));
};
