import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { type Dependencias, registrarDependencias } from './dependencias';
import { rotaNaoEncontrada, tratadorDeErros } from './erros';
import { exigirCabecalhoApp } from './middlewares/exigirCabecalhoApp';
import type { PrismaClient } from './prisma';
import { criarRotasAuth } from './rotas/auth';
import { criarRotasContratos } from './rotas/contratos';
import { criarRotasMensalistas } from './rotas/mensalistas';
import { criarRotaSaude } from './rotas/saude';

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
  registrarDependencias(app, dependencias);
  app.use(helmet());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = express.Router();
  // Antes de qualquer rota: escrita sem o cabeçalho do app é barrada até em rota que não existe.
  api.use(exigirCabecalhoApp);
  api.use('/saude', criarRotaSaude(dependencias));
  api.use('/auth', criarRotasAuth(dependencias));
  api.use('/mensalistas', criarRotasMensalistas(dependencias));
  api.use('/contratos', criarRotasContratos(dependencias));
  app.use('/api', api);

  app.use(rotaNaoEncontrada);
  app.use(tratadorDeErros);
  return app;
}
