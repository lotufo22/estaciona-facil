import {
  formatarPlaca,
  formatarReais,
  mensalistaAtualizarSchema,
  renovacaoSchema,
  type EventoHistorico,
  type MensalistaAtualizarEntrada,
  type MensalistaDetalhe,
  type RenovacaoEntrada,
} from '@estacionafacil/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { EtiquetaSituacao } from '../../components/ui/EtiquetaSituacao';
import { LinkBotao } from '../../components/ui/LinkBotao';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { ErroApiCliente } from '../../lib/api';
import { formatarData, formatarTelefone } from '../../lib/formatar';
import { aplicarErroDeApi } from '../../lib/formularios';
import { useSessao } from '../../lib/sessao';
import {
  useAtualizarMensalista,
  useEncerrarContrato,
  useMensalista,
  useRenovarContrato,
} from './api';
import { DialogoEncerrar } from './DialogoEncerrar';

const NOME_DO_EVENTO: Record<EventoHistorico, string> = {
  criado: 'Contrato criado',
  renovado: 'Contrato renovado',
  pagamento: 'Pagamento',
  encerrado: 'Contrato encerrado',
};

const TIPO_DO_CONTRATO = { mensal: 'Mensal', semanal: 'Semanal' } as const;
const CATEGORIA = { carro: 'Carro', moto: 'Moto' } as const;

const CAMPOS_EDICAO = ['telefone', 'placa', 'vaga', 'valor'] as const;
const CAMPOS_RENOVACAO = ['motivo', 'meses'] as const;

function Dado({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-base text-texto-suave">{rotulo}</dt>
      <dd className="text-base font-semibold">{children}</dd>
    </div>
  );
}

