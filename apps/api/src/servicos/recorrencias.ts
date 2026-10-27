import { ultimoDiaDoMes, type RecorrenciaItem } from '@estacionafacil/shared';
import { ErroHttp } from '../erros';
import type { PrismaClient } from '../prisma';
import { paraData } from './mensalistas';

type Recorrencia = {
  id: number;
  descricao: string;
  valor: { toFixed(casas: number): string };
  diaDoMes: number;
  ativa: boolean;
};

function paraItem(r: Recorrencia): RecorrenciaItem {
  return {
    id: r.id,
    descricao: r.descricao,
    valor: r.valor.toFixed(2),
    diaDoMes: r.diaDoMes,
    ativa: r.ativa,
  };
}

/** Todas as despesas fixas, inclusive as pausadas (a tela mostra o estado de cada uma). */
export async function listarRecorrencias(prisma: PrismaClient): Promise<RecorrenciaItem[]> {
  const recorrencias = await prisma.recorrenciaDespesa.findMany({ orderBy: { id: 'asc' } });
  return recorrencias.map(paraItem);
}

export async function atualizarRecorrencia(
  prisma: PrismaClient,
  id: number,
  ativa: boolean,
): Promise<RecorrenciaItem> {
  const existente = await prisma.recorrenciaDespesa.findUnique({ where: { id } });
  if (!existente) throw new ErroHttp(404, 'NAO_ENCONTRADO', 'Despesa fixa não encontrada.');
  return paraItem(await prisma.recorrenciaDespesa.update({ where: { id }, data: { ativa } }));
}

/**
 * Gera o lançamento do mês de `hoje` (`AAAA-MM-DD`) para cada despesa fixa ativa cujo dia já
 * chegou e que ainda não tem lançamento nessa competência. Devolve quantos criou.
 *
 * O dia efetivo é o dia configurado limitado ao último dia do mês (dia 31 cai em 28 ou 29 em
 * fevereiro). Rodar depois do dia ainda cria o lançamento, com a data do dia efetivo: é assim que o
 * sistema se recupera de um dia em que a função agendada não rodou.
 *
 * É idempotente: a unicidade `(recorrenciaId, competencia)` faz o banco ignorar o lançamento que já
 * existe, também quando duas execuções correm juntas.
 */
export async function gerarDespesasRecorrentes(
  prisma: PrismaClient,
  hoje: string,
): Promise<number> {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  const diaDeHoje = Number(hoje.slice(8, 10));
  const ultimoDia = ultimoDiaDoMes(ano, mes);
  const competencia = paraData(`${hoje.slice(0, 7)}-01`);

  const ativas = await prisma.recorrenciaDespesa.findMany({ where: { ativa: true } });
  const vencidas = ativas.filter((r) => Math.min(r.diaDoMes, ultimoDia) <= diaDeHoje);
  if (vencidas.length === 0) return 0;

  const { count } = await prisma.despesa.createMany({
    data: vencidas.map((r) => ({
      descricao: r.descricao,
      valor: r.valor,
      tipo: 'fixa' as const,
      data: paraData(
        `${hoje.slice(0, 7)}-${String(Math.min(r.diaDoMes, ultimoDia)).padStart(2, '0')}`,
      ),
      registradoPor: null,
      recorrenciaId: r.id,
      competencia,
    })),
    skipDuplicates: true,
  });
  return count;
}
