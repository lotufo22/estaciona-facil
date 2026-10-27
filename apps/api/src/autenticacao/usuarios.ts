import type { Perfil } from '@estacionafacil/shared';
import type { PrismaClient } from '../prisma';
import { TAMANHO_MINIMO_DA_SENHA, hashSenha } from './senhas';

/** Erro de regra no cadastro de um usuário; a mensagem já está pronta para mostrar. */
export class ErroDeCadastroDeUsuario extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroDeCadastroDeUsuario';
  }
}

/** Login sem espaços nas pontas e em minúsculo: "  Dono " e "dono" são o mesmo usuário. */
export function normalizarLogin(login: string): string {
  return login.trim().toLowerCase();
}

interface DadosDoUsuario {
  nome: string;
  login: string;
  senha: string;
  perfil: Perfil;
}

/**
 * Cria um usuário com a senha guardada como hash argon2id. Usada pelo script de instalação
 * (`criar-proprietario`); não existe senha padrão.
 */
export async function criarUsuario(
  prisma: PrismaClient,
  dados: DadosDoUsuario,
): Promise<{ id: number; login: string }> {
  const nome = dados.nome.trim();
  const login = normalizarLogin(dados.login);
  if (!nome) throw new ErroDeCadastroDeUsuario('Informe o nome.');
  if (!login) throw new ErroDeCadastroDeUsuario('Informe o login.');
  if (dados.senha.length < TAMANHO_MINIMO_DA_SENHA) {
    throw new ErroDeCadastroDeUsuario(
      `A senha precisa ter pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`,
    );
  }
  if (await prisma.usuario.findUnique({ where: { login } })) {
    throw new ErroDeCadastroDeUsuario('Já existe um usuário com este login.');
  }

  const senhaHash = await hashSenha(dados.senha);
  const usuario = await prisma.usuario.create({
    data: { nome, login, senhaHash, perfil: dados.perfil },
  });
  return { id: usuario.id, login: usuario.login };
}
