import type { TipoContrato } from './datas';
import type { Categoria, FormaPagamento, Perfil, TipoDespesa } from './enums';
import type { Situacao } from './situacao';

export interface Sessao {
  id: number;
  nome: string;
  perfil: Perfil;
}

export interface MensalistaItem {
  id: number;
  contratoId: number;
  nome: string;
  telefone: string;
  placa: string;
  categoria: Categoria;
  vaga: string | null;
  vencimento: string;
  valor: string;
  situacao: Situacao;
}

export interface PagamentoItem {
  id: number;
  /** Número do comprovante: é o próprio id do pagamento. */
  numero: number;
  mensalista: string;
  placa: string;
  valor: string;
  forma: FormaPagamento;
  pagoEm: string;
}

export interface ResumoSituacao {
  quantidade: number;
  /** Soma dos valores dos contratos, em texto decimal. */
  total: string;
}

export interface SerieMensalItem {
  /** Primeiro dia do mês, AAAA-MM-01. */
  mes: string;
  receitas: string;
  despesas: string;
}

export interface PainelResposta {
  mensalistasAtivos: number;
  novosNoMes: number;
  vencidos: ResumoSituacao;
  aVencer: ResumoSituacao;
  resultadoDoMes: {
    receitas: string;
    despesas: string;
    resultado: string;
    /** Variação percentual sobre o mês anterior; null quando o mês anterior é zero. */
    variacao: number | null;
  };
  serieMensal: SerieMensalItem[];
  situacao: { emDia: number; aVencer: number; vencido: number };
  ultimosRecebimentos: PagamentoItem[];
}

export interface CaixaResposta {
  de: string;
  ate: string;
  receitas: string;
  despesas: string;
  /** null quando há filtro de contrato ou categoria (despesas não pertencem a eles). */
  resultado: string | null;
  filtrado: boolean;
  serieMensal: SerieMensalItem[];
  porForma: { forma: FormaPagamento; total: string }[];
}

export interface VencimentosResposta {
  totais: Record<Situacao, ResumoSituacao>;
  itens: MensalistaItem[];
}

export interface ListaMensalistasResposta {
  itens: MensalistaItem[];
  /** Total de resultados com os filtros aplicados, em todas as páginas. */
  total: number;
  pagina: number;
  porPagina: number;
}

export type EventoHistorico = 'criado' | 'renovado' | 'pagamento' | 'encerrado';

export interface HistoricoItem {
  id: number;
  evento: EventoHistorico;
  /** Data do evento, AAAA-MM-DD. */
  em: string;
  detalhes: string | null;
  /** Nome de quem fez; null para eventos sem usuário. */
  usuario: string | null;
}

export interface ContratoDetalhe {
  id: number;
  tipo: TipoContrato;
  valor: string;
  diaVencimento: number;
  inicio: string;
  vencimento: string;
  vaga: string | null;
  status: 'ativo' | 'encerrado';
  encerradoEm: string | null;
  /** Situação calculada; só faz sentido com o contrato ativo. */
  situacao: Situacao;
}

export interface MensalistaDetalhe {
  id: number;
  nome: string;
  telefone: string;
  placa: string;
  categoria: Categoria;
  contrato: ContratoDetalhe;
  /** Do mais recente para o mais antigo. */
  historico: HistoricoItem[];
}

export interface PagamentosResposta {
  itens: PagamentoItem[];
  /** Soma dos pagamentos listados, em texto decimal. */
  total: string;
}

export interface RegistroPagamentoResposta {
  pagamento: PagamentoItem;
  /** Próxima data a pagar do contrato depois deste pagamento, AAAA-MM-DD. */
  novoVencimento: string;
}

export interface DespesaItem {
  id: number;
  descricao: string;
  valor: string;
  tipo: TipoDespesa;
  /** Data do lançamento, AAAA-MM-DD. */
  data: string;
  /** Nome de quem lançou; null para lançamentos gerados pela recorrência. */
  registradoPor: string | null;
  /** Preenchido quando o lançamento veio de uma despesa fixa. */
  recorrenciaId: number | null;
}

export interface DespesasResposta {
  itens: DespesaItem[];
  /** Soma das despesas listadas, em texto decimal. */
  total: string;
}

export interface RecorrenciaItem {
  id: number;
  descricao: string;
  valor: string;
  diaDoMes: number;
  ativa: boolean;
}

export interface RecorrenciasResposta {
  itens: RecorrenciaItem[];
}

export interface UsuarioItem {
  id: number;
  nome: string;
  login: string;
  perfil: Perfil;
  ativo: boolean;
}

export interface UsuariosResposta {
  itens: UsuarioItem[];
}
