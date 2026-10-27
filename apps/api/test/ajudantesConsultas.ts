import type { PrismaClient } from '../src/prisma';

const data = (texto: string) => new Date(`${texto}T00:00:00.000Z`);

let placaSeq = 0;

/** Apaga o que os testes de consulta criam; usuários e vagas ficam. */
export async function limparMovimento(prisma: PrismaClient): Promise<void> {
  await prisma.pagamento.deleteMany();
  await prisma.despesa.deleteMany();
  await prisma.historicoContrato.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.veiculo.deleteMany();
  await prisma.mensalista.deleteMany();
}

/** Contrato gravado direto no banco (sem passar pela API), para montar cenários de consulta. */
export async function criarContratoDireto(
  prisma: PrismaClient,
  dados: {
    nome: string;
    vencimento: string;
    valor?: string;
    categoria?: 'carro' | 'moto';
    tipo?: 'mensal' | 'semanal';
    status?: 'ativo' | 'encerrado';
    arquivado?: boolean;
  },
) {
  placaSeq += 1;
  const mensalista = await prisma.mensalista.create({
    data: {
      nome: dados.nome,
      telefone: '12999990000',
      ...(dados.arquivado ? { arquivadoEm: new Date('2026-01-01T00:00:00Z') } : {}),
    },
  });
  const veiculo = await prisma.veiculo.create({
    data: {
      mensalistaId: mensalista.id,
      placa: `TST${String(placaSeq).padStart(4, '0')}`,
      categoria: dados.categoria ?? 'carro',
    },
  });
  const contrato = await prisma.contrato.create({
    data: {
      mensalistaId: mensalista.id,
      veiculoId: veiculo.id,
      tipo: dados.tipo ?? 'mensal',
      valor: dados.valor ?? '255.00',
      diaVencimento: 5,
      inicio: data('2026-01-05'),
      vencimento: data(dados.vencimento),
      status: dados.status ?? 'ativo',
      ...(dados.status === 'encerrado' ? { encerradoEm: new Date('2026-10-01T12:00:00Z') } : {}),
    },
  });
  return { mensalistaId: mensalista.id, contratoId: contrato.id };
}

let chaveSeq = 0;

export async function criarPagamentoDireto(
  prisma: PrismaClient,
  contratoId: number,
  dados: { valor: string; pagoEm: string; forma?: 'dinheiro' | 'pix' | 'debito' | 'credito' },
) {
  chaveSeq += 1;
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { login: 'proprietario' } });
  return prisma.pagamento.create({
    data: {
      contratoId,
      valor: dados.valor,
      forma: dados.forma ?? 'pix',
      pagoEm: data(dados.pagoEm),
      mesReferencia: data(`${dados.pagoEm.slice(0, 7)}-01`),
      registradoPor: usuario.id,
      chaveIdempotencia: `direto-${chaveSeq}`,
    },
  });
}

export function criarDespesaDireta(
  prisma: PrismaClient,
  dados: { valor: string; data: string; descricao?: string },
) {
  return prisma.despesa.create({
    data: {
      descricao: dados.descricao ?? 'Despesa de teste',
      valor: dados.valor,
      tipo: 'variavel',
      data: data(dados.data),
    },
  });
}

export function criarEventoCriado(prisma: PrismaClient, contratoId: number, em: string) {
  return prisma.historicoContrato.create({
    data: { contratoId, evento: 'criado', em: new Date(`${em}T15:00:00Z`) },
  });
}
