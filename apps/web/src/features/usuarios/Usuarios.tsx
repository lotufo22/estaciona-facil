import {
  usuarioCriarSchema,
  type UsuarioCriarEntrada,
  type UsuarioItem,
} from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { Carregando } from '../../components/ui/Carregando';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { aplicarErroDeApi } from '../../lib/formularios';
import { useAtualizarUsuario, useCriarUsuario, useUsuarios } from './api';

const CAMPOS = ['nome', 'login', 'senha'] as const;

function FormularioNovoAuxiliar() {
  const criar = useCriarUsuario();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [cadastrado, setCadastrado] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UsuarioCriarEntrada>({
    resolver: zodResolver(usuarioCriarSchema),
    defaultValues: { nome: '', login: '', senha: '' },
  });

  async function enviar(dados: UsuarioCriarEntrada) {
    setErroGeral(null);
    setCadastrado(null);
    try {
      const novo = await criar.mutateAsync(dados);
      reset();
      setCadastrado(novo.nome);
    } catch (erro) {
      setErroGeral(aplicarErroDeApi(erro, setError, CAMPOS));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
    >
      <h2 className="text-xl font-bold">Novo auxiliar</h2>
      <p className="text-base text-texto-suave">
        O auxiliar registra recebimentos, consulta mensalistas e lança despesas. Passe a ele o login
        e a senha inicial; ele pode trocar a senha em "Minha conta".
      </p>
      <Campo
        rotulo="Nome completo"
        autoComplete="off"
        erro={errors.nome?.message}
        {...register('nome')}
      />
      <Campo
        rotulo="Login"
        autoComplete="off"
        autoCapitalize="none"
        ajuda="Com o que ele entra no sistema. Letras minúsculas, números, ponto ou traço."
        erro={errors.login?.message}
        {...register('login')}
      />
      <Campo
        rotulo="Senha inicial"
        type="password"
        autoComplete="new-password"
        ajuda="Pelo menos 10 caracteres"
        erro={errors.senha?.message}
        {...register('senha')}
      />
      {erroGeral && <MensagemErro mensagem={erroGeral} />}
      {cadastrado && (
        <p role="status" className="rounded-lg bg-ok-fundo p-4 text-base font-semibold text-ok">
          {cadastrado} cadastrado(a). Já pode entrar com o login e a senha informados.
        </p>
      )}
      <Botao type="submit" disabled={isSubmitting}>
        Cadastrar auxiliar
      </Botao>
    </form>
  );
}

function LinhaDoUsuario({ usuario }: { usuario: UsuarioItem }) {
  const atualizar = useAtualizarUsuario(usuario.id);
  const [redefinindo, setRedefinindo] = useState(false);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const ehAuxiliar = usuario.perfil === 'auxiliar';

  async function salvar(dados: { ativo?: boolean; senha?: string }) {
    setErro(null);
    try {
      await atualizar.mutateAsync(dados);
      setRedefinindo(false);
      setSenha('');
    } catch (e) {
      const campos = (e as { campos?: Record<string, string> }).campos;
      setErro(
        campos?.['senha'] ??
          (e instanceof Error ? e.message : 'Não foi possível salvar. Tente de novo.'),
      );
    }
  }

  return (
    <tr>
      <td className="px-2 py-3 font-semibold">{usuario.nome}</td>
      <td className="px-2 py-3">{usuario.login}</td>
      <td className="px-2 py-3">{ehAuxiliar ? 'Auxiliar' : 'Proprietário'}</td>
      <td className="px-2 py-3">{usuario.ativo ? 'Ativo' : 'Desativado'}</td>
      <td className="px-2 py-3">
        {ehAuxiliar && !redefinindo && (
          <div className="flex flex-wrap gap-2">
            <Botao
              variante="secundario"
              aria-label={`Redefinir a senha de ${usuario.nome}`}
              onClick={() => setRedefinindo(true)}
            >
              Redefinir senha
            </Botao>
            <Botao
              variante="secundario"
              aria-label={`${usuario.ativo ? 'Desativar' : 'Reativar'} ${usuario.nome}`}
              disabled={atualizar.isPending}
              onClick={() => void salvar({ ativo: !usuario.ativo })}
            >
              {usuario.ativo ? 'Desativar' : 'Reativar'}
            </Botao>
          </div>
        )}
        {ehAuxiliar && redefinindo && (
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void salvar({ senha });
            }}
          >
            <Campo
              rotulo={`Nova senha de ${usuario.nome}`}
              type="password"
              autoComplete="new-password"
              ajuda="Pelo menos 10 caracteres. As sessões abertas dele serão encerradas."
              valor={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Botao type="submit" disabled={atualizar.isPending}>
                Salvar senha
              </Botao>
              <Botao variante="secundario" onClick={() => setRedefinindo(false)}>
                Cancelar
              </Botao>
            </div>
          </form>
        )}
        {erro && <MensagemErro mensagem={erro} />}
      </td>
    </tr>
  );
}

export function Usuarios() {
  const consulta = useUsuarios();
  return (
    <>
      <CabecalhoPagina
        titulo="Usuários"
        subtitulo="Quem pode entrar no sistema. Só o proprietário vê esta página."
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6 lg:col-span-2">
          <h2 className="text-xl font-bold">Usuários cadastrados</h2>
          {consulta.isPending && <Carregando texto="Carregando os usuários…" />}
          {consulta.isError && (
            <MensagemErro
              mensagem={
                consulta.error instanceof Error
                  ? consulta.error.message
                  : 'Não foi possível carregar os usuários.'
              }
              onTentarDeNovo={() => void consulta.refetch()}
            />
          )}
          {consulta.data && (
            <Tabela
              legenda="Usuários cadastrados"
              cabecalhos={['Nome', 'Login', 'Perfil', 'Situação', 'Ações']}
            >
              {consulta.data.itens.map((u) => (
                <LinhaDoUsuario key={u.id} usuario={u} />
              ))}
            </Tabela>
          )}
        </section>
        <FormularioNovoAuxiliar />
      </div>
    </>
  );
}
