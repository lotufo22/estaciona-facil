import { proximoVencimento, type MensalistaDetalhe } from '@estacionafacil/shared';
import { ErroHttp } from '../erros';
import type { PrismaClient } from '../prisma';
import { deData, detalheDoMensalista, paraData } from './mensalistas';

const contratoNaoEncontrado = () => new ErroHttp(404, 'NAO_ENCONTRADO', 'Contrato não encontrado.');
const contratoEncerrado = () =>
  new ErroHttp(409, 'CONTRATO_ENCERRADO', 'Este contrato já foi encerrado.');

/**
 * Estende o vencimento em `meses` meses, sem pagamento, e registra o motivo no histórico.
 * Cada mês avança a partir do vencimento atual (não de hoje), no dia do contrato.
 */
export async function renovarContrato(
  prisma: PrismaClient,
  contratoId: number,
  entrada: { meses: number; motivo: string },
  usuarioId: number,
  agora: Date,
): Promise<MensalistaDetalhe> {
  return prisma.$transaction(async (tx) => {
    const contrato = await tx.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) throw contratoNaoEncontrado();
    if (contrato.status === 'encerrado') throw contratoEncerrado();

    let vencimento = deData(contrato.vencimento);
    for (let i = 0; i < entrada.meses; i += 1) {
      vencimento = proximoVencimento(vencimento, 'mensal', contrato.diaVencimento);
    }
    await tx.contrato.update({
      where: { id: contratoId },
      data: { vencimento: paraData(vencimento) },
    });
    await tx.historicoContrato.create({
      data: { contratoId, evento: 'renovado', em: agora, usuarioId, detalhes: entrada.motivo },
    });
    return detalheDoMensalista(tx, contrato.mensalistaId, agora);
  });
}

/** Encerra o contrato. A vaga e a placa ficam livres porque só contratos ativos as ocupam. */
export async function encerrarContrato(
  prisma: PrismaClient,
  contratoId: number,
  usuarioId: number,
  agora: Date,
): Promise<MensalistaDetalhe> {
  return prisma.$transaction(async (tx) => {
    const contrato = await tx.contrato.findUnique({ where: { id: contratoId } });
    if (!contrato) throw contratoNaoEncontrado();
    // O filtro por status faz o encerramento valer uma única vez, mesmo com dois pedidos juntos.
    const { count } = await tx.contrato.updateMany({
      where: { id: contratoId, status: 'ativo' },
      data: { status: 'encerrado', encerradoEm: agora },
    });
    if (count === 0) throw contratoEncerrado();
    await tx.historicoContrato.create({
      data: { contratoId, evento: 'encerrado', em: agora, usuarioId },
    });
    return detalheDoMensalista(tx, contrato.mensalistaId, agora);
  });
}
