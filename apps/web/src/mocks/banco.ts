import {
  situacaoDoContrato,
  type HistoricoItem,
  type MensalistaDetalhe,
  type MensalistaItem,
  type PagamentoItem,
  type Perfil,
  type RegistroPagamentoResposta,
  type SerieMensalItem,
  type Sessao,
  type TipoContrato,
} from '@estacionafacil/shared';

/** Data fixa do mock: as telas de exemplo ficam iguais às do protótipo, em qualquer dia. */
export const HOJE_MOCK = '2026-10-26';

export interface UsuarioMock extends Sessao {
  login: string;
  senha: string;
}

/** Mensalista com o contrato atual; `placa` e `telefone` ficam sem máscara, como na API. */
export interface MensalistaMock extends Omit<MensalistaItem, 'situacao'> {
  tipo: TipoContrato;
  diaVencimento: number;
  inicio: string;
  status: 'ativo' | 'encerrado';
  encerradoEm: string | null;
  /** Do mais recente para o mais antigo. */
  historico: HistoricoItem[];
}

export interface BancoMock {
  hoje: string;
  usuarios: UsuarioMock[];
  /** Quem está logado no mock; null = sem sessão. */
  sessao: Sessao | null;
  mensalistas: MensalistaMock[];
  /** Do mais recente para o mais antigo. */
  recebimentos: PagamentoItem[];
  /** Seis meses até o mês de `hoje`; o último é o mês corrente. */
  serieMensal: SerieMensalItem[];
  /** Resposta de cada Idempotency-Key já usada: repetir a chave devolve a mesma resposta. */
  pagamentosPorChave: Map<string, RegistroPagamentoResposta>;
}

type Linha = [
  nome: string,
  placa: string,
  categoria: 'carro' | 'moto',
  vaga: string,
  vencimento: string,
  valor: string,
];

// 4 vencidos (R$ 885,00), 6 a vencer em 7 dias (R$ 1.395,00) e 6 em dia, com hoje = 2026-10-26.
const LINHAS: Linha[] = [
  ['Carlos Mendes', 'FGH4J56', 'carro', '07', '2026-10-10', '255.00'],
  ['Rita Souza', 'KLM2N90', 'moto', 'M3', '2026-10-15', '120.00'],
  ['Sérgio Alves', 'ABC1D23', 'carro', '15', '2026-10-05', '255.00'],
  ['Beatriz Campos', 'DEF4G56', 'carro', '18', '2026-10-20', '255.00'],
  ['Joana Prado', 'QRS7T81', 'carro', '12', '2026-10-28', '255.00'],
  ['Marcos Lima', 'BCD5E67', 'carro', '21', '2026-10-30', '255.00'],
  ['Helena Costa', 'GHI8J90', 'carro', '02', '2026-10-26', '255.00'],
  ['Ricardo Dias', 'JKL1M23', 'carro', '09', '2026-10-27', '255.00'],
  ['Fernanda Rocha', 'MNO4P56', 'carro', '30', '2026-11-01', '255.00'],
  ['Tiago Melo', 'PQR7S89', 'moto', 'M5', '2026-11-02', '120.00'],
  ['Eduarda Freitas', 'TUV3W45', 'moto', 'M9', '2026-11-20', '120.00'],
  ['Paulo Nogueira', 'XYZ9A12', 'carro', '03', '2026-11-25', '255.00'],
  ['Lucas Pires', 'STU2V34', 'carro', '25', '2026-11-10', '255.00'],
  ['Clara Neves', 'WXY5Z67', 'carro', '33', '2026-11-12', '255.00'],
  ['Otávio Brito', 'BRA2E19', 'moto', 'M11', '2026-11-15', '120.00'],
  ['Patrícia Gomes', 'RIO4A56', 'carro', '28', '2026-11-18', '255.00'],
];

const RECEBIMENTOS: Omit<PagamentoItem, 'id' | 'numero'>[] = [
  {
    mensalista: 'Carlos Mendes',
    placa: 'FGH4J56',
    valor: '255.00',
    forma: 'pix',
    pagoEm: '2026-10-26',
  },
  {
    mensalista: 'Rita Souza',
    placa: 'KLM2N90',
    valor: '120.00',
    forma: 'dinheiro',
    pagoEm: '2026-10-25',
  },
  {
    mensalista: 'Joana Prado',
    placa: 'QRS7T81',
    valor: '255.00',
    forma: 'debito',
    pagoEm: '2026-10-24',
  },
  {
    mensalista: 'Helena Costa',
    placa: 'GHI8J90',
    valor: '255.00',
    forma: 'pix',
    pagoEm: '2026-10-23',
  },
  {
    mensalista: 'Marcos Lima',
    placa: 'BCD5E67',
    valor: '255.00',
    forma: 'credito',
    pagoEm: '2026-10-22',
  },
  {
    mensalista: 'Tiago Melo',
    placa: 'PQR7S89',
    valor: '120.00',
    forma: 'dinheiro',
    pagoEm: '2026-10-21',
  },
];

