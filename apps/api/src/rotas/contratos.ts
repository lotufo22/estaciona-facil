import { renovacaoSchema } from '@estacionafacil/shared';
import { Router } from 'express';
import type { Dependencias } from '../dependencias';
import { exigirLogin } from '../middlewares/exigirLogin';
import { exigirPerfil } from '../middlewares/exigirPerfil';
import { encerrarContrato, renovarContrato } from '../servicos/contratos';
import { validar } from '../validacao';
import { idDaRota } from './mensalistas';

export function criarRotasContratos({ prisma, agora }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin, exigirPerfil('proprietario'));

  rota.post('/:id/renovacao', async (req, res) => {
    const id = idDaRota(req);
    const entrada = validar(renovacaoSchema, req.body);
    res.json(await renovarContrato(prisma, id, entrada, req.usuario!.id, agora()));
  });

  rota.post('/:id/encerramento', async (req, res) => {
    const id = idDaRota(req);
    res.json(await encerrarContrato(prisma, id, req.usuario!.id, agora()));
  });

  return rota;
}
