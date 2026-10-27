import { createHash, randomBytes } from 'node:crypto';
import type { Perfil } from '@estacionafacil/shared';
import type { PrismaClient } from '../prisma';

export const NOME_DO_COOKIE = 'estaciona_sessao';

/** A sessão expira depois de 12 horas SEM USO; cada uso renova o prazo (spec, seção 8). */
export const DURACAO_DA_SESSAO_MS = 12 * 60 * 60 * 1000;

export interface UsuarioDaSessao {
  id: number;
  nome: string;
  perfil: Perfil;
}

/** O banco guarda só este hash; o token em si só existe no cookie do navegador. */
export function hashDoToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function criarSessao(
  prisma: PrismaClient,
  usuarioId: number,
  agora: Date,
): Promise<{ token: string; expiraEm: Date }> {
  const token = randomBytes(32).toString('base64url');
  const expiraEm = new Date(agora.getTime() + DURACAO_DA_SESSAO_MS);
  await prisma.sessao.create({ data: { id: hashDoToken(token), usuarioId, expiraEm } });
  return { token, expiraEm };
}

/**
 * Procura a sessão pelo token. Se estiver viva e o usuário ativo, renova o prazo e devolve o
 * usuário. Vencida, ou de usuário desativado, é apagada e conta como sem sessão.
 */
export async function validarERenovarSessao(
  prisma: PrismaClient,
  token: string,
  agora: Date,
): Promise<UsuarioDaSessao | null> {
  const id = hashDoToken(token);
  const sessao = await prisma.sessao.findUnique({ where: { id }, include: { usuario: true } });
  if (!sessao) return null;

  if (sessao.expiraEm <= agora || !sessao.usuario.ativo) {
    await prisma.sessao.deleteMany({ where: { id } });
    return null;
  }

  // updateMany: se um logout apagou a sessão no meio, não há erro, só nada a renovar.
  await prisma.sessao.updateMany({
    where: { id },
    data: { expiraEm: new Date(agora.getTime() + DURACAO_DA_SESSAO_MS) },
  });
  const { usuario } = sessao;
  return { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
}

export async function encerrarSessao(prisma: PrismaClient, token: string): Promise<void> {
  await prisma.sessao.deleteMany({ where: { id: hashDoToken(token) } });
}

/** Limpeza de rotina das sessões vencidas de qualquer usuário. */
export async function apagarSessoesVencidas(prisma: PrismaClient, agora: Date): Promise<void> {
  await prisma.sessao.deleteMany({ where: { expiraEm: { lte: agora } } });
}
