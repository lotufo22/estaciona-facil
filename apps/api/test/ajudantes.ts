import type { Express } from 'express';
import { carregarEnv } from '../src/ambiente';
import { criarApp } from '../src/app';
import { criarPrisma, type PrismaClient } from '../src/prisma';

export interface AppDeTeste {
  app: Express;
  prisma: PrismaClient;
  /** Apaga os dados de todas as tabelas (e zera os contadores de id). Chame antes de cada teste. */
  limparBanco: () => Promise<void>;
  /** Fecha a conexão com o banco. Chame em `afterAll`. */
  encerrar: () => Promise<void>;
}

/** App de verdade, ligado ao Postgres de `DATABASE_URL_TESTE` (preparado pelo globalSetup). */
export function criarAppDeTeste(opcoes: { agora?: () => Date } = {}): AppDeTeste {
  carregarEnv();
  const url = process.env['DATABASE_URL_TESTE'];
  if (!url)
    throw new Error(
      'DATABASE_URL_TESTE não está definida (o globalSetup deveria ter parado antes).',
    );

  const prisma = criarPrisma(url);
  const app = criarApp({ prisma, ...(opcoes.agora ? { agora: opcoes.agora } : {}) });
  return {
    app,
    prisma,
    limparBanco: () => limparBanco(prisma),
    encerrar: () => prisma.$disconnect(),
  };
}

export async function limparBanco(prisma: PrismaClient): Promise<void> {
  const tabelas = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tabelas.length === 0) return;
  const lista = tabelas.map((t) => `"${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE ${lista} RESTART IDENTITY CASCADE`);
}

/** Mensalista com um veículo, e (opcionalmente) uma vaga: o necessário para criar contratos. */
export async function criarCenario(
  prisma: PrismaClient,
  { placa = 'ABC1D23', vaga }: { placa?: string; vaga?: string } = {},
) {
  const mensalista = await prisma.mensalista.create({
    data: { nome: 'Joana Prado', telefone: '12999990000' },
  });
  const veiculo = await prisma.veiculo.create({
    data: { mensalistaId: mensalista.id, placa, categoria: 'carro' },
  });
  const vagaCriada = vaga
    ? await prisma.vaga.upsert({
        where: { codigo: vaga },
        update: {},
        create: { codigo: vaga, categoria: 'carro' },
      })
    : null;
  return { mensalistaId: mensalista.id, veiculoId: veiculo.id, vagaId: vagaCriada?.id ?? null };
}

/** Dados de um contrato mensal ativo para o cenário; `sobrescritas` troca qualquer campo. */
export function dadosDeContrato(
  cenario: { mensalistaId: number; veiculoId: number; vagaId: number | null },
  sobrescritas: Record<string, unknown> = {},
) {
  return {
    mensalistaId: cenario.mensalistaId,
    veiculoId: cenario.veiculoId,
    vagaId: cenario.vagaId,
    tipo: 'mensal' as const,
    valor: '255.00',
    diaVencimento: 5,
    inicio: new Date('2026-10-05'),
    vencimento: new Date('2026-11-05'),
    ...sobrescritas,
  };
}
