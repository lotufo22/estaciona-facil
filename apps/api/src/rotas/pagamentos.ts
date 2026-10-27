import {
  FORMAS_PAGAMENTO,
  pagamentoCriarSchema,
  type FormaPagamento,
} from '@estacionafacil/shared';
import { Router, type Request } from 'express';
import type { Dependencias } from '../dependencias';
import { ErroHttp } from '../erros';
import { exigirLogin } from '../middlewares/exigirLogin';
import { comprovante, listarPagamentos, registrarPagamento } from '../servicos/pagamentos';
import { validar } from '../validacao';
import { idDaRota } from './mensalistas';

const TAMANHO_MAXIMO_DA_CHAVE = 200;

/** Cabeçalho `Idempotency-Key`: obrigatório, para clique duplo ou rede lenta não pagarem duas vezes. */
function chaveDeIdempotencia(req: Request): string {
  const chave = req.get('Idempotency-Key')?.trim();
  if (!chave || chave.length > TAMANHO_MAXIMO_DA_CHAVE) {
    throw new ErroHttp(
      400,
      'CHAVE_IDEMPOTENCIA_AUSENTE',
      'Não foi possível identificar o envio. Tente de novo.',
    );
  }
  return chave;
}

export function dataDaConsulta(req: Request, nome: 'de' | 'ate'): string | undefined {
  const valor = req.query[nome];
  if (valor === undefined || valor === '') return undefined;
  const valida =
    typeof valor === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(valor) &&
    new Date(`${valor}T00:00:00Z`).toISOString().startsWith(valor);
  if (!valida) {
    throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os filtros.', {
      [nome]: 'Data inválida. Use o formato AAAA-MM-DD',
    });
  }
  return valor;
}

function formaDaConsulta(req: Request): FormaPagamento | undefined {
  const valor = req.query['forma'];
  if (valor === undefined || valor === '') return undefined;
  if (typeof valor !== 'string' || !(FORMAS_PAGAMENTO as readonly string[]).includes(valor)) {
    throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os filtros.', {
      forma: 'Forma de pagamento inválida',
    });
  }
  return valor as FormaPagamento;
}

export function criarRotasPagamentos({ prisma, agora }: Dependencias): Router {
  const rota = Router();
  rota.use(exigirLogin);

  rota.post('/', async (req, res) => {
    const chave = chaveDeIdempotencia(req);
    const entrada = validar(pagamentoCriarSchema, req.body);
    res
      .status(201)
      .json(await registrarPagamento(prisma, entrada, chave, req.usuario!.id, agora()));
  });

  rota.get('/', async (req, res) => {
    const de = dataDaConsulta(req, 'de');
    const ate = dataDaConsulta(req, 'ate');
    const forma = formaDaConsulta(req);
    res.json(
      await listarPagamentos(prisma, {
        ...(de ? { de } : {}),
        ...(ate ? { ate } : {}),
        ...(forma ? { forma } : {}),
      }),
    );
  });

  rota.get('/:id', async (req, res) => {
    res.json(await comprovante(prisma, idDaRota(req)));
  });

  return rota;
}
