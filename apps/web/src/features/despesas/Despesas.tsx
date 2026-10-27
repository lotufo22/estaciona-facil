import { formatarReais, ultimoDiaDoMes } from '@estacionafacil/shared';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { formatarData } from '../../lib/formatar';
import { hoje } from '../../lib/hoje';
import { useSessao } from '../../lib/sessao';
import { useAlternarRecorrencia, useDespesas, useRecorrencias } from './api';
import { FormularioDespesa } from './FormularioDespesa';

const NOME_DO_TIPO = { fixa: 'Fixa', variavel: 'Variável' } as const;

/** Do primeiro ao último dia do mês de `hoje` (AAAA-MM-DD) e o nome do mês por extenso. */
function mesDe(hoje: string) {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  const prefixo = hoje.slice(0, 7);
  return {
    de: `${prefixo}-01`,
    ate: `${prefixo}-${String(ultimoDiaDoMes(ano, mes)).padStart(2, '0')}`,
    nome: new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  };
}

function DespesasDoMes({ de, ate }: { de: string; ate: string }) {
  const consulta = useDespesas({ de, ate });
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6">
      <h2 className="text-xl font-bold">Despesas do mês</h2>
      {consulta.isPending && <Carregando texto="Carregando as despesas…" />}
      {consulta.isError && (
        <MensagemErro
          mensagem={
            consulta.error instanceof Error
              ? consulta.error.message
              : 'Não foi possível carregar as despesas.'
          }
          onTentarDeNovo={() => void consulta.refetch()}
        />
      )}
      {consulta.data && consulta.data.itens.length === 0 && (
        <EstadoVazio
          titulo="Nenhuma despesa neste mês."
          orientacao="As despesas lançadas aparecem aqui."
        />
      )}
      {consulta.data && consulta.data.itens.length > 0 && (
        <>
          <Tabela legenda="Despesas do mês" cabecalhos={['Data', 'Descrição', 'Tipo', 'Valor']}>
            {consulta.data.itens.map((d) => (
              <tr key={d.id}>
                <td className="px-2 py-3">{formatarData(d.data)}</td>
                <td className="px-2 py-3 font-semibold">{d.descricao}</td>
                <td className="px-2 py-3">{NOME_DO_TIPO[d.tipo]}</td>
                <td className="px-2 py-3 font-semibold">{formatarReais(d.valor)}</td>
              </tr>
            ))}
          </Tabela>
          <p className="text-right text-lg font-bold">
            {`Total do mês: ${formatarReais(consulta.data.total)}`}
          </p>
        </>
      )}
    </section>
  );
}

function DespesasFixas({ podePausar }: { podePausar: boolean }) {
  const consulta = useRecorrencias();
  const alternar = useAlternarRecorrencia();
  const cabecalhos = ['Despesa', 'Quando', 'Valor', 'Situação', ...(podePausar ? ['Ação'] : [])];

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6">
      <h2 className="text-xl font-bold">Despesas fixas</h2>
      {consulta.isPending && <Carregando texto="Carregando as despesas fixas…" />}
      {consulta.isError && (
        <MensagemErro
          mensagem={
            consulta.error instanceof Error
              ? consulta.error.message
              : 'Não foi possível carregar as despesas fixas.'
          }
          onTentarDeNovo={() => void consulta.refetch()}
        />
      )}
      {alternar.isError && (
        <MensagemErro
          mensagem={
            alternar.error instanceof Error
              ? alternar.error.message
              : 'Não foi possível alterar a despesa fixa.'
          }
        />
      )}
      {consulta.data && consulta.data.itens.length === 0 && (
        <EstadoVazio
          titulo="Nenhuma despesa fixa cadastrada."
          orientacao="Ao lançar uma despesa fixa, ela passa a se repetir todo mês."
        />
      )}
      {consulta.data && consulta.data.itens.length > 0 && (
        <Tabela legenda="Despesas fixas" cabecalhos={cabecalhos}>
          {consulta.data.itens.map((r) => (
            <tr key={r.id}>
              <td className="px-2 py-3 font-semibold">{r.descricao}</td>
              <td className="px-2 py-3">{`Todo dia ${r.diaDoMes}`}</td>
              <td className="px-2 py-3 font-semibold">{formatarReais(r.valor)}</td>
              <td className="px-2 py-3">{r.ativa ? 'Ativa' : 'Pausada'}</td>
              {podePausar && (
                <td className="px-2 py-3">
                  <Botao
                    variante="secundario"
                    disabled={alternar.isPending}
                    aria-label={`${r.ativa ? 'Pausar' : 'Retomar'} ${r.descricao}`}
                    onClick={() => alternar.mutate({ id: r.id, ativa: !r.ativa })}
                  >
                    {r.ativa ? 'Pausar' : 'Retomar'}
                  </Botao>
                </td>
              )}
            </tr>
          ))}
        </Tabela>
      )}
    </section>
  );
}

export function Despesas() {
  const { sessao } = useSessao();
  const mes = mesDe(hoje());

  return (
    <>
      <CabecalhoPagina titulo="Despesas" subtitulo={`Lançamentos de ${mes.nome}`} />
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <FormularioDespesa />
        <div className="flex flex-col gap-6 lg:col-span-2">
          <DespesasDoMes de={mes.de} ate={mes.ate} />
          <DespesasFixas podePausar={sessao?.perfil === 'proprietario'} />
        </div>
      </div>
    </>
  );
}
