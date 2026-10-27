import type { UsuarioDaSessao } from './autenticacao/sessoes';

declare global {
  namespace Express {
    interface Request {
      /** Preenchido por `exigirLogin`; as rotas protegidas podem contar com ele. */
      usuario?: UsuarioDaSessao;
    }
  }
}
