import argon2 from 'argon2';

export const TAMANHO_MINIMO_DA_SENHA = 10;

/** Hash argon2id (com sal aleatório): a mesma senha gera hashes diferentes. */
export function hashSenha(senha: string): Promise<string> {
  return argon2.hash(senha, { type: argon2.argon2id });
}

/** Confere a senha contra o hash. Hash inválido ou corrompido conta como senha errada. */
export async function conferirSenha(senha: string, hash: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, senha);
  } catch {
    return false;
  }
}

let hashDeMentira: Promise<string> | null = null;

/**
 * Gasta o tempo de uma conferência de verdade e responde sempre falso. Serve para o login de um
 * usuário que não existe demorar quase o mesmo que o de um que existe (senão o tempo de resposta
 * revelaria quais logins estão cadastrados).
 */
export async function conferirContraNinguem(senha: string): Promise<false> {
  hashDeMentira ??= hashSenha('hash-de-mentira-so-para-gastar-tempo');
  await conferirSenha(senha, await hashDeMentira);
  return false;
}
