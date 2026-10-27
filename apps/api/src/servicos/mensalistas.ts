import {
  adicionarDias,
  hojeEmSaoPaulo,
  normalizarPlaca,
  proximoVencimento,
  situacaoDoContrato,
  type Categoria,
  type ContratoDetalhe,
  type ListaMensalistasResposta,
  type MensalistaAtualizarEntrada,
  type MensalistaCriarEntrada,
  type MensalistaDetalhe,
  type MensalistaItem,
  type Situacao,
  type TipoContrato,
} from '@estacionafacil/shared';
import { ErroHttp } from '../erros';
import type { PrismaClient } from '../prisma';

export const POR_PAGINA = 10;

/** Cliente dentro de `$transaction`: tem as consultas, não tem `$transaction`/`$connect`. */
export type Transacao = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/** `AAAA-MM-DD` -> Date em UTC, que é como o Prisma grava colunas DATE. */
export function paraData(texto: string): Date {
  return new Date(`${texto}T00:00:00.000Z`);
}

/** Coluna DATE -> `AAAA-MM-DD`. */
export function deData(data: Date): string {
  return data.toISOString().slice(0, 10);
}

const erroPlaca = () =>
  new ErroHttp(409, 'PLACA_JA_CADASTRADA', 'Esta placa já tem contrato ativo.', {
    placa: 'Esta placa já tem contrato ativo',
  });
const erroVagaOcupada = () =>
  new ErroHttp(409, 'VAGA_OCUPADA', 'Esta vaga já está ocupada.', {
    vaga: 'Esta vaga já está ocupada',
  });
const erroVagaInvalida = (mensagem: string) =>
  new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os campos.', { vaga: mensagem });

export const mensalistaNaoEncontrado = () =>
  new ErroHttp(404, 'NAO_ENCONTRADO', 'Mensalista não encontrado.');

/**
 * Corrida entre dois pedidos: as checagens abaixo passam nos dois, e o banco barra o segundo
 * pelos índices únicos parciais. Converte essa violação no mesmo 409 que a checagem daria.
 */
function traduzirViolacao(erro: unknown): never {
  const texto = `${(erro as Error | null)?.message ?? ''} ${JSON.stringify((erro as { meta?: unknown } | null)?.meta ?? '')}`;
  if ((erro as { code?: string } | null)?.code === 'P2002') {
    if (texto.includes('por_vaga')) throw erroVagaOcupada();
    if (texto.includes('por_veiculo') || texto.includes('placa')) throw erroPlaca();
  }
  throw erro;
}

/** Vaga pelo código (sem diferenciar maiúsculas), conferindo existência, categoria e ocupação. */
async function vagaLivre(
  tx: Transacao,
  codigo: string,
  categoria: Categoria,
  contratoAtualId?: number,
) {
  const vaga = await tx.vaga.findFirst({
    where: { codigo: { equals: codigo, mode: 'insensitive' } },
  });
  if (!vaga) throw erroVagaInvalida('Essa vaga não existe');
  if (vaga.categoria !== categoria) {
    throw erroVagaInvalida(`Essa vaga é de ${vaga.categoria}, não de ${categoria}`);
  }
  const ocupante = await tx.contrato.findFirst({
    where: {
      vagaId: vaga.id,
      status: 'ativo',
      ...(contratoAtualId ? { id: { not: contratoAtualId } } : {}),
    },
  });
  if (ocupante) throw erroVagaOcupada();
  return vaga;
}

