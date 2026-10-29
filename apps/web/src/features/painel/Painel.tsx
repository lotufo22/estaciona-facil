import { formatarPlaca, formatarReais, type FormaPagamento } from '@estacionafacil/shared';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { CartaoKpi } from '../../components/ui/CartaoKpi';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { usePainel } from './api';
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
      <CabecalhoPagina titulo="Painel" subtitulo="Como estão os contratos e o caixa do mês" />
      {isPending && <Carregando texto="Carregando o painel…" />}
      {isError && (
        <MensagemErro
          mensagem={error instanceof Error ? error.message : 'Não foi possível carregar o painel.'}
          onTentarDeNovo={() => void refetch()}
        />
      )}
      {data && (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-lg border border-borda bg-superficie p-6 lg:col-span-2">
              <h2 className="mb-4 text-xl font-bold">Receitas e despesas</h2>
              <GraficoReceitaDespesa serie={data.serieMensal} />
            </section>
            <section className="rounded-lg border border-borda bg-superficie p-6">
              <h2 className="mb-4 text-xl font-bold">Situação dos contratos</h2>
              <GraficoSituacao situacao={data.situacao} />
            </section>
          </div>

          <section className="rounded-lg border border-borda bg-superficie p-6">
            <h2 className="mb-4 text-xl font-bold">Últimos recebimentos</h2>
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
