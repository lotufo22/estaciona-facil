import type { Perfil } from '@estacionafacil/shared';
import type { RequestHandler } from 'express';
import { ErroHttp } from '../erros';

/**
 * Deixa passar só os perfis informados (403 para os outros). Vem sempre DEPOIS de `exigirLogin`.
 * A permissão é conferida aqui, na API, em toda rota: esconder a aba no front é só conforto.
 */
export function exigirPerfil(...perfis: [Perfil, ...Perfil[]]): RequestHandler {
  return (req, _res, next) => {
    if (!req.usuario) {
      next(new ErroHttp(401, 'NAO_AUTENTICADO', 'Entre para continuar.'));
      return;
    }
    if (!perfis.includes(req.usuario.perfil)) {
      next(new ErroHttp(403, 'SEM_PERMISSAO', 'Você não tem permissão para acessar esta página.'));
      return;
    }
    next();
  };
}
