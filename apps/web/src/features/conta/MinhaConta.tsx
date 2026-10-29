import {
  contaAtualizarSchema,
  trocarSenhaSchema,
  type ContaAtualizarEntrada,
  type TrocarSenhaEntrada,
} from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { aplicarErroDeApi } from '../../lib/formularios';
import { useSessao } from '../../lib/sessao';
import { useAtualizarNome, useTrocarSenha } from './api';

const PERFIL = { proprietario: 'Proprietário', auxiliar: 'Auxiliar' } as const;

function Aviso({ texto }: { texto: string }) {
  return (
    <p role="status" className="rounded-lg bg-ok-fundo p-4 text-base font-semibold text-ok">
      {texto}
    </p>
  );
}

function FormularioNome() {
  const { sessao, atualizarSessao } = useSessao();
  const atualizar = useAtualizarNome();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ContaAtualizarEntrada>({
    resolver: zodResolver(contaAtualizarSchema),
    defaultValues: { nome: sessao?.nome ?? '' },
  });

  async function enviar(dados: ContaAtualizarEntrada) {
    setErroGeral(null);
    setSalvo(false);
    try {
      atualizarSessao(await atualizar.mutateAsync(dados.nome));
      setSalvo(true);
    } catch (erro) {
      setErroGeral(aplicarErroDeApi(erro, setError, ['nome']));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
    >
      <h2 className="text-xl font-bold">Meus dados</h2>
      <p className="text-base text-texto-suave">
        Perfil: <strong>{sessao ? PERFIL[sessao.perfil] : ''}</strong>
      </p>
      <Campo rotulo="Nome" autoComplete="name" erro={errors.nome?.message} {...register('nome')} />
      {erroGeral && <MensagemErro mensagem={erroGeral} />}
      {salvo && <Aviso texto="Nome atualizado." />}
      <Botao type="submit" disabled={isSubmitting}>
        Salvar nome
      </Botao>
    </form>
  );
}

function FormularioSenha() {
  const trocar = useTrocarSenha();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TrocarSenhaEntrada>({
    resolver: zodResolver(trocarSenhaSchema),
    defaultValues: { senhaAtual: '', novaSenha: '' },
  });

  async function enviar(dados: TrocarSenhaEntrada) {
    setErroGeral(null);
    setSalvo(false);
    try {
      await trocar.mutateAsync(dados);
      reset();
      setSalvo(true);
    } catch (erro) {
      setErroGeral(aplicarErroDeApi(erro, setError, ['senhaAtual', 'novaSenha']));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
    >
      <h2 className="text-xl font-bold">Trocar a senha</h2>
      <Campo
        rotulo="Senha atual"
        type="password"
        autoComplete="current-password"
        erro={errors.senhaAtual?.message}
        {...register('senhaAtual')}
      />
      <Campo
        rotulo="Nova senha"
        type="password"
        autoComplete="new-password"
        ajuda="Pelo menos 10 caracteres. Em outros aparelhos você terá de entrar de novo."
        erro={errors.novaSenha?.message}
        {...register('novaSenha')}
      />
      {erroGeral && <MensagemErro mensagem={erroGeral} />}
      {salvo && <Aviso texto="Senha trocada." />}
      <Botao type="submit" disabled={isSubmitting}>
        Trocar senha
      </Botao>
    </form>
  );
}

export function MinhaConta() {
  return (
    <>
      <CabecalhoPagina titulo="Minha conta" subtitulo="Seu nome e sua senha de entrada" />
      <div className="grid gap-6 lg:grid-cols-2">
        <FormularioNome />
        <FormularioSenha />
      </div>
    </>
  );
}
