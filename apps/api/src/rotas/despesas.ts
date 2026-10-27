import { TIPOS_DESPESA, despesaCriarSchema, type TipoDespesa } from '@estacionafacil/shared';
import { Router, type Request } from 'express';
import type { Dependencias } from '../dependencias';
import { ErroHttp } from '../erros';
import { exigirLogin } from '../middlewares/exigirLogin';
import { criarDespesa, listarDespesas } from '../servicos/despesas';
import { validar } from '../validacao';
import { dataDaConsulta } from './pagamentos';

function tipoDaConsulta(req: Request): TipoDespesa | undefined {
  const valor = req.query['tipo'];
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || !(TIPOS_DESPESA as readonly string[]).includes(valor)) {
    throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os filtros.', {
      tipo: 'Tipo de despesa inválido',
    });
  }
  return valor as TipoDespesa;
}

export function criarRotasDespesas({ prisma }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin);

  rota.post('/', async (req, res) => {
    const entrada = validar(despesaCriarSchema, req.body);
    res.status(201).json(await criarDespesa(prisma, entrada, req.usuario!.id));
  });

  rota.get('/', async (req, res) => {
    const de = dataDaConsulta(req, 'de');
    const ate = dataDaConsulta(req, 'ate');
    const tipo = tipoDaConsulta(req);
    res.json(
      await listarDespesas(prisma, {
        ...(de ? { de } : {}),
        ...(ate ? { ate } : {}),
        ...(tipo ? { tipo } : {}),
      }),
    );
  });

  return rota;
}
