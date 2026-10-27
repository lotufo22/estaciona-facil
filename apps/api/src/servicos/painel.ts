import {
  deCentavos,
  paraCentavos,
  ultimoDiaDoMes,
  type PainelResposta,
} from '@estacionafacil/shared';
import type { PrismaClient } from '../prisma';
import { mesesDoPeriodo, serieDoPeriodo, somarPeriodo } from './caixa';
import { itensAtivos } from './mensalistas';
import { listarPagamentos } from './pagamentos';
import { resumir } from './vencimentos';

const MESES_NO_GRAFICO = 6;
/** São Paulo fica 3 horas atrás de UTC o ano todo (sem horário de verão desde 2019). */
const DESLOCAMENTO_DE_SP = 'T03:00:00.000Z';

function mesAnterior(mes: string, quantos: number): string {
  let ano = Number(mes.slice(0, 4));
  let numero = Number(mes.slice(5, 7)) - quantos;
  while (numero < 1) {
    numero += 12;
    ano -= 1;
  }
  return `${ano}-${String(numero).padStart(2, '0')}`;
}

function mesSeguinte(mes: string): string {
  const ano = Number(mes.slice(0, 4));
  const numero = Number(mes.slice(5, 7));
  return numero === 12 ? `${ano + 1}-01` : `${ano}-${String(numero + 1).padStart(2, '0')}`;
}

/** Tudo o que o Painel mostra, para a data `hoje` (`AAAA-MM-DD`, em São Paulo). */
export async function montarPainel(prisma: PrismaClient, hoje: string): Promise<PainelResposta> {
  const mes = hoje.slice(0, 7);
  const itens = await itensAtivos(prisma, hoje);
  const por = (situacao: 'em_dia' | 'a_vencer' | 'vencido') =>
    itens.filter((i) => i.situacao === situacao);

  // Contratos criados neste mês (o mês de São Paulo começa às 03:00 UTC do dia 1).
  const novosNoMes = await prisma.historicoContrato.count({
    where: {
      evento: 'criado',
      em: {
        gte: new Date(`${mes}-01${DESLOCAMENTO_DE_SP}`),
        lt: new Date(`${mesSeguinte(mes)}-01${DESLOCAMENTO_DE_SP}`),
      },
    },
  });

  const meses = mesesDoPeriodo(mesAnterior(mes, MESES_NO_GRAFICO - 1), mes);
  const somas = await somarPeriodo(prisma, {
    de: `${meses[0]}-01`,
    ate: `${mes}-${String(ultimoDiaDoMes(Number(mes.slice(0, 4)), Number(mes.slice(5, 7))))}`,
  });
  const serieMensal = serieDoPeriodo(somas, meses);

  const resultadoDe = (m: { receitas: string; despesas: string }) =>
    paraCentavos(m.receitas) - paraCentavos(m.despesas);
  const atual = serieMensal[serieMensal.length - 1]!;
  const anterior = serieMensal[serieMensal.length - 2];
  const resultado = resultadoDe(atual);
  const resultadoAnterior = anterior ? resultadoDe(anterior) : 0;

  return {
    mensalistasAtivos: itens.length,
    novosNoMes,
    vencidos: resumir(por('vencido')),
    aVencer: resumir(por('a_vencer')),
    resultadoDoMes: {
      receitas: atual.receitas,
      despesas: atual.despesas,
      resultado: deCentavos(resultado),
      // Mês anterior zerado não tem base de comparação.
      variacao:
        resultadoAnterior === 0
          ? null
          : Math.round(((resultado - resultadoAnterior) / Math.abs(resultadoAnterior)) * 100),
    },
    serieMensal,
    situacao: {
      emDia: por('em_dia').length,
      aVencer: por('a_vencer').length,
      vencido: por('vencido').length,
    },
    ultimosRecebimentos: (await listarPagamentos(prisma, { limite: 5 })).itens,
  };
}
