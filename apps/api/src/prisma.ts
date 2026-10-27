import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export { PrismaClient };

interface OpcoesDoPrisma {
  /** Máximo de conexões abertas. Na função da Netlify é 1 por instância (spec, seção 9). */
  maximoDeConexoes?: number;
}

/** Cliente do Prisma 7, que exige um adaptador de driver (aqui, o `pg`). */
export function criarPrisma(urlDoBanco: string, opcoes: OpcoesDoPrisma = {}): PrismaClient {
  const adaptador = new PrismaPg({
    connectionString: urlDoBanco,
    ...(opcoes.maximoDeConexoes ? { max: opcoes.maximoDeConexoes } : {}),
  });
  return new PrismaClient({ adapter: adaptador });
}
