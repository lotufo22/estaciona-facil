import {
  CATEGORIAS,
  TIPOS_CONTRATO,
  mensalistaAtualizarSchema,
  mensalistaCriarSchema,
  type Categoria,
  type Situacao,
  type TipoContrato,
} from '@estacionafacil/shared';
import { Router, type Request } from 'express';
import type { Dependencias } from '../dependencias';
import { ErroHttp } from '../erros';
import { exigirLogin } from '../middlewares/exigirLogin';
import { exigirPerfil } from '../middlewares/exigirPerfil';
import {
  atualizarMensalista,
  criarMensalista,
  detalheDoMensalista,
  listarMensalistas,
  type FiltrosLista,
} from '../servicos/mensalistas';
import { validar } from '../validacao';

const SITUACOES: readonly Situacao[] = ['em_dia', 'a_vencer', 'vencido'];

/** Id numérico da URL; qualquer outra coisa não pode existir, então é 404. */
export function idDaRota(req: Request, parametro = 'id'): number {
  const id = Number(req.params[parametro]);
  if (!Number.isInteger(id) || id < 1) {
    throw new ErroHttp(404, 'NAO_ENCONTRADO', 'Não encontrado.');
  }
  return id;
}

function texto(req: Request, nome: string): string | undefined {
  const valor = req.query[nome];
  return typeof valor === 'string' && valor !== '' ? valor : undefined;
}

function escolha<T extends string>(
  req: Request,
  nome: string,
  validos: readonly T[],
): T | undefined {
  const valor = texto(req, nome);
  if (valor === undefined) return undefined;
  if (!(validos as readonly string[]).includes(valor)) {
    throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os filtros.', {
      [nome]: 'Valor inválido',
    });
  }
  return valor as T;
}

function inteiro(req: Request, nome: string): number | undefined {
  const valor = texto(req, nome);
  if (valor === undefined) return undefined;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < 1) {
    throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os filtros.', { [nome]: 'Valor inválido' });
  }
  return numero;
}

function filtrosDaConsulta(req: Request): FiltrosLista {
  const busca = texto(req, 'busca');
  const situacao = escolha<Situacao>(req, 'situacao', SITUACOES);
  const categoria = escolha<Categoria>(req, 'categoria', CATEGORIAS);
  const tipo = escolha<TipoContrato>(req, 'tipo', TIPOS_CONTRATO);
  const contrato = inteiro(req, 'contrato');
  return {
    pagina: inteiro(req, 'pagina') ?? 1,
    ...(busca ? { busca } : {}),
    ...(situacao ? { situacao } : {}),
    ...(categoria ? { categoria } : {}),
    ...(tipo ? { tipo } : {}),
    ...(contrato ? { contrato } : {}),
  };
}

export function criarRotasMensalistas({ prisma, agora }: Dependencias): Router {
  const rota = Router();

  rota.get('/', exigirLogin, async (req, res) => {
    res.json(await listarMensalistas(prisma, filtrosDaConsulta(req), agora()));
  });

  rota.post('/', exigirLogin, exigirPerfil('proprietario'), async (req, res) => {
    const dados = validar(mensalistaCriarSchema, req.body);
    const criado = await criarMensalista(prisma, dados, req.usuario!.id, agora());
    res.status(201).json(criado);
  });

  rota.get('/:id', exigirLogin, async (req, res) => {
    res.json(await detalheDoMensalista(prisma, idDaRota(req), agora()));
  });

  rota.patch('/:id', exigirLogin, exigirPerfil('proprietario'), async (req, res) => {
    const id = idDaRota(req);
    const dados = validar(mensalistaAtualizarSchema, req.body);
    res.json(await atualizarMensalista(prisma, id, dados, agora()));
  });

  return rota;
}
