import { formatarPlaca, formatarReais, type FormaPagamento } from '@estacionafacil/shared';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { CartaoKpi } from '../../components/ui/CartaoKpi';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { usePainel } from './api';
import { Link } from 'react-router-dom';
import { LinkBotao } from '../../components/ui/LinkBotao';
import { Icone } from '../../components/ui/Icone';
import { hoje } from '../../lib/hoje';
import { GraficoReceitaDespesa } from '../../components/GraficoReceitaDespesa';
import { GraficoSituacao } from './GraficoSituacao';

const FORMAS: Record<FormaPagamento, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  debito: 'Débito',
  credito: 'Crédito',
};

/** "2026-10-26" → "26/10". */
const diaEMes = (data: string) => `${data.slice(8, 10)}/${data.slice(5, 7)}`;

function formatarVariacao(variacao: number | null): string | undefined {
  if (variacao === null) return undefined;
  return `${variacao > 0 ? '+' : ''}${variacao}%`;
}

export function Painel() {
  const { data, isPending, isError, error, refetch } = usePainel();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-texto-suave">
        <p className="flex items-center gap-2">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-ok" />
          Sua operação em um só lugar
        </p>
        <p className="flex items-center gap-2 capitalize">
          <Icone nome="vencimentos" className="size-4" />
          {new Intl.DateTimeFormat('pt-BR', {
            month: 'long',
            year: 'numeric',
            timeZone: 'America/Sao_Paulo',
          }).format(new Date(`${hoje()}T12:00:00-03:00`))}
        </p>
      </div>
      <CabecalhoPagina
        titulo="Painel"
        subtitulo="Acompanhe os contratos e o resultado do seu estacionamento."
        acao={
          <LinkBotao to="/recebimentos">
            <span aria-hidden="true" className="text-lg">
              +
            </span>
            Registrar recebimento
          </LinkBotao>
        }
      />
      {isPending && <Carregando texto="Carregando o painel…" />}
      {isError && (
        <MensagemErro
          mensagem={error instanceof Error ? error.message : 'Não foi possível carregar o painel.'}
          onTentarDeNovo={() => void refetch()}
        />
      )}
      {data && (
        <>
          <div className="kpis grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <CartaoKpi
              tom="primario"
              icone="mensalistas"
              titulo="Mensalistas ativos"
              para="/mensalistas"
              valor={String(data.mensalistasAtivos)}
              rodape={`${data.novosNoMes} novos no mês`}
            />
            <CartaoKpi
              tom="atencao"
              icone="alerta"
              titulo="Contratos vencidos"
              para="/vencimentos?situacao=vencido"
              valor={String(data.vencidos.quantidade)}
              rodape={`${formatarReais(data.vencidos.total)} em aberto`}
            />
            <CartaoKpi
              tom="primario"
              icone="vencimentos"
              titulo="A vencer em 7 dias"
              para="/vencimentos?situacao=a_vencer"
              valor={String(data.aVencer.quantidade)}
              rodape={`${formatarReais(data.aVencer.total)} a receber`}
            />
            <CartaoKpi
              tom="positivo"
              icone="fluxo"
              titulo="Resultado do mês"
              para="/fluxo-de-caixa"
              valor={formatarReais(data.resultadoDoMes.resultado)}
              variacao={formatarVariacao(data.resultadoDoMes.variacao)}
              rodape={`Receitas ${formatarReais(data.resultadoDoMes.receitas)} · Despesas ${formatarReais(data.resultadoDoMes.despesas)}`}
            />
          </div>

          <div className="grid gap-5 xl:grid-cols-3">
            <section className="superficie min-w-0 p-5 sm:p-6 xl:col-span-2">
              <div className="mb-6">
                <h2 className="text-base font-semibold">Receitas e despesas</h2>
                <p className="mt-1 text-xs text-texto-suave">A evolução do caixa, mês a mês</p>
              </div>
              <GraficoReceitaDespesa serie={data.serieMensal} />
            </section>
            <section className="superficie min-w-0 p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold">Situação dos contratos</h2>
              <GraficoSituacao situacao={data.situacao} />
            </section>
          </div>

          <section className="superficie min-w-0 p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Últimos recebimentos</h2>
                <p className="mt-1 text-xs text-texto-suave">
                  Os pagamentos mais recentes do estacionamento
                </p>
              </div>
              <Link
                to="/recebimentos"
                className="flex min-h-11 items-center gap-2 rounded text-xs font-semibold text-primaria hover:underline focus-visible:outline-2 focus-visible:outline-primaria"
              >
                Ver recebimentos
                <Icone nome="seta" className="size-4" />
              </Link>
            </div>
            {data.ultimosRecebimentos.length === 0 ? (
              <EstadoVazio
                titulo="Nenhum recebimento ainda"
                orientacao="Os pagamentos registrados aparecem aqui."
              />
            ) : (
              <Tabela
                legenda="Últimos recebimentos"
                cabecalhos={['Mensalista', 'Placa', 'Forma', 'Data', 'Valor']}
              >
                {data.ultimosRecebimentos.map((r) => (
                  <tr key={r.id}>
                    <td className="px-2 py-3 font-semibold">{r.mensalista}</td>
                    <td className="px-2 py-3">{formatarPlaca(r.placa)}</td>
                    <td className="px-2 py-3">{FORMAS[r.forma]}</td>
                    <td className="px-2 py-3">{diaEMes(r.pagoEm)}</td>
                    <td className="px-2 py-3 font-semibold">{formatarReais(r.valor)}</td>
                  </tr>
                ))}
              </Tabela>
            )}
          </section>
        </>
      )}
    </>
  );
}
