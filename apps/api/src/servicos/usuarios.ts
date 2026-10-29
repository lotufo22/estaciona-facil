import type {
  Sessao,
  UsuarioAtualizarEntrada,
  UsuarioCriarEntrada,
  UsuarioItem,
} from '@estacionafacil/shared';
import { Prisma } from '../../generated/prisma/client';
import { conferirSenha, hashSenha } from '../autenticacao/senhas';
import { hashDoToken } from '../autenticacao/sessoes';
import { normalizarLogin } from '../autenticacao/usuarios';
import { ErroHttp } from '../erros';
import type { PrismaClient } from '../prisma';

type Linha = {
  id: number;
  nome: string;
  login: string;
  perfil: UsuarioItem['perfil'];
  ativo: boolean;
};

const paraItem = (u: Linha): UsuarioItem => ({
  id: u.id,
  nome: u.nome,
  login: u.login,
  perfil: u.perfil,
  ativo: u.ativo,
});

const loginEmUso = () =>
  new ErroHttp(409, 'LOGIN_EM_USO', 'Este login já está em uso.', {
    login: 'Este login já está em uso',
  });

export async function listarUsuarios(prisma: PrismaClient): Promise<UsuarioItem[]> {
  const usuarios = await prisma.usuario.findMany({ orderBy: { nome: 'asc' } });
  return usuarios.map(paraItem);
}

/** Cadastra um auxiliar. O perfil é sempre `auxiliar`: só existe um proprietário. */
export async function cadastrarAuxiliar(
  prisma: PrismaClient,
  dados: UsuarioCriarEntrada,
): Promise<UsuarioItem> {
  const login = normalizarLogin(dados.login);
  if (await prisma.usuario.findUnique({ where: { login } })) throw loginEmUso();
  try {
    const criado = await prisma.usuario.create({
      data: {
        nome: dados.nome,
        login,
        senhaHash: await hashSenha(dados.senha),
        perfil: 'auxiliar',
      },
    });
    return paraItem(criado);
  } catch (erro) {
    // Dois cadastros do mesmo login ao mesmo tempo: o banco barra o segundo.
    if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
      throw loginEmUso();
    }
    throw erro;
  }
}

/**
 * Nome, ativo ou senha de um auxiliar. Redefinir a senha ou desativar encerra as sessões abertas
 * dele. O proprietário não é alterado por aqui (ele usa "Minha conta").
 */
export async function atualizarAuxiliar(
  prisma: PrismaClient,
  id: number,
  dados: UsuarioAtualizarEntrada,
): Promise<UsuarioItem> {
  const alvo = await prisma.usuario.findUnique({ where: { id } });
  if (!alvo) throw new ErroHttp(404, 'NAO_ENCONTRADO', 'Usuário não encontrado.');
  if (alvo.perfil !== 'auxiliar') {
    throw new ErroHttp(
      403,
      'SEM_PERMISSAO',
      'O proprietário altera os próprios dados em "Minha conta".',
    );
  }

  const data: Prisma.UsuarioUpdateInput = {};
  if (dados.nome !== undefined) data.nome = dados.nome;
  if (dados.ativo !== undefined) data.ativo = dados.ativo;
  if (dados.senha !== undefined) data.senhaHash = await hashSenha(dados.senha);

  const derrubarSessoes = dados.senha !== undefined || dados.ativo === false;
  const [atualizado] = await prisma.$transaction([
    prisma.usuario.update({ where: { id }, data }),
    ...(derrubarSessoes ? [prisma.sessao.deleteMany({ where: { usuarioId: id } })] : []),
  ]);
  return paraItem(atualizado);
}

export async function atualizarNomeDaConta(
  prisma: PrismaClient,
  usuarioId: number,
  nome: string,
): Promise<Sessao> {
  const u = await prisma.usuario.update({ where: { id: usuarioId }, data: { nome } });
  return { id: u.id, nome: u.nome, perfil: u.perfil };
}

/** Troca a própria senha. Esta sessão continua; as outras do mesmo usuário são encerradas. */
export async function trocarSenhaDaConta(
  prisma: PrismaClient,
  usuarioId: number,
  tokenAtual: string,
  senhaAtual: string,
  novaSenha: string,
): Promise<void> {
  const usuario = await prisma.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
  if (!(await conferirSenha(senhaAtual, usuario.senhaHash))) {
    throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os campos.', {
      senhaAtual: 'A senha atual não confere',
    });
  }
  await prisma.$transaction([
    prisma.usuario.update({
      where: { id: usuarioId },
      data: { senhaHash: await hashSenha(novaSenha) },
    }),
    prisma.sessao.deleteMany({
      where: { usuarioId, NOT: { id: hashDoToken(tokenAtual) } },
    }),
  ]);
}
