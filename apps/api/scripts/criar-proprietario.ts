import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';
import { PERFIS, type Perfil } from '@estacionafacil/shared';
import { carregarEnv } from '../src/ambiente';
import { TAMANHO_MINIMO_DA_SENHA } from '../src/autenticacao/senhas';
import { ErroDeCadastroDeUsuario, criarUsuario } from '../src/autenticacao/usuarios';
import { criarPrisma } from '../src/prisma';

/**
 * Script de instalação (spec, seção 8): cria o primeiro usuário. NÃO existe senha padrão: a senha é
 * pedida aqui, na hora, e não aparece na tela nem fica em arquivo.
 *
 *   npm run criar-proprietario -w @estacionafacil/api
 *   npm run criar-proprietario -w @estacionafacil/api -- --perfil=auxiliar
 */

interface Entrada {
  perguntar(texto: string): Promise<string>;
  perguntarSenha(texto: string): Promise<string>;
  fechar(): void;
}

/** Entrada redirecionada (`echo ... | npm run ...`): cada pergunta lê a próxima linha. */
function entradaDeLinhas(): Entrada {
  const linhas = createInterface({ input: stdin })[Symbol.asyncIterator]();
  const proxima = async (texto: string): Promise<string> => {
    stdout.write(texto);
    const { done, value } = await linhas.next();
    stdout.write('\n');
    return done ? '' : value;
  };
  return {
    perguntar: proxima,
    perguntarSenha: proxima,
    fechar: () => stdin.destroy(),
  };
}

/** Terminal de verdade: o que se digita na senha não é mostrado. */
function entradaDeTerminal(): Entrada {
  const perguntar = (texto: string): Promise<string> =>
    new Promise((resolver) => {
      const leitor = createInterface({ input: stdin, output: stdout });
      leitor.question(texto, (resposta) => {
        leitor.close();
        resolver(resposta);
      });
    });

  const perguntarSenha = (texto: string): Promise<string> =>
    new Promise((resolver, rejeitar) => {
      stdout.write(texto);
      let senha = '';
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');

      const terminar = () => {
        stdin.off('data', aoDigitar);
        stdin.setRawMode(false);
        stdin.pause();
        stdout.write('\n');
      };
      function aoDigitar(trecho: string) {
        for (const tecla of trecho) {
          if (tecla === '\r' || tecla === '\n') {
            terminar();
            resolver(senha);
            return;
          }
          if (tecla === '\u0003') {
            terminar();
            rejeitar(new Error('Cancelado.'));
            return;
          }
          if (tecla === '\u007f' || tecla === '\b') senha = senha.slice(0, -1);
          else senha += tecla;
        }
      }
      stdin.on('data', aoDigitar);
    });

  return { perguntar, perguntarSenha, fechar: () => undefined };
}

function perfilDosArgumentos(argumentos: string[]): Perfil {
  const informado = argumentos.find((a) => a.startsWith('--perfil='))?.slice('--perfil='.length);
  if (informado === undefined) return 'proprietario';
  const perfil = PERFIS.find((p) => p === informado);
  if (!perfil) throw new ErroDeCadastroDeUsuario(`Perfil inválido. Use: ${PERFIS.join(' ou ')}.`);
  return perfil;
}

async function principal(): Promise<void> {
  carregarEnv();
  const perfil = perfilDosArgumentos(process.argv.slice(2));
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error('Defina DATABASE_URL no .env da raiz (veja o .env.example).');

  const entrada = stdin.isTTY ? entradaDeTerminal() : entradaDeLinhas();
  const prisma = criarPrisma(url);
  try {
    console.log(`Criando um usuário com o perfil "${perfil}".`);
    const nome = await entrada.perguntar('Nome completo: ');
    const login = await entrada.perguntar('Login (usuário): ');
    const senha = await entrada.perguntarSenha(
      `Senha (mínimo ${TAMANHO_MINIMO_DA_SENHA} caracteres): `,
    );
    const confirmacao = await entrada.perguntarSenha('Repita a senha: ');
    if (senha !== confirmacao) throw new ErroDeCadastroDeUsuario('As senhas não conferem.');

    const usuario = await criarUsuario(prisma, { nome, login, senha, perfil });
    console.log(`Pronto: usuário "${usuario.login}" criado (${perfil}).`);
  } finally {
    entrada.fechar();
    await prisma.$disconnect();
  }
}

principal().catch((erro: unknown) => {
  console.error(erro instanceof Error ? erro.message : erro);
  process.exit(1);
});
