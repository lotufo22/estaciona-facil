import { filtrosCaixaSchema } from '@estacionafacil/shared';
import { Router } from 'express';
import type { Dependencias } from '../dependencias';
import { exigirLogin } from '../middlewares/exigirLogin';
import { exigirPerfil } from '../middlewares/exigirPerfil';
import { montarCaixa } from '../servicos/caixa';
import { validar } from '../validacao';
import { texto } from './mensalistas';

export function criarRotaCaixa({ prisma }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin, exigirPerfil('proprietario'));

  rota.get('/', async (req, res) => {
    // Parâmetro ausente ou vazio não entra no objeto, e o schema cobra os que são obrigatórios.
    const filtros = validar(
      filtrosCaixaSchema,
      Object.fromEntries(
        ['de', 'ate', 'tipo', 'categoria']
          .map((nome) => [nome, texto(req, nome)] as const)
          .filter(([, valor]) => valor !== undefined),
      ),
    );
    res.json(await montarCaixa(prisma, filtros));
  });

  return rota;
}
