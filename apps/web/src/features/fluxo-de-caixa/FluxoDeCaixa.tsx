import {
  filtrosCaixaSchema,
  formatarReais,
  paraCentavos,
  type Categoria,
  type TipoContrato,
} from '@estacionafacil/shared';
import { useState } from 'react';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { GraficoReceitaDespesa } from '../../components/GraficoReceitaDespesa';
import { Campo } from '../../components/ui/Campo';
import { CartaoKpi } from '../../components/ui/CartaoKpi';
import { Carregando } from '../../components/ui/Carregando';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Selecao } from '../../components/ui/Selecao';
import { formatarData } from '../../lib/formatar';
import { hoje } from '../../lib/hoje';
import { mesDe } from '../../lib/periodo';
import { useCaixa } from './api';
import { GraficoFormas } from './GraficoFormas';

const AVISO_SEM_RESULTADO =
  'O resultado só é calculado sem filtro de contrato ou categoria, porque as despesas não pertencem a um deles.';

const OPCOES_TIPO = [
  { valor: '', texto: 'Todos' },
  { valor: 'mensal', texto: 'Mensal' },
  { valor: 'semanal', texto: 'Semanal' },
];
const OPCOES_CATEGORIA = [
  { valor: '', texto: 'Todas' },
  { valor: 'carro', texto: 'Carro' },
  { valor: 'moto', texto: 'Moto' },
];

export function FluxoDeCaixa() {
  const mes = mesDe(hoje());
  const [de, setDe] = useState(mes.de);
  const [ate, setAte] = useState(mes.ate);
  const [tipo, setTipo] = useState<TipoContrato | ''>('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');

  const filtros = { de, ate, tipo: tipo || undefined, categoria: categoria || undefined };
  const validacao = filtrosCaixaSchema.safeParse(filtros);
  const erros: Record<string, string> = {};
  if (!validacao.success) {
    for (const problema of validacao.error.issues) {
      erros[String(problema.path[0])] ??= problema.message;
    }
  }

  const consulta = useCaixa(filtros, { habilitado: validacao.success });
  const { data } = consulta;

  return (
    <>
      <CabecalhoPagina
        titulo="Fluxo de caixa"
        subtitulo="Receitas, despesas e resultado de qualquer período"
      />

      <section
        aria-label="Filtros"
        className="grid gap-4 rounded-lg border border-borda bg-superficie p-6 sm:grid-cols-2 xl:grid-cols-4"
      >
        <Campo
          rotulo="De"
          type="date"
          valor={de}
          erro={erros.de}
          onChange={(e) => setDe(e.target.value)}
        />
        <Campo
          rotulo="Até"
          type="date"
          valor={ate}
          erro={erros.ate}
          onChange={(e) => setAte(e.target.value)}
        />
        <Selecao
          rotulo="Tipo de contrato"
          opcoes={OPCOES_TIPO}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoContrato | '')}
        />
        <Selecao
          rotulo="Categoria"
          opcoes={OPCOES_CATEGORIA}
          value={categoria}
          onChange={(e) => setCategoria(e.target.value as Categoria | '')}
        />
      </section>

      {consulta.isPending && validacao.success && (
        <Carregando texto="Carregando o fluxo de caixa…" />
      )}
      {consulta.isError && (
        <MensagemErro
          mensagem={
            consulta.error instanceof Error
              ? consulta.error.message
              : 'Não foi possível carregar o fluxo de caixa.'
          }
          onTentarDeNovo={() => void consulta.refetch()}
        />
      )}

      {data && (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <CartaoKpi
              tom="primario"
              icone="recebimentos"
              titulo="Receitas do período"
              valor={formatarReais(data.receitas)}
              rodape={`${formatarData(data.de)} a ${formatarData(data.ate)}`}
            />
            <CartaoKpi
              tom="atencao"
              icone="despesas"
              titulo="Despesas do período"
              valor={formatarReais(data.despesas)}
              rodape={`${formatarData(data.de)} a ${formatarData(data.ate)}`}
            />
            {data.resultado !== null ? (
              <CartaoKpi
                tom={paraCentavos(data.resultado) < 0 ? 'atencao' : 'positivo'}
                icone="fluxo"
                titulo="Resultado do período"
                valor={formatarReais(data.resultado)}
                rodape="Receitas menos despesas"
              />
            ) : (
              <p
                role="note"
                className="rounded-lg border border-alerta bg-alerta-fundo p-6 text-base text-alerta"
              >
                {AVISO_SEM_RESULTADO}
              </p>
            )}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <section className="rounded-lg border border-borda bg-superficie p-6 lg:col-span-2">
              <h2 className="mb-4 text-xl font-bold">Receitas e despesas por mês</h2>
              <GraficoReceitaDespesa serie={data.serieMensal} />
            </section>
            <section className="rounded-lg border border-borda bg-superficie p-6">
              <h2 className="mb-4 text-xl font-bold">Divisão por forma de pagamento</h2>
              <GraficoFormas porForma={data.porForma} />
            </section>
          </div>
        </>
      )}
    </>
  );
}
