import {
  FORMAS_PAGAMENTO,
  pagamentoCriarSchema,
  type MensalistaItem,
  type PagamentoEntrada,
  type RegistroPagamentoResposta,
} from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Selecao } from '../../components/ui/Selecao';
import { aplicarErroDeApi } from '../../lib/formularios';
import { hoje } from '../../lib/hoje';
import { useMensalistas } from '../mensalistas/api';
import { useRegistrarPagamento } from './api';
import { NOME_DA_FORMA } from './Comprovante';
import { SeletorMensalista } from './SeletorMensalista';

const CAMPOS = ['contratoId', 'valor', 'forma'] as const;
const OPCOES_FORMA = FORMAS_PAGAMENTO.map((f) => ({ valor: f, texto: NOME_DA_FORMA[f] }));
const VALORES_INICIAIS = { forma: 'pix', valor: '' } as const;

/** A data do recebimento é sempre hoje: entra na validação, sem campo na tela. */
const resolver: Resolver<PagamentoEntrada> = (valores, contexto, opcoes) =>
  zodResolver(pagamentoCriarSchema)({ ...valores, pagoEm: hoje() }, contexto, opcoes);

interface FormularioRecebimentoProps {
  /** Contrato que veio na URL (`?contrato=`); preenche o mensalista ao abrir a tela. */
  contratoDaUrl?: number;
  aoLimparContrato: () => void;
  aoRegistrar: (resposta: RegistroPagamentoResposta) => void;
}

export function FormularioRecebimento({
  contratoDaUrl,
  aoLimparContrato,
  aoRegistrar,
}: FormularioRecebimentoProps) {
  const registrar = useRegistrarPagamento();
  const [escolhidoNaBusca, setEscolhidoNaBusca] = useState<MensalistaItem | null>(null);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const enviando = useRef(false);

  const daUrl = useMensalistas(
    { contrato: contratoDaUrl },
    { habilitado: contratoDaUrl !== undefined },
  );
  const escolhido = escolhidoNaBusca ?? (contratoDaUrl ? (daUrl.data?.itens[0] ?? null) : null);
  const contratoNaoEncontrado =
    contratoDaUrl !== undefined && daUrl.isSuccess && daUrl.data.itens.length === 0;

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PagamentoEntrada>({ resolver, defaultValues: VALORES_INICIAIS });

  // Escolher o mensalista preenche o contrato e a mensalidade (que o usuário ainda pode ajustar).
  const contratoEscolhido = escolhido?.contratoId;
  const valorDoContrato = escolhido?.valor;
  useEffect(() => {
    if (contratoEscolhido === undefined || valorDoContrato === undefined) return;
    setValue('contratoId', contratoEscolhido);
    setValue('valor', valorDoContrato);
  }, [contratoEscolhido, valorDoContrato, setValue]);

  function trocarMensalista() {
    setEscolhidoNaBusca(null);
    setErroGeral(null);
    aoLimparContrato();
    reset(VALORES_INICIAIS);
  }

  async function enviar(dados: PagamentoEntrada) {
    // Um segundo clique antes de a tela reagir não pode abrir outro envio.
    if (enviando.current) return;
    enviando.current = true;
    setErroGeral(null);
    try {
      const resposta = await registrar.mutateAsync(dados);
      setEscolhidoNaBusca(null);
      aoLimparContrato();
      reset(VALORES_INICIAIS);
      aoRegistrar(resposta);
    } catch (erro) {
      setErroGeral(aplicarErroDeApi(erro, setError, CAMPOS));
    } finally {
      enviando.current = false;
    }
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
    >
      <h2 className="text-xl font-bold">Novo recebimento</h2>

      <SeletorMensalista
        escolhido={escolhido}
        erro={errors.contratoId?.message}
        aviso={contratoNaoEncontrado ? 'Contrato não encontrado ou já encerrado.' : undefined}
        aoEscolher={setEscolhidoNaBusca}
        aoTrocar={trocarMensalista}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Selecao
          rotulo="Forma de pagamento"
          opcoes={OPCOES_FORMA}
          erro={errors.forma?.message}
          {...register('forma')}
        />
        <Campo
          rotulo="Valor"
          inputMode="decimal"
          ajuda="Com ponto e duas casas, por exemplo 255.00"
          erro={errors.valor?.message}
          {...register('valor')}
        />
      </div>

      {erroGeral && <MensagemErro mensagem={erroGeral} />}

      <Botao type="submit" disabled={isSubmitting || registrar.isPending}>
        Confirmar recebimento
      </Botao>
    </form>
  );
}
