import { loginSchema } from '@estacionafacil/shared';
import { type CookieOptions, type Request, Router } from 'express';
import {
  JANELA_DO_LIMITE_MS,
  limparFalhas,
  registrarFalha,
  verificarLimite,
} from '../autenticacao/limiteLogin';
import { conferirContraNinguem, conferirSenha } from '../autenticacao/senhas';
import {
  NOME_DO_COOKIE,
  apagarSessoesVencidas,
  criarSessao,
  encerrarSessao,
} from '../autenticacao/sessoes';
import { normalizarLogin } from '../autenticacao/usuarios';
import type { Dependencias } from '../dependencias';
import { ErroHttp } from '../erros';
import { exigirLogin } from '../middlewares/exigirLogin';
import { validar } from '../validacao';

/** Cookie da sessão (spec, seção 8): inacessível ao JavaScript, só por HTTPS e sem ir a outros sites. */
const OPCOES_DO_COOKIE: CookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
};

/**
 * IP de quem chamou. Atrás de um proxy (Netlify), o Express só o enxerga direito com `trust proxy`
 * configurado; sem isso, todos aparecem com o IP do proxy e o limite vale por login.
 */
function ipDoCliente(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? 'desconhecido';
}

export function criarRotasAuth({ prisma, agora }: Dependencias): Router {
  const rota = Router();

  rota.post('/login', async (req, res) => {
    const { login, senha } = validar(loginSchema, req.body);
    const loginNormalizado = normalizarLogin(login);
    const ip = ipDoCliente(req);
    const momento = agora();

    const limite = await verificarLimite(prisma, loginNormalizado, ip, momento);
    if (limite.bloqueado) {
      res.set('Retry-After', String(limite.tentarEmSegundos));
      throw new ErroHttp(
        429,
        'MUITAS_TENTATIVAS',
        `Muitas tentativas. Aguarde ${Math.ceil(JANELA_DO_LIMITE_MS / 60_000)} minutos e tente de novo.`,
      );
    }

    // Login inexistente, usuário desativado e senha errada dão a mesma resposta, no mesmo tempo.
    const usuario = await prisma.usuario.findUnique({ where: { login: loginNormalizado } });
    const confere =
      usuario?.ativo === true
        ? await conferirSenha(senha, usuario.senhaHash)
        : await conferirContraNinguem(senha);
    if (!usuario || !confere) {
      await registrarFalha(prisma, loginNormalizado, ip, momento);
      throw new ErroHttp(401, 'CREDENCIAIS_INVALIDAS', 'Usuário ou senha incorretos.');
    }

    await limparFalhas(prisma, loginNormalizado, ip);
    await apagarSessoesVencidas(prisma, momento);
    const { token } = await criarSessao(prisma, usuario.id, momento);
    res.cookie(NOME_DO_COOKIE, token, OPCOES_DO_COOKIE);
    res.json({ id: usuario.id, nome: usuario.nome, perfil: usuario.perfil });
  });

  rota.post('/logout', exigirLogin, async (req, res) => {
    const token: unknown = req.cookies?.[NOME_DO_COOKIE];
    if (typeof token === 'string') await encerrarSessao(prisma, token);
    res.clearCookie(NOME_DO_COOKIE, OPCOES_DO_COOKIE);
    res.status(204).end();
  });

  rota.get('/me', exigirLogin, (req, res) => {
    res.json(req.usuario);
  });

  return rota;
}
