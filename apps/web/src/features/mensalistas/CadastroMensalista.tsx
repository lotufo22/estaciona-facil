import {
  mensalistaCriarSchema,
  type MensalistaCriarEntrada,
  type MensalistaCriarFormulario,
} from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { LinkBotao } from '../../components/ui/LinkBotao';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Selecao } from '../../components/ui/Selecao';
import { aplicarErroDeApi } from '../../lib/formularios';
import { hoje } from '../../lib/hoje';
import { useCriarMensalista } from './api';

const CAMPOS = [
  'nome',
  'telefone',
  'placa',
  'categoria',
  'vaga',
  'tipo',
  'valor',
  'diaVencimento',
  'inicio',
] as const;

const OPCOES_CATEGORIA = [
  { valor: 'carro', texto: 'Carro' },
  { valor: 'moto', texto: 'Moto' },
];
const OPCOES_TIPO = [
  { valor: 'mensal', texto: 'Mensal' },
  { valor: 'semanal', texto: 'Semanal' },
];

export function CadastroMensalista() {
  const navegar = useNavigate();
  const criar = useCriarMensalista();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MensalistaCriarFormulario, unknown, MensalistaCriarEntrada>({
    resolver: zodResolver(mensalistaCriarSchema),
    defaultValues: { categoria: 'carro', tipo: 'mensal', inicio: hoje() },
  });

  async function enviar(dados: MensalistaCriarEntrada) {
    setErroGeral(null);
    try {
      const { mensalistaId } = await criar.mutateAsync(dados);
      navegar(`/mensalistas/${mensalistaId}`);
    } catch (erro) {
      setErroGeral(aplicarErroDeApi(erro, setError, CAMPOS));
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Novo mensalista"
        subtitulo="Cliente, veículo e contrato em um só cadastro"
        acao={
          <LinkBotao to="/mensalistas" variante="secundario">
            Voltar à lista
          </LinkBotao>
        }
      />

      <form
        onSubmit={handleSubmit(enviar)}
        noValidate
        className="flex flex-col gap-6 rounded-lg border border-borda bg-superficie p-6"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Campo
            rotulo="Nome"
            autoComplete="off"
            erro={errors.nome?.message}
            {...register('nome')}
          />
          <Campo
            rotulo="Telefone"
            type="tel"
            ajuda="Com DDD, por exemplo (12) 99999-0000"
            erro={errors.telefone?.message}
            {...register('telefone')}
          />
          <Campo
            rotulo="Placa"
            ajuda="Por exemplo ABC-1234 ou ABC-1D23"
            erro={errors.placa?.message}
            {...register('placa')}
          />
          <Selecao
            rotulo="Categoria"
            opcoes={OPCOES_CATEGORIA}
            erro={errors.categoria?.message}
            {...register('categoria')}
          />
          <Campo
            rotulo="Vaga"
            ajuda="Opcional. Deixe em branco se o cliente não tiver vaga fixa"
            erro={errors.vaga?.message}
            {...register('vaga')}
          />
          <Selecao
            rotulo="Tipo de contrato"
            opcoes={OPCOES_TIPO}
            erro={errors.tipo?.message}
            {...register('tipo')}
          />
          <Campo
            rotulo="Valor"
            inputMode="decimal"
            ajuda="Com ponto e duas casas, por exemplo 255.00"
            erro={errors.valor?.message}
            {...register('valor')}
          />
          <Campo
            rotulo="Dia do vencimento"
            type="number"
            min={1}
            max={31}
            erro={errors.diaVencimento?.message}
            {...register('diaVencimento', { valueAsNumber: true })}
          />
          <Campo
            rotulo="Início"
            type="date"
            erro={errors.inicio?.message}
            {...register('inicio')}
          />
        </div>

        {erroGeral && <MensagemErro mensagem={erroGeral} />}

        <div className="flex flex-wrap gap-4">
          <Botao type="submit" disabled={isSubmitting}>
            Cadastrar mensalista
          </Botao>
          <LinkBotao to="/mensalistas" variante="secundario">
            Cancelar
          </LinkBotao>
        </div>
      </form>
    </>
  );
}
