/** Valores compartilhados pelo `playwright.config.ts`, pelo preparo do banco e pelos testes. */

export const PORTA_API = 3101;
export const PORTA_WEB = 5174;
export const URL_WEB = `http://localhost:${PORTA_WEB}`;

/** Usuários criados no banco de teste antes de cada execução (nunca existem em produção). */
export const USUARIOS = {
  dono: { nome: 'Proprietário', login: 'dono', senha: 'senha-e2e-12345', perfil: 'proprietario' },
  auxiliar: { nome: 'Auxiliar', login: 'auxiliar', senha: 'senha-e2e-12345', perfil: 'auxiliar' },
} as const;
