import type { Categoria, FormaPagamento, Perfil } from './enums';
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