export async function criarMensalista(
  prisma: PrismaClient,
  dados: MensalistaCriarEntrada,
  usuarioId: number,
  agora: Date = new Date(),
): Promise<{ mensalistaId: number; contratoId: number }> {
  try {
    return await prisma.$transaction(async (tx) => {
      const existente = await tx.veiculo.findUnique({
        where: { placa: dados.placa },
        include: { contratos: { where: { status: 'ativo' } } },
      });
      if (existente && existente.contratos.length > 0) throw erroPlaca();

      const vaga = dados.vaga ? await vagaLivre(tx, dados.vaga, dados.categoria) : null;
      const mensalista = await tx.mensalista.create({
        data: { nome: dados.nome, telefone: dados.telefone },
      });
      // Placa de contrato já encerrado volta a ser usada: o veículo é reaproveitado (a placa é única).
      const veiculo = existente
        ? await tx.veiculo.update({
            where: { id: existente.id },
            data: { mensalistaId: mensalista.id, categoria: dados.categoria },
          })
        : await tx.veiculo.create({
            data: {
              mensalistaId: mensalista.id,
              placa: dados.placa,
              categoria: dados.categoria,
            },
          });

      const vencimento =
        dados.tipo === 'semanal'
          ? adicionarDias(dados.inicio, 7)
          : proximoVencimento(dados.inicio, 'mensal', dados.diaVencimento);
      const contrato = await tx.contrato.create({
        data: {
          mensalistaId: mensalista.id,
          veiculoId: veiculo.id,
          vagaId: vaga?.id ?? null,
          tipo: dados.tipo,
          valor: dados.valor,
          diaVencimento: dados.diaVencimento,
          inicio: paraData(dados.inicio),
          vencimento: paraData(vencimento),
        },
      });
      await tx.historicoContrato.create({
        data: { contratoId: contrato.id, evento: 'criado', em: agora, usuarioId },
      });
      return { mensalistaId: mensalista.id, contratoId: contrato.id };
    });
  } catch (erro) {
    return traduzirViolacao(erro);
  }
}

export interface FiltrosLista {
  busca?: string;
  situacao?: Situacao;
  categoria?: Categoria;
  tipo?: TipoContrato;
  contrato?: number;
  pagina: number;
}

/**
 * Contratos ativos de mensalistas não arquivados, já no formato da lista, com a situação calculada
 * para `hoje`. Serve a lista de mensalistas, a de vencimentos e o painel: as três falam do mesmo
 * conjunto. São poucas dezenas, então o que o banco não filtra é filtrado em memória.
 */
export async function itensAtivos(
  prisma: PrismaClient,
  hoje: string,
  filtros: { tipo?: TipoContrato; categoria?: Categoria; contrato?: number } = {},
): Promise<MensalistaItem[]> {
  const contratos = await prisma.contrato.findMany({
    where: {
      status: 'ativo',
      mensalista: { arquivadoEm: null },
      ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
      ...(filtros.contrato ? { id: filtros.contrato } : {}),
      ...(filtros.categoria ? { veiculo: { categoria: filtros.categoria } } : {}),
    },
    include: { mensalista: true, veiculo: true, vaga: true },
  });
  return contratos.map((c) => ({
    id: c.mensalistaId,
    contratoId: c.id,
    nome: c.mensalista.nome,
    telefone: c.mensalista.telefone,
    placa: c.veiculo.placa,
    categoria: c.veiculo.categoria,
    vaga: c.vaga?.codigo ?? null,
    vencimento: deData(c.vencimento),
    valor: c.valor.toFixed(2),
    situacao: situacaoDoContrato(deData(c.vencimento), hoje),
  }));
}

/** Mensalistas com contrato ativo. */
export async function listarMensalistas(
  prisma: PrismaClient,
  filtros: FiltrosLista,
  agora: Date,
): Promise<ListaMensalistasResposta> {
  const hoje = hojeEmSaoPaulo(agora);
  const busca = filtros.busca?.trim().toLowerCase() ?? '';
  const placaBuscada = normalizarPlaca(busca);

  const itens: MensalistaItem[] = (await itensAtivos(prisma, hoje, filtros))
    .filter(
      (i) =>
        !busca ||
        i.nome.toLowerCase().includes(busca) ||
        (placaBuscada.length >= 3 && i.placa.includes(placaBuscada)),
    )
    .filter((i) => !filtros.situacao || i.situacao === filtros.situacao)
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  return {
    itens: itens.slice((filtros.pagina - 1) * POR_PAGINA, filtros.pagina * POR_PAGINA),
    total: itens.length,
    pagina: filtros.pagina,
    porPagina: POR_PAGINA,
  };
}

