import { despesaCriarSchema, type DespesaEntrada } from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Selecao } from '../../components/ui/Selecao';
import { aplicarErroDeApi } from '../../lib/formularios';
import { hoje } from '../../lib/hoje';
import { useCriarDespesa } from './api';

const CAMPOS = ['descricao', 'valor', 'tipo', 'data', 'diaDoMes'] as const;

const OPCOES_TIPO = [
  { valor: 'variavel', texto: 'Variável' },
  { valor: 'fixa', texto: 'Fixa' },
];

function valoresIniciais(): Partial<DespesaEntrada> {
  return { descricao: '', valor: '', tipo: 'variavel', data: hoje() };
}

export function FormularioDespesa() {
  const criar = useCriarDespesa();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [lancada, setLancada] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DespesaEntrada>({
    resolver: zodResolver(despesaCriarSchema),
    defaultValues: valoresIniciais(),
  });

  const tipo = watch('tipo');
  const fixa = tipo === 'fixa';

  // "Dia do mês" só existe para a despesa fixa: ao voltar para variável, o dia digitado sai de vez.
  useEffect(() => {
    if (tipo === 'variavel') {
      setValue('diaDoMes', undefined);
      clearErrors('diaDoMes');
    }
  }, [tipo, setValue, clearErrors]);

  async function enviar(dados: DespesaEntrada) {
    setErroGeral(null);
    setLancada(false);
    try {
      await criar.mutateAsync(dados);
      reset(valoresIniciais());
      setLancada(true);
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
      <h2 className="text-xl font-bold">Nova despesa</h2>

      <Campo
        rotulo="Descrição"
        autoComplete="off"
        erro={errors.descricao?.message}
        {...register('descricao')}
      />
      <Campo
        rotulo="Valor"
        inputMode="decimal"
        ajuda="Com ponto e duas casas, por exemplo 255.00"
        erro={errors.valor?.message}
        {...register('valor')}
      />
      <Selecao
        rotulo="Tipo"
        opcoes={OPCOES_TIPO}
        ajuda={
          fixa
            ? 'A despesa fixa se repete sozinha todo mês'
            : 'A despesa variável é lançada uma vez'
        }
        erro={errors.tipo?.message}
        {...register('tipo')}
      />
      {fixa && (
        <Campo
          rotulo="Dia do mês"
          type="number"
          min={1}
          max={31}
          ajuda="Dia em que ela se repete nos meses seguintes"
          erro={errors.diaDoMes?.message}
          {...register('diaDoMes', {
            setValueAs: (v: string | undefined) =>
              v === undefined || v === '' ? undefined : Number(v),
          })}
        />
      )}
      <Campo rotulo="Data" type="date" erro={errors.data?.message} {...register('data')} />

      {erroGeral && <MensagemErro mensagem={erroGeral} />}
      {lancada && (
        <p role="status" className="rounded-lg bg-ok-fundo p-4 text-base font-semibold text-ok">
          Despesa lançada.
        </p>
      )}

      <Botao type="submit" disabled={isSubmitting}>
        Lançar despesa
      </Botao>
    </form>
  );
}
