import type { PrismaClient } from '../prisma';

/** 5 falhas a cada 15 minutos por login e IP (spec, seção 8). */
export const LIMITE_DE_FALHAS = 5;
export const JANELA_DO_LIMITE_MS = 15 * 60 * 1000;

/**
 * A contagem fica na tabela `tentativas_login`, e não na memória: a função serverless pode ter
 * várias instâncias ao mesmo tempo, e cada uma teria o seu contador.
 *
 * Só falhas contam. Quem acerta a senha não gasta tentativas, e entrar zera a contagem do par.
 */
export async function verificarLimite(
  prisma: PrismaClient,
  login: string,
  ip: string,
  agora: Date,
): Promise<{ bloqueado: boolean; tentarEmSegundos: number }> {
  const desde = new Date(agora.getTime() - JANELA_DO_LIMITE_MS);
  const recentes = await prisma.tentativaLogin.findMany({
    where: { login, ip, ocorridaEm: { gt: desde } },
    orderBy: { ocorridaEm: 'desc' },
    take: LIMITE_DE_FALHAS,
  });
  if (recentes.length < LIMITE_DE_FALHAS) return { bloqueado: false, tentarEmSegundos: 0 };

  // O bloqueio cai quando a mais antiga das 5 últimas falhas sair da janela de 15 minutos.
  const liberaEm = (recentes.at(-1)?.ocorridaEm.getTime() ?? agora.getTime()) + JANELA_DO_LIMITE_MS;
  return { bloqueado: true, tentarEmSegundos: Math.ceil((liberaEm - agora.getTime()) / 1000) };
}

/** Anota uma falha e apaga, de passagem, as de qualquer login que já saíram da janela. */
export async function registrarFalha(
  prisma: PrismaClient,
  login: string,
  ip: string,
  agora: Date,
): Promise<void> {
  const desde = new Date(agora.getTime() - JANELA_DO_LIMITE_MS);
  await prisma.tentativaLogin.deleteMany({ where: { ocorridaEm: { lte: desde } } });
  await prisma.tentativaLogin.create({ data: { login, ip, ocorridaEm: agora } });
}

export async function limparFalhas(prisma: PrismaClient, login: string, ip: string): Promise<void> {
  await prisma.tentativaLogin.deleteMany({ where: { login, ip } });
}