/** Contrato atual do mensalista: o ativo, ou o mais recente se todos estiverem encerrados. */
async function contratoAtual(db: Transacao | PrismaClient, mensalistaId: number) {
  return db.contrato.findFirst({
    where: { mensalistaId },
    orderBy: [{ status: 'asc' }, { id: 'desc' }], // 'ativo' vem antes de 'encerrado'
    include: { vaga: true },
  });
}

export async function detalheDoMensalista(
  db: Transacao | PrismaClient,
  mensalistaId: number,
  agora: Date,
): Promise<MensalistaDetalhe> {
  const mensalista = await db.mensalista.findUnique({ where: { id: mensalistaId } });
  const contrato = mensalista ? await contratoAtual(db, mensalistaId) : null;
  if (!mensalista || !contrato) throw mensalistaNaoEncontrado();

  const veiculo = await db.veiculo.findUniqueOrThrow({ where: { id: contrato.veiculoId } });
  const historico = await db.historicoContrato.findMany({
    where: { contratoId: contrato.id },
    orderBy: [{ em: 'desc' }, { id: 'desc' }],
    include: { usuario: true },
  });

  const detalheDoContrato: ContratoDetalhe = {
    id: contrato.id,
    tipo: contrato.tipo,
    valor: contrato.valor.toFixed(2),
    diaVencimento: contrato.diaVencimento,
    inicio: deData(contrato.inicio),
    vencimento: deData(contrato.vencimento),
    vaga: contrato.vaga?.codigo ?? null,
    status: contrato.status,
    encerradoEm: contrato.encerradoEm ? hojeEmSaoPaulo(contrato.encerradoEm) : null,
    situacao: situacaoDoContrato(deData(contrato.vencimento), hojeEmSaoPaulo(agora)),
  };
  return {
    id: mensalista.id,
    nome: mensalista.nome,
    telefone: mensalista.telefone,
    placa: veiculo.placa,
    categoria: veiculo.categoria,
    contrato: detalheDoContrato,
    historico: historico.map((h) => ({
      id: h.id,
      evento: h.evento,
      em: hojeEmSaoPaulo(h.em),
      detalhes: h.detalhes,
      usuario: h.usuario?.nome ?? null,
    })),
  };
}

export async function atualizarMensalista(
  prisma: PrismaClient,
  mensalistaId: number,
  dados: MensalistaAtualizarEntrada,
  agora: Date,
): Promise<MensalistaDetalhe> {
  try {
    return await prisma.$transaction(async (tx) => {
      const mensalista = await tx.mensalista.findUnique({ where: { id: mensalistaId } });
      const contrato = mensalista ? await contratoAtual(tx, mensalistaId) : null;
      if (!mensalista || !contrato) throw mensalistaNaoEncontrado();
      if (contrato.status === 'encerrado') {
        throw new ErroHttp(409, 'CONTRATO_ENCERRADO', 'Este contrato já foi encerrado.');
      }
      const veiculo = await tx.veiculo.findUniqueOrThrow({ where: { id: contrato.veiculoId } });

      if (dados.placa !== undefined && dados.placa !== veiculo.placa) {
        // Qualquer outro veículo com esta placa (mesmo de contrato encerrado) já a ocupa na tabela.
        const outro = await tx.veiculo.findUnique({ where: { placa: dados.placa } });
        if (outro) throw erroPlaca();
        await tx.veiculo.update({ where: { id: veiculo.id }, data: { placa: dados.placa } });
      }
      if (dados.telefone !== undefined) {
        await tx.mensalista.update({
          where: { id: mensalistaId },
          data: { telefone: dados.telefone },
        });
      }
      const mudancas: { vagaId?: number | null; valor?: string } = {};
      if (dados.vaga !== undefined) {
        mudancas.vagaId =
          dados.vaga === null
            ? null
            : (await vagaLivre(tx, dados.vaga, veiculo.categoria, contrato.id)).id;
      }
      if (dados.valor !== undefined) mudancas.valor = dados.valor;
      if (Object.keys(mudancas).length > 0) {
        await tx.contrato.update({ where: { id: contrato.id }, data: mudancas });
      }
      return detalheDoMensalista(tx, mensalistaId, agora);
    });
  } catch (erro) {
    return traduzirViolacao(erro);
  }
}
