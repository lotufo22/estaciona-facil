import type { Application, Request } from 'express';
import type { PrismaClient } from './prisma';

/** O que as rotas e os middlewares recebem. `agora` existe para os testes controlarem o relógio. */
export interface Dependencias {
  prisma: PrismaClient;
  agora: () => Date;
}

const CHAVE = 'dependencias';

/** Guarda as dependências no app, para os middlewares (que não são fábricas) as encontrarem. */
export function registrarDependencias(app: Application, dependencias: Dependencias): void {
  app.locals[CHAVE] = dependencias;
}

export function dependenciasDe(req: Request): Dependencias {
  const dependencias = req.app.locals[CHAVE] as Dependencias | undefined;
  if (!dependencias) {
    throw new Error('Dependências não registradas no app (use registrarDependencias).');
  }
  return dependencias;
}
