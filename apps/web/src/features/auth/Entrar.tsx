import { loginSchema, type LoginEntrada } from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useSearchParams } from 'react-router-dom';
import { paginaInicial } from '../../app/abas';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { ErroApiCliente } from '../../lib/api';
import { useSessao } from '../../lib/sessao';

export function Entrar() {
  const { sessao, entrar } = useSessao();
  const [parametros] = useSearchParams();
  const [erroDoServidor, setErroDoServidor] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginEntrada>({ resolver: zodResolver(loginSchema) });

  if (sessao) return <Navigate to={paginaInicial(sessao.perfil)} replace />;

  async function enviar({ login, senha }: LoginEntrada) {
    setErroDoServidor(null);
    try {
      await entrar(login, senha);
    } catch (erro) {
      setErroDoServidor(
        erro instanceof ErroApiCliente ? erro.message : 'Não foi possível entrar. Tente de novo.',
      );
    }
  }

  return (
    <main className="grid min-h-screen place-items-center p-8">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-lg border border-borda bg-superficie p-8">
        <div className="flex flex-col gap-1">
          <p className="text-xl font-bold text-primaria">EstacionaFácil</p>
          <h1 className="text-[28px] leading-9 font-bold text-texto">Entrar</h1>
        </div>

        {parametros.get('expirou') === '1' && (
          <p role="status" className="rounded-lg bg-alerta-fundo p-4 text-base text-alerta">
            Sua sessão expirou. Entre de novo.
          </p>
        )}

        <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-4">
          <Campo
            rotulo="Usuário"
            autoComplete="username"
            erro={errors.login?.message}
            {...register('login')}
          />
          <Campo
            rotulo="Senha"
            type="password"
            autoComplete="current-password"
            erro={errors.senha?.message}
            {...register('senha')}
          />
          {erroDoServidor && <MensagemErro mensagem={erroDoServidor} />}
          <Botao type="submit" disabled={isSubmitting}>
            Entrar
          </Botao>
        </form>
      </div>
    </main>
  );
}