function FormularioEdicao({
  detalhe,
  aoFechar,
}: {
  detalhe: MensalistaDetalhe;
  aoFechar: () => void;
}) {
  const atualizar = useAtualizarMensalista(detalhe.id);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<MensalistaAtualizarEntrada>({
    resolver: zodResolver(mensalistaAtualizarSchema),
    defaultValues: {
      telefone: formatarTelefone(detalhe.telefone),
      placa: formatarPlaca(detalhe.placa),
      vaga: detalhe.contrato.vaga,
      valor: detalhe.contrato.valor,
    },
  });

  async function enviar(dados: MensalistaAtualizarEntrada) {
    setErroGeral(null);
    try {
      await atualizar.mutateAsync(dados);
      aoFechar();
    } catch (erro) {
      setErroGeral(aplicarErroDeApi(erro, setError, CAMPOS_EDICAO));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
    >
      <h2 className="text-xl font-bold">Editar dados</h2>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo
          rotulo="Telefone"
          type="tel"
          erro={errors.telefone?.message}
          {...register('telefone')}
        />
        <Campo rotulo="Placa" erro={errors.placa?.message} {...register('placa')} />
        <Campo
          rotulo="Vaga"
          ajuda="Deixe em branco se o cliente não tiver vaga fixa"
          erro={errors.vaga?.message}
          {...register('vaga', { setValueAs: (v: string) => (v.trim() === '' ? null : v) })}
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
      <div className="flex flex-wrap gap-4">
        <Botao type="submit" disabled={isSubmitting}>
          Salvar alterações
        </Botao>
        <Botao variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

function FormularioRenovacao({
  detalhe,
  aoFechar,
}: {
  detalhe: MensalistaDetalhe;
  aoFechar: () => void;
}) {
  const renovar = useRenovarContrato();
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RenovacaoEntrada>({
    resolver: zodResolver(renovacaoSchema),
    defaultValues: { meses: 1 },
  });

  async function enviar(dados: RenovacaoEntrada) {
    setErroGeral(null);
    try {
      await renovar.mutateAsync({ contratoId: detalhe.contrato.id, ...dados });
      aoFechar();
    } catch (erro) {
      setErroGeral(aplicarErroDeApi(erro, setError, CAMPOS_RENOVACAO));
    }
  }

  return (
    <form
      onSubmit={handleSubmit(enviar)}
      noValidate
      className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold">Renovar contrato</h2>
        <p className="text-base text-texto-suave">
          Estende o vencimento sem registrar pagamento, por exemplo num acordo com o cliente. O
          motivo fica no histórico.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Campo rotulo="Motivo" erro={errors.motivo?.message} {...register('motivo')} />
        <Campo
          rotulo="Meses"
          type="number"
          min={1}
          max={12}
          erro={errors.meses?.message}
          {...register('meses', { valueAsNumber: true })}
        />
      </div>
      {erroGeral && <MensagemErro mensagem={erroGeral} />}
      <div className="flex flex-wrap gap-4">
        <Botao type="submit" disabled={isSubmitting}>
          Confirmar renovação
        </Botao>
        <Botao variante="secundario" onClick={aoFechar}>
          Cancelar
        </Botao>
      </div>
    </form>
  );
}

function ConteudoDoDetalhe({ detalhe }: { detalhe: MensalistaDetalhe }) {
  const { sessao } = useSessao();
  const { contrato } = detalhe;
  const podeAlterar = sessao?.perfil === 'proprietario' && contrato.status === 'ativo';

  const [painel, setPainel] = useState<'edicao' | 'renovacao' | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [erroAoEncerrar, setErroAoEncerrar] = useState<string | null>(null);
  const encerrar = useEncerrarContrato();

  const fecharPainel = useCallback(() => setPainel(null), []);
  const cancelarEncerramento = useCallback(() => {
    setEncerrando(false);
    setErroAoEncerrar(null);
  }, []);

  async function confirmarEncerramento() {
    setErroAoEncerrar(null);
    try {
      await encerrar.mutateAsync(contrato.id);
      setEncerrando(false);
    } catch (erro) {
      setErroAoEncerrar(erro instanceof Error ? erro.message : 'Não foi possível encerrar.');
    }
  }

  return (
    <>
      <CabecalhoPagina
        titulo={detalhe.nome}
        subtitulo={`Contrato ${TIPO_DO_CONTRATO[contrato.tipo].toLowerCase()}`}
        acao={
          <LinkBotao to="/mensalistas" variante="secundario">
            Voltar à lista
          </LinkBotao>
        }
      />

      <section className="flex flex-col gap-6 rounded-lg border border-borda bg-superficie p-6">
        <h2 className="text-xl font-bold">Dados</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Dado rotulo="Telefone">{formatarTelefone(detalhe.telefone)}</Dado>
          <Dado rotulo="Placa">{formatarPlaca(detalhe.placa)}</Dado>
          <Dado rotulo="Categoria">{CATEGORIA[detalhe.categoria]}</Dado>
          <Dado rotulo="Vaga">{contrato.vaga ?? '—'}</Dado>
          <Dado rotulo="Valor">{formatarReais(contrato.valor)}</Dado>
          <Dado rotulo="Dia do vencimento">{contrato.diaVencimento}</Dado>
          <Dado rotulo="Início">{formatarData(contrato.inicio)}</Dado>
          {contrato.status === 'ativo' ? (
            <>
              <Dado rotulo="Próximo vencimento">{formatarData(contrato.vencimento)}</Dado>
              <Dado rotulo="Situação">
                <EtiquetaSituacao situacao={contrato.situacao} />
              </Dado>
            </>
          ) : (
            <Dado rotulo="Situação">
              {`Contrato encerrado em ${contrato.encerradoEm ? formatarData(contrato.encerradoEm) : '—'}`}
            </Dado>
          )}
        </dl>

        {podeAlterar && painel === null && (
          <div className="flex flex-wrap gap-4">
            <Botao onClick={() => setPainel('edicao')}>Editar dados</Botao>
            <Botao variante="secundario" onClick={() => setPainel('renovacao')}>
              Renovar contrato
            </Botao>
            <Botao variante="secundario" onClick={() => setEncerrando(true)}>
              Encerrar contrato
            </Botao>
          </div>
        )}
      </section>

      {podeAlterar && painel === 'edicao' && (
        <FormularioEdicao detalhe={detalhe} aoFechar={fecharPainel} />
      )}
      {podeAlterar && painel === 'renovacao' && (
        <FormularioRenovacao detalhe={detalhe} aoFechar={fecharPainel} />
      )}

      <section className="rounded-lg border border-borda bg-superficie p-6">
        <h2 className="mb-4 text-xl font-bold">Histórico</h2>
        <Tabela legenda="Histórico do contrato" cabecalhos={['Data', 'Evento', 'Detalhes', 'Por']}>
          {detalhe.historico.map((h) => (
            <tr key={h.id}>
              <td className="px-2 py-3">{formatarData(h.em)}</td>
              <td className="px-2 py-3 font-semibold">{NOME_DO_EVENTO[h.evento]}</td>
              <td className="px-2 py-3">{h.detalhes ?? '—'}</td>
              <td className="px-2 py-3">{h.usuario ?? '—'}</td>
            </tr>
          ))}
        </Tabela>
      </section>

      {encerrando && (
        <DialogoEncerrar
          nome={detalhe.nome}
          enviando={encerrar.isPending}
          erro={erroAoEncerrar}
          onConfirmar={() => void confirmarEncerramento()}
          onCancelar={cancelarEncerramento}
        />
      )}
    </>
  );
}

export function DetalheMensalista() {
  const id = Number(useParams().id);
  const consulta = useMensalista(id);

  const naoEncontrado =
    !Number.isInteger(id) ||
    id <= 0 ||
    (consulta.error instanceof ErroApiCliente && consulta.error.status === 404);

  if (naoEncontrado) {
    return (
      <EstadoVazio
        titulo="Mensalista não encontrado"
        orientacao="Ele pode ter sido removido ou o endereço está errado."
        acao={<LinkBotao to="/mensalistas">Voltar à lista</LinkBotao>}
      />
    );
  }
  if (consulta.isError) {
    return (
      <MensagemErro
        mensagem={
          consulta.error instanceof Error ? consulta.error.message : 'Não foi possível carregar.'
        }
        onTentarDeNovo={() => void consulta.refetch()}
      />
    );
  }
  if (!consulta.data) return <Carregando texto="Carregando o mensalista…" />;
  return <ConteudoDoDetalhe detalhe={consulta.data} />;
}
