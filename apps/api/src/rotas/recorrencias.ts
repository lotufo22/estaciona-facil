import { recorrenciaAtualizarSchema } from '@estacionafacil/shared';
import { Router } from 'express';
import type { Dependencias } from '../dependencias';
import { exigirLogin } from '../middlewares/exigirLogin';
import { exigirPerfil } from '../middlewares/exigirPerfil';
import { atualizarRecorrencia, listarRecorrencias } from '../servicos/recorrencias';
import { validar } from '../validacao';
import { idDaRota } from './mensalistas';

export function criarRotasRecorrencias({ prisma }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin);

  rota.get('/', async (_req, res) => {
    res.json({ itens: await listarRecorrencias(prisma) });
  });

  rota.patch('/:id', exigirPerfil('proprietario'), async (req, res) => {
    const id = idDaRota(req);
    const { ativa } = validar(recorrenciaAtualizarSchema, req.body);
    res.json(await atualizarRecorrencia(prisma, id, ativa));
  });

  return rota;
}
