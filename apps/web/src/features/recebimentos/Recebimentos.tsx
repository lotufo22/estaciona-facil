import { formatarPlaca, formatarReais } from '@estacionafacil/shared';
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Tabela } from '../../components/ui/Tabela';
import { hoje } from '../../lib/hoje';
import { usePagamentos } from './api';
import { Comprovante, NOME_DA_FORMA } from './Comprovante';
import { FormularioRecebimento } from './FormularioRecebimento';

interface ComprovanteAberto {
  numero: number;
  novoVencimento?: string;
}

export function Recebimentos() {
  const [parametros, setParametros] = useSearchParams();
  const contrato = Number(parametros.get('contrato'));
  const contratoDaUrl = Number.isInteger(contrato) && contrato > 0 ? contrato : undefined;

  const [comprovante, setComprovante] = useState<ComprovanteAberto | null>(null);
  const dia = hoje();
  const lancamentos = usePagamentos({ de: dia, ate: dia });

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
          aoRegistrar={({ pagamento, novoVencimento }) =>
            setComprovante({ numero: pagamento.id, novoVencimento })
          }
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
        <h2 className="text-xl font-bold">Lançamentos do dia</h2>
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
            titulo="Nenhum recebimento hoje"
            orientacao="Os pagamentos registrados hoje aparecem aqui."
          />
        )}
        {lancamentos.data && lancamentos.data.itens.length > 0 && (
          <>
            <Tabela
              legenda="Recebimentos de hoje"
              cabecalhos={['Nº', 'Mensalista', 'Placa', 'Forma', 'Valor', 'Comprovante']}
            >
              {lancamentos.data.itens.map((p) => (
                <tr key={p.id}>
                  <td className="px-2 py-3">{p.numero}</td>
                  <td className="px-2 py-3 font-semibold">{p.mensalista}</td>
                  <td className="px-2 py-3">{formatarPlaca(p.placa)}</td>
                  <td className="px-2 py-3">{NOME_DA_FORMA[p.forma]}</td>
                  <td className="px-2 py-3 font-semibold">{formatarReais(p.valor)}</td>
                  <td className="px-2 py-3">
                    <Botao
                      variante="secundario"
                      aria-label={`Ver comprovante ${p.numero}`}
                      onClick={() => setComprovante({ numero: p.id })}
                    >
                      Ver comprovante
                    </Botao>
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
    </>
  );
}
