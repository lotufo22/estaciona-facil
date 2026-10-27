import express, { type Express } from 'express';
import helmet from 'helmet';
import { rotaNaoEncontrada, tratadorDeErros } from './erros';
import type { PrismaClient } from './prisma';
import { criarRotaSaude } from './rotas/saude';

/** O que as rotas recebem. `agora` existe para os testes poderem controlar o relógio. */
export interface Dependencias {
  prisma: PrismaClient;
  agora: () => Date;
}

/**
 * Monta o app sem abrir porta. O servidor local (`servidor.ts`) e a função da Netlify chamam esta
 * mesma função, então rodam o mesmo código.
 */
export function criarApp(deps: { prisma: PrismaClient; agora?: () => Date }): Express {
  const dependencias: Dependencias = {
    prisma: deps.prisma,
    agora: deps.agora ?? (() => new Date()),
  };

  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));

  const api = express.Router();
  api.use('/saude', criarRotaSaude(dependencias));
  app.use('/api', api);

  app.use(rotaNaoEncontrada);
  app.use(tratadorDeErros);
  return app;
}
