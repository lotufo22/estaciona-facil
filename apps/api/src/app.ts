import cookieParser from 'cookie-parser';
import express, { type Express } from 'express';
import helmet from 'helmet';
import { type Dependencias, registrarDependencias } from './dependencias';
import { rotaNaoEncontrada, tratadorDeErros } from './erros';
import { exigirCabecalhoApp } from './middlewares/exigirCabecalhoApp';
import type { PrismaClient } from './prisma';
import { criarRotasAuth } from './rotas/auth';
import { criarRotaCaixa } from './rotas/caixa';
import { criarRotasContratos } from './rotas/contratos';
import { criarRotasDespesas } from './rotas/despesas';
import { criarRotasMensalistas } from './rotas/mensalistas';
import { criarRotaPainel } from './rotas/painel';
import { criarRotasPagamentos } from './rotas/pagamentos';
import { criarRotasRecorrencias } from './rotas/recorrencias';
import { criarRotaSaude } from './rotas/saude';
import { criarRotasVencimentos } from './rotas/vencimentos';

/**
 * Monta o app sem abrir porta. O servidor local (`servidor.ts`) e a função da Netlify chamam esta
 * mesma função, então rodam o mesmo código.
 */
export function criarApp(deps: {
  prisma: PrismaClient;
  agora?: () => Date;
  /**
   * Liga o `trust proxy` do Express (1 salto). Atrás de um proxy, como a Netlify, o IP de quem chamou
   * vem em `X-Forwarded-For`; sem isso todos pareceriam ter o IP do proxy e o limite de tentativas
   * de login valeria para todo mundo junto.
   */
  confiarNoProxy?: boolean;
}): Express {
  const dependencias: Dependencias = {
    prisma: deps.prisma,
    agora: deps.agora ?? (() => new Date()),
  };

  const app = express();
  if (deps.confiarNoProxy) app.set('trust proxy', 1);
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
  api.use('/pagamentos', criarRotasPagamentos(dependencias));
  api.use('/despesas', criarRotasDespesas(dependencias));
  api.use('/recorrencias', criarRotasRecorrencias(dependencias));
  api.use('/vencimentos', criarRotasVencimentos(dependencias));
  api.use('/painel', criarRotaPainel(dependencias));
  api.use('/caixa', criarRotaCaixa(dependencias));
  app.use('/api', api);

  app.use(rotaNaoEncontrada);
  app.use(tratadorDeErros);
  return app;
}
