import {
  deCentavos,
  paraCentavos,
  type CaixaResposta,
  type FiltrosCaixa,
  type FormaPagamento,
  type SerieMensalItem,
} from '@estacionafacil/shared';
import type { PrismaClient } from '../prisma';
import { deData, paraData } from './mensalistas';

/** Meses (`AAAA-MM`) de `de` até `ate`, inclusive. */
export function mesesDoPeriodo(de: string, ate: string): string[] {
  const meses: string[] = [];
  let ano = Number(de.slice(0, 4));
  let mes = Number(de.slice(5, 7));
  const ultimo = ate.slice(0, 7);
  for (;;) {
    const chave = `${ano}-${String(mes).padStart(2, '0')}`;
    if (chave > ultimo) return meses;
    meses.push(chave);
    mes += 1;
    if (mes > 12) {
      mes = 1;
      ano += 1;
    }
  }
}

const ORDEM_DAS_FORMAS: FormaPagamento[] = ['pix', 'dinheiro', 'debito', 'credito'];

interface Somas {
  /** Por mês (`AAAA-MM`), em centavos. */
  receitas: Map<string, number>;
  despesas: Map<string, number>;
  porForma: Map<FormaPagamento, number>;
}

/**
 * Receitas (por data de pagamento) e despesas (por data da despesa) de `de` a `ate`, somadas em
 * centavos inteiros: regime de caixa. O banco agrega por dia e forma; os meses são fechados aqui.
 * `tipo` e `categoria` valem só para as receitas, porque despesa não tem contrato nem veículo.
 */
export async function somarPeriodo(
  prisma: PrismaClient,
  { de, ate, tipo, categoria }: FiltrosCaixa,
): Promise<Somas> {
  const pagamentos = await prisma.pagamento.groupBy({
    by: ['pagoEm', 'forma'],
    where: {
      pagoEm: { gte: paraData(de), lte: paraData(ate) },
      ...(tipo || categoria
        ? {
            contrato: {
              ...(tipo ? { tipo } : {}),
              ...(categoria ? { veiculo: { categoria } } : {}),
            },
          }
        : {}),
    },
    _sum: { valor: true },
  });
  const despesas = await prisma.despesa.groupBy({
    by: ['data'],
    where: { data: { gte: paraData(de), lte: paraData(ate) } },
    _sum: { valor: true },
  });

  const somas: Somas = { receitas: new Map(), despesas: new Map(), porForma: new Map() };
  const somar = (mapa: Map<string, number>, chave: string, centavos: number) =>
    mapa.set(chave, (mapa.get(chave) ?? 0) + centavos);
  for (const p of pagamentos) {
    const centavos = paraCentavos(p._sum.valor?.toFixed(2) ?? '0.00');
    somar(somas.receitas, deData(p.pagoEm).slice(0, 7), centavos);
    somas.porForma.set(p.forma, (somas.porForma.get(p.forma) ?? 0) + centavos);
  }
  for (const d of despesas) {
    const centavos = paraCentavos(d._sum.valor?.toFixed(2) ?? '0.00');
    somar(somas.despesas, deData(d.data).slice(0, 7), centavos);
  }
  return somas;
}

export function serieDoPeriodo(somas: Somas, meses: string[]): SerieMensalItem[] {
  return meses.map((mes) => ({
    mes: `${mes}-01`,
    receitas: deCentavos(somas.receitas.get(mes) ?? 0),
    despesas: deCentavos(somas.despesas.get(mes) ?? 0),
  }));
}

const soma = (valores: Iterable<number>) => [...valores].reduce((total, v) => total + v, 0);

/**
 * Fluxo de caixa do período. Com filtro de tipo ou categoria, o resultado fica `null`: as
 * despesas não pertencem a contrato nem a categoria, então receitas filtradas menos despesas
 * inteiras seria um número enganoso.
 */
export async function montarCaixa(
  prisma: PrismaClient,
  filtros: FiltrosCaixa,
): Promise<CaixaResposta> {
  const somas = await somarPeriodo(prisma, filtros);
  const receitas = soma(somas.receitas.values());
  const despesas = soma(somas.despesas.values());
  const filtrado = Boolean(filtros.tipo || filtros.categoria);

  return {
    de: filtros.de,
    ate: filtros.ate,
    receitas: deCentavos(receitas),
    despesas: deCentavos(despesas),
    resultado: filtrado ? null : deCentavos(receitas - despesas),
    filtrado,
    serieMensal: serieDoPeriodo(somas, mesesDoPeriodo(filtros.de, filtros.ate)),
    porForma: ORDEM_DAS_FORMAS.filter((forma) => somas.porForma.has(forma)).map((forma) => ({
      forma,
      total: deCentavos(somas.porForma.get(forma) ?? 0),
    })),
  };
}
