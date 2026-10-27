import { hojeEmSaoPaulo } from '@estacionafacil/shared';
import { Router } from 'express';
import type { Dependencias } from '../dependencias';
import { exigirLogin } from '../middlewares/exigirLogin';
import { exigirPerfil } from '../middlewares/exigirPerfil';
import { montarPainel } from '../servicos/painel';

export function criarRotaPainel({ prisma, agora }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin, exigirPerfil('proprietario'));

  rota.get('/', async (_req, res) => {
    res.json(await montarPainel(prisma, hojeEmSaoPaulo(agora())));
  });

  return rota;
}
