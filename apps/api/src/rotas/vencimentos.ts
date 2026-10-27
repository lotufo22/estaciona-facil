import {
  CATEGORIAS,
  TIPOS_CONTRATO,
  hojeEmSaoPaulo,
  type Categoria,
  type Situacao,
  type TipoContrato,
} from '@estacionafacil/shared';
import { Router } from 'express';
import type { Dependencias } from '../dependencias';
import { exigirLogin } from '../middlewares/exigirLogin';
import { exigirPerfil } from '../middlewares/exigirPerfil';
import { montarVencimentos } from '../servicos/vencimentos';
import { escolha } from './mensalistas';

const SITUACOES: readonly Situacao[] = ['em_dia', 'a_vencer', 'vencido'];

export function criarRotasVencimentos({ prisma, agora }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin, exigirPerfil('proprietario'));

  rota.get('/', async (req, res) => {
    const situacao = escolha<Situacao>(req, 'situacao', SITUACOES);
    const categoria = escolha<Categoria>(req, 'categoria', CATEGORIAS);
    const tipo = escolha<TipoContrato>(req, 'tipo', TIPOS_CONTRATO);
    res.json(
      await montarVencimentos(
        prisma,
        {
          ...(situacao ? { situacao } : {}),
          ...(categoria ? { categoria } : {}),
          ...(tipo ? { tipo } : {}),
        },
        hojeEmSaoPaulo(agora()),
      ),
    );
  });

  return rota;
}
