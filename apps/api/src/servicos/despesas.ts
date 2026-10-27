import {
  deCentavos,
  paraCentavos,
  type DespesaEntrada,
  type DespesasResposta,
  type TipoDespesa,
} from '@estacionafacil/shared';
import type { PrismaClient } from '../prisma';
import { deData, paraData } from './mensalistas';

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
  const itens = despesas.map((d) => ({
    id: d.id,
    descricao: d.descricao,
    valor: d.valor.toFixed(2),
    tipo: d.tipo,
    data: deData(d.data),
    registradoPor: d.usuario?.nome ?? null,
    recorrenciaId: d.recorrenciaId,
  }));
  const total = itens.reduce((soma, i) => soma + paraCentavos(i.valor), 0);
  return { itens, total: deCentavos(total) };
}
