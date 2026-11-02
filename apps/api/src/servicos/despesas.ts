import {
  deCentavos,
  hojeEmSaoPaulo,
  paraCentavos,
  type DespesaEntrada,
  type DespesaItem,
  type DespesasResposta,
  type TipoDespesa,
} from '@estacionafacil/shared';
import { ErroHttp } from '../erros';
import type { PrismaClient } from '../prisma';
import { deData, paraData } from './mensalistas';

type DespesaComUsuario = NonNullable<Awaited<ReturnType<PrismaClient['despesa']['findFirst']>>> & {
  usuario: { nome: string } | null;
};

function paraItem(d: DespesaComUsuario): DespesaItem {
  return {
    id: d.id,
    descricao: d.descricao,
    valor: d.valor.toFixed(2),
    tipo: d.tipo,
    data: deData(d.data),
    registradoPor: d.usuario?.nome ?? null,
    recorrenciaId: d.recorrenciaId,
    estornado: d.estornadoEm !== null,
    estornadoEm: d.estornadoEm ? hojeEmSaoPaulo(d.estornadoEm) : null,
    motivoEstorno: d.motivoEstorno,
  };
}

/**
 * Estorna a despesa: ela continua na lista, marcada, mas sai das somas. A despesa fixa já gerada
 * mantém a `competencia`, então a geração mensal não a cria de novo.
 */
export async function estornarDespesa(
  prisma: PrismaClient,
  id: number,
  motivo: string,
  usuarioId: number,
  agora: Date = new Date(),
): Promise<DespesaItem> {
  return prisma.$transaction(async (tx) => {
    // Atualização condicional: de dois estornos simultâneos, só um encontra `estornadoEm` nulo.
    const { count } = await tx.despesa.updateMany({
      where: { id, estornadoEm: null },
      data: { estornadoEm: agora, estornadoPor: usuarioId, motivoEstorno: motivo },
    });
    const despesa = await tx.despesa.findUnique({ where: { id }, include: { usuario: true } });
    if (!despesa) throw new ErroHttp(404, 'NAO_ENCONTRADO', 'Despesa não encontrada.');
    if (count === 0) throw new ErroHttp(409, 'JA_ESTORNADO', 'Esta despesa já foi estornada.');
    return paraItem(despesa);
  });
}

/**
 * Lança uma despesa. A fixa nasce com a recorrência que a repete nos meses seguintes, e o
 * lançamento do mês do cadastro fica ligado a ela pela `competencia` (1º dia do mês da data):
 * assim a geração mensal não cria um segundo lançamento para o mesmo mês.
 */
export async function criarDespesa(
  prisma: PrismaClient,
  entrada: DespesaEntrada,
  usuarioId: number,
): Promise<{ despesaId: number; recorrenciaId: number | null }> {
  return prisma.$transaction(async (tx) => {
    const fixa = entrada.tipo === 'fixa' && entrada.diaDoMes !== undefined;
    const recorrencia = fixa
      ? await tx.recorrenciaDespesa.create({
          data: {
            descricao: entrada.descricao,
            valor: entrada.valor,
            diaDoMes: entrada.diaDoMes!,
          },
        })
      : null;
    const despesa = await tx.despesa.create({
      data: {
        descricao: entrada.descricao,
        valor: entrada.valor,
        tipo: entrada.tipo,
        data: paraData(entrada.data),
        registradoPor: usuarioId,
        ...(recorrencia
          ? {
              recorrenciaId: recorrencia.id,
              competencia: paraData(`${entrada.data.slice(0, 7)}-01`),
            }
          : {}),
      },
    });
    return { despesaId: despesa.id, recorrenciaId: recorrencia?.id ?? null };
  });
}

export async function listarDespesas(
  prisma: PrismaClient,
  filtros: { de?: string; ate?: string; tipo?: TipoDespesa },
): Promise<DespesasResposta> {
  const despesas = await prisma.despesa.findMany({
    where: {
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.de || filtros.ate
        ? {
            data: {
              ...(filtros.de ? { gte: paraData(filtros.de) } : {}),
              ...(filtros.ate ? { lte: paraData(filtros.ate) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ data: 'desc' }, { id: 'desc' }],
    include: { usuario: true },
  });
  const itens = despesas.map(paraItem);
  const total = itens
    .filter((i) => !i.estornado)
    .reduce((soma, i) => soma + paraCentavos(i.valor), 0);
  return { itens, total: deCentavos(total) };
}
