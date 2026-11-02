import {
  deCentavos,
  hojeEmSaoPaulo,
  paraCentavos,
  proximoVencimento,
  vencimentoAnterior,
  type EstornoPagamentoResposta,
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
    estornado: p.estornadoEm !== null,
    estornadoEm: p.estornadoEm ? hojeEmSaoPaulo(p.estornadoEm) : null,
    motivoEstorno: p.motivoEstorno,
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
  if (entrada.pagoEm > hojeEmSaoPaulo(agora)) {
    throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os campos.', {
      pagoEm: 'A data do recebimento não pode ser futura',
    });
  }
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

/**
 * Estorna o recebimento mais recente ainda válido do contrato: marca o lançamento (nada é apagado),
 * devolve o vencimento do contrato um passo e registra o evento no histórico. O contrato fica
 * travado como no pagamento: dois estornos simultâneos passam um de cada vez, e o segundo já
 * enxerga o primeiro (`JA_ESTORNADO`).
 */
export async function estornarPagamento(
  prisma: PrismaClient,
  id: number,
  motivo: string,
  usuarioId: number,
  agora: Date = new Date(),
): Promise<EstornoPagamentoResposta> {
  return prisma.$transaction(async (tx) => {
    const encontrado = await tx.pagamento.findUnique({
      where: { id },
      select: { contratoId: true },
    });
    if (!encontrado) throw pagamentoNaoEncontrado();
    await tx.$queryRaw`SELECT id FROM contratos WHERE id = ${encontrado.contratoId} FOR UPDATE`;

    // Relê com o contrato travado: um estorno concorrente que terminou antes já aparece aqui.
    const pagamento = await buscarComRelacoes(tx, { id });
    if (!pagamento) throw pagamentoNaoEncontrado();
    if (pagamento.estornadoEm) {
      throw new ErroHttp(409, 'JA_ESTORNADO', 'Este recebimento já foi estornado.');
    }
    const maisRecente = await tx.pagamento.findFirst({
      where: { contratoId: pagamento.contratoId, estornadoEm: null, id: { gt: id } },
      orderBy: { id: 'desc' },
    });
    if (maisRecente) {
      throw new ErroHttp(
        409,
        'ESTORNO_FORA_DE_ORDEM',
        `Estorne primeiro o recebimento nº ${maisRecente.id}, o mais recente deste contrato.`,
      );
    }

    const contrato = pagamento.contrato;
    const novoVencimento = vencimentoAnterior(
      deData(contrato.vencimento),
      contrato.tipo,
      contrato.diaVencimento,
    );
    await tx.pagamento.update({
      where: { id },
      data: { estornadoEm: agora, estornadoPor: usuarioId, motivoEstorno: motivo },
    });
    await tx.contrato.update({
      where: { id: contrato.id },
      data: { vencimento: paraData(novoVencimento) },
    });
    await tx.historicoContrato.create({
      data: {
        contratoId: contrato.id,
        evento: 'estornado',
        em: agora,
        usuarioId,
        detalhes: `Comprovante nº ${id} estornado: ${motivo}`,
      },
    });

    const completo = await buscarComRelacoes(tx, { id });
    return { pagamento: paraItem(completo!), novoVencimento };
  });
}

export async function listarPagamentos(
  prisma: PrismaClient,
  filtros: {
    de?: string;
    ate?: string;
    forma?: FormaPagamento;
    limite?: number;
    /** Tira os estornados dos itens (o `total` nunca os soma). */
    apenasValidos?: boolean;
  },
): Promise<PagamentosResposta> {
  const pagamentos = await prisma.pagamento.findMany({
    where: {
      ...(filtros.apenasValidos ? { estornadoEm: null } : {}),
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
    ...(filtros.limite ? { take: filtros.limite } : {}),
    include: { contrato: { include: { mensalista: true, veiculo: true } } },
  });
  const itens = pagamentos.map(paraItem);
  const total = itens
    .filter((i) => !i.estornado)
    .reduce((soma, i) => soma + paraCentavos(i.valor), 0);
  return { itens, total: deCentavos(total) };
}

export async function comprovante(prisma: PrismaClient, id: number): Promise<PagamentoItem> {
  const pagamento = await buscarComRelacoes(prisma, { id });
  if (!pagamento) throw pagamentoNaoEncontrado();
  return paraItem(pagamento);
}
