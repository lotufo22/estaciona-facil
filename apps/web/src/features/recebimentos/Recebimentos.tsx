import { formatarPlaca, formatarReais, type PagamentoItem } from '@estacionafacil/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { DialogoEstorno } from '../../components/DialogoEstorno';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { EtiquetaEstorno } from '../../components/ui/EtiquetaEstorno';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { formatarData } from '../../lib/formatar';
import { hoje } from '../../lib/hoje';
import { useSessao } from '../../lib/sessao';
import { useEstornarPagamento, usePagamentos } from './api';
import { Comprovante, NOME_DA_FORMA } from './Comprovante';
import { FormularioRecebimento } from './FormularioRecebimento';

interface ComprovanteAberto {
  numero: number;
  novoVencimento?: string;
}

export function Recebimentos() {
  const { sessao } = useSessao();
  const ehProprietario = sessao?.perfil === 'proprietario';
  const [parametros, setParametros] = useSearchParams();
  const contrato = Number(parametros.get('contrato'));
  const contratoDaUrl = Number.isInteger(contrato) && contrato > 0 ? contrato : undefined;

  const [comprovante, setComprovante] = useState<ComprovanteAberto | null>(null);
  const [dia, setDia] = useState(() => hoje());
  const [paraEstornar, setParaEstornar] = useState<PagamentoItem | null>(null);
  const lancamentos = usePagamentos({ de: dia, ate: dia });
  const estornar = useEstornarPagamento();
  const ehHoje = dia === hoje();

  function limparContrato() {
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        novos.delete('contrato');
        return novos;
      },
      { replace: true },
    );
  }

  return (
    <>
      <CabecalhoPagina
        titulo="Recebimentos"
        subtitulo="Registre o pagamento de um mensalista e entregue o comprovante"
      />

      <div className="nao-imprimir grid gap-6 lg:grid-cols-2">
        <FormularioRecebimento
          contratoDaUrl={contratoDaUrl}
          aoLimparContrato={limparContrato}
          aoRegistrar={({ pagamento, novoVencimento }) => {
            setComprovante({ numero: pagamento.id, novoVencimento });
            // A lista passa para o dia do recebimento, para ele aparecer (e poder ser estornado).
            setDia(pagamento.pagoEm);
          }}
        />
        {!comprovante && (
          <div className="flex flex-col justify-center gap-2 rounded-lg border border-dashed border-borda p-6 text-texto-suave">
            <p className="text-xl font-semibold">Comprovante</p>
            <p className="text-base">Ele aparece aqui depois que você confirmar o recebimento.</p>
          </div>
        )}
      </div>

      {comprovante && (
        <Comprovante
          numero={comprovante.numero}
          novoVencimento={comprovante.novoVencimento}
          aoNovoRecebimento={() => setComprovante(null)}
        />
      )}

      <section className="nao-imprimir flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="text-xl font-bold">Lançamentos do dia</h2>
          <Campo
            rotulo="Dia dos lançamentos"
            type="date"
            valor={dia}
            max={hoje()}
            onChange={(e) => {
              if (e.target.value) setDia(e.target.value);
            }}
          />
        </div>
        {lancamentos.isPending && <Carregando texto="Carregando os lançamentos…" />}
        {lancamentos.isError && (
          <MensagemErro
            mensagem={
              lancamentos.error instanceof Error
                ? lancamentos.error.message
                : 'Não foi possível carregar os lançamentos.'
            }
            onTentarDeNovo={() => void lancamentos.refetch()}
          />
        )}
        {lancamentos.data && lancamentos.data.itens.length === 0 && (
          <EstadoVazio
            titulo={ehHoje ? 'Nenhum recebimento hoje' : 'Nenhum recebimento neste dia'}
            orientacao={
              ehHoje
                ? 'Os pagamentos registrados hoje aparecem aqui.'
                : `Não há recebimentos em ${formatarData(dia)}.`
            }
          />
        )}
        {lancamentos.data && lancamentos.data.itens.length > 0 && (
          <>
            <Tabela
              legenda={ehHoje ? 'Recebimentos de hoje' : `Recebimentos de ${formatarData(dia)}`}
              cabecalhos={['Nº', 'Mensalista', 'Placa', 'Forma', 'Valor', 'Comprovante']}
            >
              {lancamentos.data.itens.map((p) => (
                <tr key={p.id}>
                  <td className="px-2 py-3">{p.numero}</td>
                  <td className="px-2 py-3 font-semibold">{p.mensalista}</td>
                  <td className="px-2 py-3">{formatarPlaca(p.placa)}</td>
                  <td className="px-2 py-3">{NOME_DA_FORMA[p.forma]}</td>
                  <td className="px-2 py-3 font-semibold">
                    <div className="flex flex-col items-start gap-1">
                      <span className={p.estornado ? 'line-through' : undefined}>
                        {formatarReais(p.valor)}
                      </span>
                      {p.estornado && <EtiquetaEstorno />}
                    </div>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Botao
                        variante="secundario"
                        aria-label={`Ver comprovante ${p.numero}`}
                        onClick={() => setComprovante({ numero: p.id })}
                      >
                        Ver comprovante
                      </Botao>
                      {ehProprietario && !p.estornado && (
                        <Botao
                          variante="secundario"
                          aria-label={`Estornar recebimento ${p.numero}`}
                          onClick={() => setParaEstornar(p)}
                        >
                          Estornar
                        </Botao>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </Tabela>
            <p className="text-right text-lg font-bold">
              {`Total do dia: ${formatarReais(lancamentos.data.total)}`}
            </p>
          </>
        )}
      </section>

      {paraEstornar && (
        <DialogoEstorno
          titulo="Estornar recebimento?"
          aviso={`Recebimento nº ${paraEstornar.numero} de ${paraEstornar.mensalista}, no valor de ${formatarReais(paraEstornar.valor)}. O vencimento do contrato volta ao que era antes dele. Nada é apagado: o recebimento fica marcado como estornado.`}
          aoConfirmar={async (motivo) => {
            await estornar.mutateAsync({ id: paraEstornar.id, motivo });
            setParaEstornar(null);
          }}
          aoFechar={() => setParaEstornar(null)}
        />
      )}
    </>
  );
}
