import {
  formatarPlaca,
  formatarReais,
  type Categoria,
  type Situacao,
  type TipoContrato,
} from '@estacionafacil/shared';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CabecalhoPagina } from '../../app/CabecalhoPagina';
import { Botao } from '../../components/ui/Botao';
import { Campo } from '../../components/ui/Campo';
import { Carregando } from '../../components/ui/Carregando';
import { EstadoVazio } from '../../components/ui/EstadoVazio';
import { EtiquetaSituacao } from '../../components/ui/EtiquetaSituacao';
import { LinkBotao } from '../../components/ui/LinkBotao';
import { MensagemErro } from '../../components/ui/MensagemErro';
import { Selecao } from '../../components/ui/Selecao';
import { Tabela } from '../../components/ui/Tabela';
import { formatarData } from '../../lib/formatar';
import { useSessao } from '../../lib/sessao';
import { useMensalistas } from './api';

const ESPERA_DA_BUSCA_MS = 300;

const OPCOES_SITUACAO = [
  { valor: '', texto: 'Todas' },
  { valor: 'em_dia', texto: 'Em dia' },
  { valor: 'a_vencer', texto: 'A vencer' },
  { valor: 'vencido', texto: 'Em atraso' },
];
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

const NOME_DA_CATEGORIA: Record<Categoria, string> = { carro: 'Carro', moto: 'Moto' };

export function ListaMensalistas() {
  const { sessao } = useSessao();
  const ehProprietario = sessao?.perfil === 'proprietario';

  const [busca, setBusca] = useState('');
  const [buscaAplicada, setBuscaAplicada] = useState('');
  const [situacao, setSituacao] = useState<Situacao | ''>('');
  const [categoria, setCategoria] = useState<Categoria | ''>('');
  const [tipo, setTipo] = useState<TipoContrato | ''>('');
  const [pagina, setPagina] = useState(1);

  // Espera o usuário parar de digitar antes de consultar a API.
  useEffect(() => {
    const espera = setTimeout(() => {
      setBuscaAplicada(busca.trim());
      setPagina(1);
    }, ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [busca]);

  const consulta = useMensalistas({
    busca: buscaAplicada,
    situacao: situacao || undefined,
    categoria: categoria || undefined,
    tipo: tipo || undefined,
    pagina,
  });

  const semFiltros = !buscaAplicada && !situacao && !categoria && !tipo;
  const novo = ehProprietario ? (
    <LinkBotao to="/mensalistas/novo">Novo mensalista</LinkBotao>
  ) : undefined;

  function mudarFiltro<T>(definir: (valor: T) => void) {
    return (valor: T) => {
      definir(valor);
      setPagina(1);
    };
  }

  const { data } = consulta;
  const totalDePaginas = data ? Math.max(1, Math.ceil(data.total / data.porPagina)) : 1;

  return (
    <>
      <CabecalhoPagina
        titulo="Mensalistas"
        subtitulo="Clientes com vaga contratada e a data de vencimento de cada um"
        acao={novo}
      />

      <section
        aria-label="Filtros"
        className="grid grid-cols-2 gap-4 rounded-lg border border-borda bg-superficie p-4 sm:p-6 xl:grid-cols-4"
      >
        {/* No celular a busca ocupa a linha toda e os seletores ficam dois a dois (menos rolagem). */}
        <div className="col-span-2 xl:col-span-1">
          <Campo
            rotulo="Buscar por nome ou placa"
            type="search"
            valor={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <Selecao
          rotulo="Situação"
          opcoes={OPCOES_SITUACAO}
          value={situacao}
          onChange={(e) => mudarFiltro(setSituacao)(e.target.value as Situacao | '')}
        />
        <Selecao
          rotulo="Categoria"
          opcoes={OPCOES_CATEGORIA}
          value={categoria}
          onChange={(e) => mudarFiltro(setCategoria)(e.target.value as Categoria | '')}
        />
        <Selecao
          rotulo="Tipo de contrato"
          opcoes={OPCOES_TIPO}
          value={tipo}
          onChange={(e) => mudarFiltro(setTipo)(e.target.value as TipoContrato | '')}
        />
      </section>

      {consulta.isPending && <Carregando texto="Carregando os mensalistas…" />}
      {consulta.isError && (
        <MensagemErro
          mensagem={
            consulta.error instanceof Error
              ? consulta.error.message
              : 'Não foi possível carregar os mensalistas.'
          }
          onTentarDeNovo={() => void consulta.refetch()}
        />
      )}

      {data && data.total === 0 && semFiltros && (
        <EstadoVazio
          titulo={
            ehProprietario
              ? 'Nenhum mensalista ainda. Cadastre o primeiro.'
              : 'Nenhum mensalista ainda.'
          }
          orientacao={
            ehProprietario
              ? 'Os mensalistas cadastrados aparecem aqui, com a data de vencimento de cada um.'
              : 'Quando o proprietário cadastrar os mensalistas, eles aparecem aqui.'
          }
          acao={novo}
        />
      )}
      {data && data.total === 0 && !semFiltros && (
        <EstadoVazio
          titulo="Nenhum mensalista encontrado com esses filtros."
          orientacao="Confira o nome ou a placa, ou tire algum filtro."
        />
      )}

      {data && data.total > 0 && (
        <section className="flex flex-col gap-4 rounded-lg border border-borda bg-superficie p-6">
          <Tabela
            legenda="Mensalistas"
            cabecalhos={['Nome', 'Placa', 'Categoria', 'Vaga', 'Vencimento', 'Valor', 'Situação']}
          >
            {data.itens.map((m) => (
              <tr key={m.id}>
                <td className="px-2 py-3 font-semibold">
                  <Link
                    to={`/mensalistas/${m.id}`}
                    className="text-primaria underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria"
                  >
                    {m.nome}
                  </Link>
                </td>
                <td className="px-2 py-3">{formatarPlaca(m.placa)}</td>
                <td className="px-2 py-3">{NOME_DA_CATEGORIA[m.categoria]}</td>
                <td className="px-2 py-3">{m.vaga ?? '—'}</td>
                <td className="px-2 py-3">{formatarData(m.vencimento)}</td>
                <td className="px-2 py-3 font-semibold">{formatarReais(m.valor)}</td>
                <td className="px-2 py-3">
                  <EtiquetaSituacao situacao={m.situacao} />
                </td>
              </tr>
            ))}
          </Tabela>

          <nav aria-label="Páginas" className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-base text-texto-suave">{`${data.total} mensalista${data.total === 1 ? '' : 's'}`}</p>
            <div className="flex items-center gap-4">
              <Botao
                variante="secundario"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </Botao>
              <p className="text-base">{`Página ${data.pagina} de ${totalDePaginas}`}</p>
              <Botao
                variante="secundario"
                disabled={pagina >= totalDePaginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Próxima
              </Botao>
            </div>
          </nav>
        </section>
      )}
    </>
  );
}
