import { pathToFileURL } from 'node:url';
import { carregarEnv } from '../src/ambiente';
import { criarPrisma, type PrismaClient } from '../src/prisma';

export const VAGAS_DE_CARRO = 35;
export const VAGAS_DE_MOTO = 14;

/**
 * Cria as 49 vagas do estacionamento: 35 de carro (códigos 01 a 35) e 14 de moto (M1 a M14).
 * Pode rodar mais de uma vez: as que já existem são mantidas. Devolve quantas criou.
 */
export async function semearVagas(prisma: PrismaClient): Promise<number> {
  const carros = Array.from({ length: VAGAS_DE_CARRO }, (_, i) => ({
    codigo: String(i + 1).padStart(2, '0'),
    categoria: 'carro' as const,
  }));
  const motos = Array.from({ length: VAGAS_DE_MOTO }, (_, i) => ({
    codigo: `M${i + 1}`,
    categoria: 'moto' as const,
  }));
  const resultado = await prisma.vaga.createMany({
    data: [...carros, ...motos],
    skipDuplicates: true,
  });
  return resultado.count;
}

async function principal(): Promise<void> {
  carregarEnv();
  const url = process.env['DATABASE_URL_MIGRACAO'] ?? process.env['DATABASE_URL'];
  if (!url) throw new Error('Defina DATABASE_URL (ou DATABASE_URL_MIGRACAO) no .env da raiz.');
  const prisma = criarPrisma(url);
  try {
    const criadas = await semearVagas(prisma);
    console.log(`Vagas criadas: ${criadas} (de ${VAGAS_DE_CARRO + VAGAS_DE_MOTO}).`);
  } finally {
    await prisma.$disconnect();
  }
}

// Só roda quando o arquivo é executado direto (`npm run semear -w @estacionafacil/api`).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().catch((erro: unknown) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
