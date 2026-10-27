import {
  deCentavos,
  paraCentavos,
  type Categoria,
  type MensalistaItem,
  type ResumoSituacao,
  type Situacao,
  type TipoContrato,
  type VencimentosResposta,
} from '@estacionafacil/shared';
import type { PrismaClient } from '../prisma';
import { itensAtivos } from './mensalistas';

export function resumir(itens: MensalistaItem[]): ResumoSituacao {
  const centavos = itens.reduce((soma, i) => soma + paraCentavos(i.valor), 0);
  return { quantidade: itens.length, total: deCentavos(centavos) };
}

/**
 * Contratos ativos por vencimento. `categoria` e `tipo` valem para os totais e para a tabela;
 * `situacao` só filtra a tabela, para os totais seguirem mostrando as três situações.
 */
export async function montarVencimentos(
  prisma: PrismaClient,
  filtros: { situacao?: Situacao; categoria?: Categoria; tipo?: TipoContrato },
  hoje: string,
): Promise<VencimentosResposta> {
  const base = (await itensAtivos(prisma, hoje, filtros)).sort(
    (a, b) => a.vencimento.localeCompare(b.vencimento) || a.nome.localeCompare(b.nome, 'pt-BR'),
  );
  const por = (situacao: Situacao) => resumir(base.filter((i) => i.situacao === situacao));
  return {
    totais: { vencido: por('vencido'), a_vencer: por('a_vencer'), em_dia: por('em_dia') },
    itens: base.filter((i) => !filtros.situacao || i.situacao === filtros.situacao),
  };
}
