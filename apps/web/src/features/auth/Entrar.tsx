import { loginSchema, type LoginEntrada } from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Navigate, useSearchParams } from 'react-router-dom';
import { paginaInicial } from '../../app/abas';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { Icone } from '../../components/ui/Icone';
import { Marca } from '../../components/ui/Marca';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { ErroApiCliente } from '../../lib/api';
import { useSessao } from '../../lib/sessao';

/** Planta ilustrativa do estacionamento, sem representar a ocupação real. */
function PlantaEstacionamento() {
  return (
    <svg
      viewBox="0 0 460 250"
      fill="none"
      aria-hidden="true"
      className="planta-estacionamento my-10 w-full max-w-lg"
    >
      <rect x="1" y="1" width="458" height="248" rx="16" fill="#102b4d" stroke="#38506a" />
      {[30, 110, 190, 270, 350].map((x, i) => (
        <g key={x}>
          <path d={`M${x} 20v75h64V20 M${x} 230v-75h64v75`} stroke="#5d7189" strokeWidth="1.5" />
          <text
            x={x + 32}
            y="43"
            fill="#8ca2bb"
            fontSize="10"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            {String(i + 1).padStart(2, '0')}
          </text>
          <text
            x={x + 32}
            y="218"
            fill="#8ca2bb"
            fontSize="10"
            fontFamily="sans-serif"
            textAnchor="middle"
          >
            {String(i + 6).padStart(2, '0')}
          </text>
        </g>
      ))}
      <path d="M24 125h394" stroke="#6e829b" strokeDasharray="9 9" />
      <path
        d="m240 117 9 8-9 8"
        stroke="#c4d2e4"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {[
        { x: 42, y: 48 },
        { x: 202, y: 48 },
        { x: 282, y: 48 },
        { x: 122, y: 162 },
        { x: 362, y: 162 },
      ].map(({ x, y }, i) => (
        <g className="carro-planta" key={`${x}-${y}`} style={{ animationDelay: `${i * 80}ms` }}>
          <rect x={x} y={y} width="40" height="39" rx="8" fill={i === 2 ? '#6bb6ff' : '#526f93'} />
          <path
            d={`M${x + 7} ${y + 10}h26 M${x + 7} ${y + 29}h26`}
            stroke="#102b4d"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      ))}
      <text x="62" y="187" fill="#22c55e" fontSize="17" fontFamily="sans-serif" textAnchor="middle">
        P
      </text>
      <text
        x="302"
        y="187"
        fill="#22c55e"
        fontSize="17"
        fontFamily="sans-serif"
        textAnchor="middle"
      >
        P
      </text>
    </svg>
  );
}

export function Entrar() {
  const { sessao, entrar } = useSessao();
  const [parametros] = useSearchParams();
  const [erroDoServidor, setErroDoServidor] = useState<string | null>(null);
  const [mostrarSenha, setMostrarSenha] = useState(false);
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
    <main className="grid min-h-dvh bg-superficie lg:grid-cols-[1fr_1fr]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-barra px-12 py-10 text-white lg:flex xl:px-20">
        <Marca clara />
        <div className="pagina-entrada mx-auto w-full max-w-lg py-8">
          <p className="mb-5 flex items-center gap-2 text-xs font-medium tracking-[.16em] text-barra-texto uppercase">
            <span className="size-1.5 rounded-full bg-marca-sucesso" />
            Um novo jeito de organizar
          </p>
          <h2 className="text-[46px] leading-[1.14] font-medium tracking-[-.035em] xl:text-[56px]">
            Seu estacionamento.
            <br />
            <span className="text-marca-azul-claro">Sob controle.</span>
          </h2>
          <p className="mt-5 max-w-sm text-base leading-7 text-barra-texto">
            Mais clareza para acompanhar seus mensalistas e cuidar do que faz seu negócio seguir em
            frente.
          </p>
          <PlantaEstacionamento />
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-xs text-barra-texto">
            <span className="flex items-center gap-2">
              <Icone nome="mensalistas" className="size-4" />
              Contratos organizados
            </span>
            <span className="flex items-center gap-2">
              <Icone nome="fluxo" className="size-4" />
              Finanças à vista
            </span>
          </div>
        </div>
        <p className="text-xs text-barra-texto">Feito para a rotina de quem está no comando.</p>
      </section>
      <section className="flex min-w-0 flex-col px-6 py-8 sm:px-12">
        <div className="lg:hidden">
          <Marca />
        </div>
        <div className="pagina-entrada m-auto w-full max-w-[380px] py-14">
          <p className="mb-3 text-xs font-semibold tracking-[.16em] text-primaria uppercase">
            Bem-vindo de volta
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-texto">Entrar</h1>
          <p className="mt-3 mb-9 text-sm leading-6 text-texto-suave">
            Acesse sua conta para acompanhar o estacionamento.
          </p>
          {parametros.get('expirou') === '1' && (
            <p role="status" className="mb-5 rounded-lg bg-alerta-fundo p-4 text-sm text-alerta">
              Sua sessão expirou. Entre de novo.
            </p>
          )}
          <form onSubmit={handleSubmit(enviar)} noValidate className="flex flex-col gap-5">
            <Campo
              rotulo="Usuário"
              placeholder="Seu nome de usuário"
              autoComplete="username"
              erro={errors.login?.message}
              {...register('login')}
            />
            <div>
              <Campo
                rotulo="Senha"
                placeholder="Digite sua senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                erro={errors.senha?.message}
                {...register('senha')}
              />
              <button
                type="button"
                aria-pressed={mostrarSenha}
                onClick={() => setMostrarSenha(!mostrarSenha)}
                className="mt-2 min-h-8 cursor-pointer rounded text-xs font-medium text-texto-suave hover:text-primaria focus-visible:outline-2 focus-visible:outline-primaria"
              >
                {mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
              </button>
            </div>
            {erroDoServidor && <MensagemErro mensagem={erroDoServidor} />}
            <Botao type="submit" disabled={isSubmitting} className="mt-1 w-full">
              {isSubmitting ? 'Entrando…' : 'Entrar'}
              <Icone nome="seta" className="size-4" />
            </Botao>
          </form>
          <p className="mt-8 border-t border-borda pt-6 text-xs leading-5 text-texto-suave">
            Precisa de acesso? Solicite seu usuário ao proprietário do estacionamento.
          </p>
        </div>
        <p className="text-center text-[11px] text-texto-suave">
          © 2026 EstacionaFácil · Projeto Integrador IV · UNITAU
        </p>
      </section>
    </main>
  );
}
