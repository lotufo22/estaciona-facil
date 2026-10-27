import { Router } from 'express';
import type { Dependencias } from '../dependencias';

/** `GET /api/saude`: responde 200 só se o banco também responde. Público (spec, seção 6). */
export function criarRotaSaude({ prisma }: Dependencias): Router {
  const rota = Router();
  rota.get('/', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  });
  return rota;
}
