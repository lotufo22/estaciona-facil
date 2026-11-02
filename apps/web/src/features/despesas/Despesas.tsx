import { formatarReais, type DespesaItem } from '@estacionafacil/shared';
import { useState } from 'react';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { DialogoEstorno } from '../../components/DialogoEstorno';
import { Botao } from '../../components/ui/Botao';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { EtiquetaEstorno } from '../../components/ui/EtiquetaEstorno';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { formatarData } from '../../lib/formatar';
import { hoje } from '../../lib/hoje';
import { mesDe } from '../../lib/periodo';
import { useSessao } from '../../lib/sessao';
import { useAlternarRecorrencia, useDespesas, useEstornarDespesa, useRecorrencias } from './api';
import { FormularioDespesa } from './FormularioDespesa';

const NOME_DO_TIPO = { fixa: 'Fixa', variavel: 'Variável' } as const;

function DespesasDoMes({
  de,
  ate,
  podeEstornar,
}: {
  de: string;
  ate: string;
  podeEstornar: boolean;
}) {
  const consulta = useDespesas({ de, ate });
  const estornar = useEstornarDespesa();
  const [paraEstornar, setParaEstornar] = useState<DespesaItem | null>(null);
  const cabecalhos = ['Data', 'Descrição', 'Tipo', 'Valor', ...(podeEstornar ? ['Ação'] : [])];
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-6">
      <h2 className="text-base font-semibold">Despesas do mês</h2>
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
          <Tabela legenda="Despesas do mês" cabecalhos={cabecalhos}>
            {consulta.data.itens.map((d) => (
              <tr key={d.id}>
                <td className="px-2 py-3">{formatarData(d.data)}</td>
                <td className="px-2 py-3 font-semibold">{d.descricao}</td>
                <td className="px-2 py-3">{NOME_DO_TIPO[d.tipo]}</td>
                <td className="px-2 py-3 font-semibold">
                  <div className="flex flex-col items-start gap-1">
                    <span className={d.estornado ? 'line-through' : undefined}>
                      {formatarReais(d.valor)}
                    </span>
                    {d.estornado && <EtiquetaEstorno feminino />}
                  </div>
                </td>
                {podeEstornar && (
                  <td className="px-2 py-3">
                    {!d.estornado && (
                      <Botao
                        variante="secundario"
                        aria-label={`Estornar despesa ${d.descricao}`}
                        onClick={() => setParaEstornar(d)}
                      >
                        Estornar
                      </Botao>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </Tabela>
          <p className="text-right text-lg font-bold">
            {`Total do mês: ${formatarReais(consulta.data.total)}`}
          </p>
        </>
      )}
      {paraEstornar && (
        <DialogoEstorno
          titulo="Estornar despesa?"
          aviso={`Despesa “${paraEstornar.descricao}”, no valor de ${formatarReais(paraEstornar.valor)}. Ela sai das somas do mês, mas continua na lista, marcada como estornada. Nada é apagado.`}
          aoConfirmar={async (motivo) => {
            await estornar.mutateAsync({ id: paraEstornar.id, motivo });
            setParaEstornar(null);
          }}
          aoFechar={() => setParaEstornar(null)}
        />
      )}
    </section>
  );
}

function DespesasFixas({ podePausar }: { podePausar: boolean }) {
  const consulta = useRecorrencias();
  const alternar = useAlternarRecorrencia();
  const cabecalhos = ['Despesa', 'Quando', 'Valor', 'Situação', ...(podePausar ? ['Ação'] : [])];

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-borda bg-superficie p-6">
      <h2 className="text-base font-semibold">Despesas fixas</h2>
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
          <DespesasDoMes
            de={mes.de}
            ate={mes.ate}
            podeEstornar={sessao?.perfil === 'proprietario'}
          />
          <DespesasFixas podePausar={sessao?.perfil === 'proprietario'} />
        </div>
      </div>
    </>
  );
}
