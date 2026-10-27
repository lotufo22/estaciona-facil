import type { RequestHandler } from 'express';
import { NOME_DO_COOKIE, validarERenovarSessao } from '../autenticacao/sessoes';
import { dependenciasDe } from '../dependencias';
import { ErroHttp } from '../erros';

/** Barra quem não tem sessão válida (401) e, para os demais, preenche `req.usuario`. */
export const exigirLogin: RequestHandler = async (req, _res, next) => {
  const token: unknown = req.cookies?.[NOME_DO_COOKIE];
  if (typeof token === 'string' && token) {
    const { prisma, agora } = dependenciasDe(req);
    const usuario = await validarERenovarSessao(prisma, token, agora());
    if (usuario) {
      req.usuario = usuario;
      next();
      return;
    }
  }
  next(new ErroHttp(401, 'NAO_AUTENTICADO', 'Entre para continuar.'));
};
