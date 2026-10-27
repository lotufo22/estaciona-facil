import {
  situacaoDoContrato,
  type MensalistaItem,
  type Perfil,
  type Sessao,
} from '@estacionafacil/shared';

/** Data fixa do mock: as telas de exemplo ficam iguais às do protótipo, em qualquer dia. */
export const HOJE_MOCK = '2026-10-26';

export interface UsuarioMock extends Sessao {
  login: string;
  senha: string;
}

export type MensalistaMock = Omit<MensalistaItem, 'situacao'>;

export interface BancoMock {
  hoje: string;
  usuarios: UsuarioMock[];
  /** Quem está logado no mock; null = sem sessão. */
  sessao: Sessao | null;
  mensalistas: MensalistaMock[];
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
    })),
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

/** Mensalistas com a situação calculada para a data do mock. */
export function listarMensalistas(): MensalistaItem[] {
  return bancoMock.mensalistas.map((m) => ({
    ...m,
    situacao: situacaoDoContrato(m.vencimento, bancoMock.hoje),
  }));
}
