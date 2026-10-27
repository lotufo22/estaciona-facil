import {
  CATEGORIAS,
  formatarPlaca,
  formatarReais,
  TIPOS_CONTRATO,
  type Categoria,
  type ResumoSituacao,
  type Situacao,
  type TipoContrato,
} from '@estacionafacil/shared';
import { useSearchParams } from 'react-router-dom';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { EtiquetaSituacao } from '../../components/ui/EtiquetaSituacao';
import { LinkBotao } from '../../components/ui/LinkBotao';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Selecao } from '../../components/ui/Selecao';
import { Tabela } from '../../components/ui/Tabela';
import { formatarData } from '../../lib/formatar';
import { useVencimentos } from './api';

const SITUACOES: readonly Situacao[] = ['vencido', 'a_vencer', 'em_dia'];

const CHIPS: { valor: Situacao | ''; texto: string }[] = [
  { valor: '', texto: 'Todos' },
  { valor: 'vencido', texto: 'Em atraso' },
  { valor: 'a_vencer', texto: 'A vencer' },
  { valor: 'em_dia', texto: 'Em dia' },
];

const TITULO_DO_TOTAL: Record<Situacao, string> = {
  vencido: 'Vencidos',
  a_vencer: 'A vencer',
  em_dia: 'Em dia',
};

const OPCOES_CATEGORIA = [
  { valor: '', texto: 'Todas' },
  { valor: 'carro', texto: 'Carro' },
  { valor: 'moto', texto: 'Moto' },
];
const OPCOES_TIPO = [
  { valor: '', texto: 'Todos' },
  { valor: 'mensal', texto: 'Mensal' },
  { valor: 'semanal', texto: 'Semanal' },
];

/** Lê um parâmetro da URL e só aceita valores conhecidos (a URL pode vir de qualquer lugar). */
function lerParametro<T extends string>(
  parametros: URLSearchParams,
  nome: string,
  validos: readonly T[],
): T | undefined {
  const valor = parametros.get(nome);
  return validos.find((v) => v === valor);
}

function descreverQuantidade(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? 'contrato' : 'contratos'}`;
}

function Total({ titulo, resumo, tom }: { titulo: string; resumo: ResumoSituacao; tom: string }) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg border-l-8 bg-superficie p-6 ${tom}`}>
      <p className="text-base font-semibold text-texto-suave">{titulo}</p>
      <p className="text-2xl font-bold">{descreverQuantidade(resumo.quantidade)}</p>
      <p className="text-base">{formatarReais(resumo.total)}</p>
    </div>
  );
}

const TOM_DO_TOTAL: Record<Situacao, string> = {
  vencido: 'border-atraso',
  a_vencer: 'border-alerta',
  em_dia: 'border-ok',
};

export function Vencimentos() {
  const [parametros, setParametros] = useSearchParams();
  const situacao = lerParametro<Situacao>(parametros, 'situacao', SITUACOES);
  const categoria = lerParametro<Categoria>(parametros, 'categoria', CATEGORIAS);
  const tipo = lerParametro<TipoContrato>(parametros, 'tipo', TIPOS_CONTRATO);

  const consulta = useVencimentos({ situacao, categoria, tipo });

  function filtrar(nome: string, valor: string) {
    setParametros(
      (atuais) => {
        const novos = new URLSearchParams(atuais);
        if (valor) novos.set(nome, valor);
        else novos.delete(nome);
        return novos;
      },
      { replace: true },
    );
  }

  const { data } = consulta;

  return (
    <>
      <CabecalhoPagina
        titulo="Vencimentos"
        subtitulo="Quem está em atraso, quem vence nos próximos 7 dias e quem está em dia"
      />

      {consulta.isPending && <Carregando texto="Carregando os vencimentos…" />}
      {consulta.isError && (
        <MensagemErro
          mensagem={
            consulta.error instanceof Error
              ? consulta.error.message
              : 'Não foi possível carregar os vencimentos.'
          }
          onTentarDeNovo={() => void consulta.refetch()}
        />
      )}

      {data && (
        <>
          <section aria-label="Totais" className="grid gap-6 md:grid-cols-3">
            {SITUACOES.map((s) => (
              <Total
                key={s}
                titulo={TITULO_DO_TOTAL[s]}
                resumo={data.totais[s]}
                tom={TOM_DO_TOTAL[s]}
              />
            ))}
          </section>

          <section
            aria-label="Filtros"
            className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6"
          >
            <div className="flex flex-wrap gap-3">
              {CHIPS.map(({ valor, texto }) => {
                const ativo = (situacao ?? '') === valor;
                return (
                  <Botao
                    key={texto}
                    variante={ativo ? 'primario' : 'secundario'}
                    aria-pressed={ativo}
                    onClick={() => filtrar('situacao', valor)}
                  >
                    {texto}
                  </Botao>
                );
              })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:max-w-xl">
              <Selecao
                rotulo="Categoria"
                opcoes={OPCOES_CATEGORIA}
                value={categoria ?? ''}
                onChange={(e) => filtrar('categoria', e.target.value)}
              />
              <Selecao
                rotulo="Tipo de contrato"
                opcoes={OPCOES_TIPO}
                value={tipo ?? ''}
                onChange={(e) => filtrar('tipo', e.target.value)}
              />
            </div>
          </section>

          {data.itens.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum contrato encontrado."
              orientacao="Não há contratos para essa combinação de filtros."
            />
          ) : (
            <section className="rounded-lg border border-borda bg-superficie p-6">
              <Tabela
                legenda="Contratos por data de vencimento"
                cabecalhos={[
                  'Mensalista',
                  'Placa',
                  'Vaga',
                  'Vencimento',
                  'Valor',
                  'Situação',
                  'Ação',
                ]}
              >
                {data.itens.map((m) => (
                  <tr key={m.contratoId}>
                    <td className="px-2 py-3 font-semibold">{m.nome}</td>
                    <td className="px-2 py-3">{formatarPlaca(m.placa)}</td>
                    <td className="px-2 py-3">{m.vaga ?? '—'}</td>
                    <td className="px-2 py-3">{formatarData(m.vencimento)}</td>
                    <td className="px-2 py-3 font-semibold">{formatarReais(m.valor)}</td>
                    <td className="px-2 py-3">
                      <EtiquetaSituacao situacao={m.situacao} />
                    </td>
                    <td className="px-2 py-3">
                      <LinkBotao
                        to={`/recebimentos?contrato=${m.contratoId}`}
                        variante="secundario"
                        aria-label={`Registrar pagamento de ${m.nome}`}
                      >
                        Registrar pagamento
                      </LinkBotao>
                    </td>
                  </tr>
                ))}
              </Tabela>
            </section>
          )}
        </>
      )}
    </>
  );
}