// Resultado do mês corrente: 4800,00 − 1440,00 = 3360,00 (12% acima de setembro).
const SERIE_MENSAL: SerieMensalItem[] = [
  { mes: '2026-05-01', receitas: '3900.00', despesas: '1500.00' },
  { mes: '2026-06-01', receitas: '4050.00', despesas: '1380.00' },
  { mes: '2026-07-01', receitas: '4200.00', despesas: '1620.00' },
  { mes: '2026-08-01', receitas: '4350.00', despesas: '1410.00' },
  { mes: '2026-09-01', receitas: '4500.00', despesas: '1500.00' },
  { mes: '2026-10-01', receitas: '4800.00', despesas: '1440.00' },
];

function criarBanco(): BancoMock {
  return {
    hoje: HOJE_MOCK,
    usuarios: [
      { id: 1, nome: 'Proprietário', perfil: 'proprietario', login: 'dono', senha: 'teste123' },
      { id: 2, nome: 'Auxiliar', perfil: 'auxiliar', login: 'auxiliar', senha: 'teste123' },
    ],
    sessao: null,
    mensalistas: LINHAS.map(([nome, placa, categoria, vaga, vencimento, valor], i) => ({
      id: i + 1,
      contratoId: i + 1,
      nome,
      telefone: `1299111${String(i + 1).padStart(4, '0')}`,
      placa,
      categoria,
      vaga,
      vencimento,
      valor,
      tipo: 'mensal',
      diaVencimento: Number(vencimento.slice(8, 10)),
      inicio: '2026-01-10',
      status: 'ativo',
      encerradoEm: null,
      historico: [
        { id: i + 1, evento: 'criado', em: '2026-01-10', detalhes: null, usuario: 'Proprietário' },
      ],
    })),
    recebimentos: RECEBIMENTOS.map((r, i) => ({ ...r, id: 100 - i, numero: 100 - i })),
    serieMensal: SERIE_MENSAL.map((m) => ({ ...m })),
    pagamentosPorChave: new Map(),
  };
}

export const bancoMock: BancoMock = criarBanco();

/** Volta o mock ao estado inicial (usado entre testes). */
export function reiniciarBancoMock(): void {
  Object.assign(bancoMock, criarBanco());
}

/** Deixa o mock já autenticado com o perfil informado. */
export function entrarNoMock(perfil: Perfil): Sessao {
  const usuario = bancoMock.usuarios.find((u) => u.perfil === perfil);
  if (!usuario) throw new Error(`Perfil sem usuário no mock: ${perfil}`);
  bancoMock.sessao = { id: usuario.id, nome: usuario.nome, perfil: usuario.perfil };
  return bancoMock.sessao;
}

/** Mensalistas com contrato ativo, com a situação calculada para a data do mock. */
export function listarMensalistas(): MensalistaItem[] {
  return bancoMock.mensalistas
    .filter((m) => m.status === 'ativo')
    .map((m) => ({
      id: m.id,
      contratoId: m.contratoId,
      nome: m.nome,
      telefone: m.telefone,
      placa: m.placa,
      categoria: m.categoria,
      vaga: m.vaga,
      vencimento: m.vencimento,
      valor: m.valor,
      situacao: situacaoDoContrato(m.vencimento, bancoMock.hoje),
    }));
}

/** Próximo id livre para um evento de histórico (únicos em todo o mock). */
export function proximoIdHistorico(): number {
  return Math.max(0, ...bancoMock.mensalistas.flatMap((m) => m.historico.map((h) => h.id))) + 1;
}

export function montarDetalhe(m: MensalistaMock): MensalistaDetalhe {
  return {
    id: m.id,
    nome: m.nome,
    telefone: m.telefone,
    placa: m.placa,
    categoria: m.categoria,
    contrato: {
      id: m.contratoId,
      tipo: m.tipo,
      valor: m.valor,
      diaVencimento: m.diaVencimento,
      inicio: m.inicio,
      vencimento: m.vencimento,
      vaga: m.vaga,
      status: m.status,
      encerradoEm: m.encerradoEm,
      situacao: situacaoDoContrato(m.vencimento, bancoMock.hoje),
    },
    historico: m.historico,
  };
}
