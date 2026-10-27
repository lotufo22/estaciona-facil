import {
  deCentavos,
  paraCentavos,
  proximoVencimento,
  type FormaPagamento,
  type PagamentoEntrada,
  type PagamentoItem,
  type PagamentosResposta,
  type RegistroPagamentoResposta,
} from '@estacionafacil/shared';
import { ErroHttp } from '../erros';
import type { PrismaClient } from '../prisma';
import { deData, paraData, type Transacao } from './mensalistas';

const pagamentoNaoEncontrado = () =>
  new ErroHttp(404, 'NAO_ENCONTRADO', 'Comprovante não encontrado.');

type PagamentoComRelacoes = NonNullable<Awaited<ReturnType<typeof buscarComRelacoes>>>;

function buscarComRelacoes(
  db: Transacao | PrismaClient,
  where: { id: number } | { chave: string },
) {
  const filtro = 'id' in where ? { id: where.id } : { chaveIdempotencia: where.chave };
  return db.pagamento.findUnique({
    where: filtro,
    include: { contrato: { include: { mensalista: true, veiculo: true } } },
  });
}

function paraItem(p: PagamentoComRelacoes): PagamentoItem {
  return {
    id: p.id,
    numero: p.id,
    mensalista: p.contrato.mensalista.nome,
    placa: p.contrato.veiculo.placa,
    valor: p.valor.toFixed(2),
    forma: p.forma,
    pagoEm: deData(p.pagoEm),
  };
}

/** Primeiro dia do mês de uma data `AAAA-MM-DD`. */
function primeiroDoMes(data: string): string {
  return `${data.slice(0, 7)}-01`;
}

/**
 * Registra o recebimento e avança o vencimento do contrato, tudo numa transação. Cada pagamento
 * cobre um mês (ou uma semana) a partir do vencimento atual, não a partir de hoje.
 *
 * Repetir a mesma `chave` devolve o resultado já registrado, sem novo pagamento. O contrato fica
 * travado (`FOR UPDATE`) durante a transação: pedidos simultâneos para ele passam um de cada vez,
 * então nenhum avanço de vencimento se perde e a segunda chamada com a mesma chave já enxerga a
 * primeira. Se mesmo assim a chave colidir no banco, devolve o registro que venceu.
 */
export async function registrarPagamento(
  prisma: PrismaClient,
  entrada: PagamentoEntrada,
  chave: string,
  usuarioId: number,
  agora: Date = new Date(),
): Promise<RegistroPagamentoResposta> {
  try {
    return await prisma.$transaction(async (tx) => {
      const travado = await tx.$queryRaw<{ id: number }[]>`
        SELECT id FROM contratos WHERE id = ${entrada.contratoId} FOR UPDATE`;
      if (travado.length === 0) {
        throw new ErroHttp(404, 'NAO_ENCONTRADO', 'Contrato não encontrado.');
      }

      const anterior = await buscarComRelacoes(tx, { chave });
      if (anterior) return respostaDeUmPagamentoExistente(anterior);

      const contrato = await tx.contrato.findUniqueOrThrow({ where: { id: entrada.contratoId } });
      if (contrato.status === 'encerrado') {
        throw new ErroHttp(409, 'CONTRATO_ENCERRADO', 'Este contrato já foi encerrado.');
      }

      const vencimentoAtual = deData(contrato.vencimento);
      const novoVencimento = proximoVencimento(
        vencimentoAtual,
        contrato.tipo,
        contrato.diaVencimento,
      );
      const criado = await tx.pagamento.create({
        data: {
          contratoId: contrato.id,
          valor: entrada.valor,
          forma: entrada.forma,
          pagoEm: paraData(entrada.pagoEm),
          mesReferencia: paraData(primeiroDoMes(vencimentoAtual)),
          registradoPor: usuarioId,
          chaveIdempotencia: chave,
        },
      });
      await tx.contrato.update({
        where: { id: contrato.id },
        data: { vencimento: paraData(novoVencimento) },
      });
      await tx.historicoContrato.create({
        data: {
          contratoId: contrato.id,
          evento: 'pagamento',
          em: agora,
          usuarioId,
          detalhes: `Comprovante nº ${criado.id}`,
        },
      });

      const completo = await buscarComRelacoes(tx, { id: criado.id });
      return { pagamento: paraItem(completo!), novoVencimento };
    });
  } catch (erro) {
    if ((erro as { code?: string } | null)?.code === 'P2002') {
      const existente = await buscarComRelacoes(prisma, { chave });
      if (existente) return respostaDeUmPagamentoExistente(existente);
    }
    throw erro;
  }
}

/**
 * Resposta para a chave repetida. O vencimento que o primeiro envio devolveu não fica gravado;
 * devolvemos o vencimento atual do contrato, que é o mesmo enquanto não houver outro pagamento.
 */
function respostaDeUmPagamentoExistente(p: PagamentoComRelacoes): RegistroPagamentoResposta {
  return { pagamento: paraItem(p), novoVencimento: deData(p.contrato.vencimento) };
}

export async function listarPagamentos(
  prisma: PrismaClient,
  filtros: { de?: string; ate?: string; forma?: FormaPagamento },
): Promise<PagamentosResposta> {
  const pagamentos = await prisma.pagamento.findMany({
    where: {
      ...(filtros.forma ? { forma: filtros.forma } : {}),
      ...(filtros.de || filtros.ate
        ? {
            pagoEm: {
              ...(filtros.de ? { gte: paraData(filtros.de) } : {}),
              ...(filtros.ate ? { lte: paraData(filtros.ate) } : {}),
            },
          }
        : {}),
    },
    orderBy: [{ pagoEm: 'desc' }, { id: 'desc' }],
    include: { contrato: { include: { mensalista: true, veiculo: true } } },
  });
  const itens = pagamentos.map(paraItem);
  const total = itens.reduce((soma, i) => soma + paraCentavos(i.valor), 0);
  return { itens, total: deCentavos(total) };
}

export async function comprovante(prisma: PrismaClient, id: number): Promise<PagamentoItem> {
  const pagamento = await buscarComRelacoes(prisma, { id });
  if (!pagamento) throw pagamentoNaoEncontrado();
  return paraItem(pagamento);
}
