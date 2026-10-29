import { adicionarDias, hojeEmSaoPaulo } from '@estacionafacil/shared';
import type { PrismaClient } from '../apps/api/src/prisma';

/**
 * Dados de demonstração para as capturas de tela do manual e para ver o sistema "vivo".
 * Tudo é calculado a partir de `hoje`, então a situação de cada contrato é sempre a mesma
 * (3 vencidos, 3 a vencer, 6 em dia), qualquer que seja o dia em que o script rode.
 *
 * Só ACRESCENTA dados: espera que as vagas e o usuário `dono` já existam (o preparo do banco do
 * e2e cuida disso). Nunca roda contra o banco de produção: quem chama é o `e2e/preparar-banco.ts`,
 * que só aceita um banco cujo nome contém "test".
 */

type Forma = 'dinheiro' | 'pix' | 'debito' | 'credito';

interface Cliente {
  nome: string;
  placa: string;
  categoria: 'carro' | 'moto';
  vaga: string;
  tipo?: 'mensal' | 'semanal';
  valor: string;
  /** Dias de hoje até o vencimento; negativo = já venceu. */
  vence: number;
  forma: Forma;
}

const CLIENTES: Cliente[] = [
  {
    nome: 'Joana Prado',
    placa: 'ABC1D23',
    categoria: 'carro',
    vaga: '01',
    valor: '255.00',
    vence: -25,
    forma: 'pix',
  },
  {
    nome: 'Carlos Mendes',
    placa: 'DEF2E34',
    categoria: 'carro',
    vaga: '02',
    valor: '255.00',
    vence: -12,
    forma: 'dinheiro',
  },
  {
    nome: 'Patrícia Lima',
    placa: 'GHI3F45',
    categoria: 'carro',
    vaga: '03',
    valor: '280.00',
    vence: -3,
    forma: 'pix',
  },
  {
    nome: 'Roberto Alves',
    placa: 'JKL4G56',
    categoria: 'carro',
    vaga: '04',
    valor: '255.00',
    vence: 1,
    forma: 'debito',
  },
  {
    nome: 'Fernanda Souza',
    placa: 'MNO5H67',
    categoria: 'carro',
    vaga: '05',
    valor: '300.00',
    vence: 3,
    forma: 'pix',
  },
  {
    nome: 'Marcelo Dias',
    placa: 'PQR6I78',
    categoria: 'moto',
    vaga: 'M1',
    valor: '120.00',
    vence: 6,
    forma: 'dinheiro',
  },
  {
    nome: 'Luciana Rocha',
    placa: 'STU7J89',
    categoria: 'carro',
    vaga: '06',
    valor: '255.00',
    vence: 12,
    forma: 'credito',
  },
  {
    nome: 'André Barbosa',
    placa: 'VWX8K90',
    categoria: 'carro',
    vaga: '07',
    valor: '255.00',
    vence: 15,
    forma: 'pix',
  },
  {
    nome: 'Sandra Nunes',
    placa: 'YZA9L01',
    categoria: 'carro',
    vaga: '08',
    valor: '280.00',
    vence: 19,
    forma: 'pix',
  },
  {
    nome: 'Thiago Ferraz',
    placa: 'BCD0M12',
    categoria: 'moto',
    vaga: 'M2',
    valor: '120.00',
    vence: 22,
    forma: 'dinheiro',
  },
  {
    nome: 'Helena Castro',
    placa: 'EFG1N23',
    categoria: 'carro',
    vaga: '09',
    valor: '255.00',
    vence: 26,
    forma: 'debito',
  },
  {
    nome: 'Vinícius Prado',
    placa: 'HIJ2O34',
    categoria: 'moto',
    vaga: 'M3',
    tipo: 'semanal',
    valor: '35.00',
    vence: 28,
    forma: 'pix',
  },
];

/** Pagamentos dos últimos meses de cada cliente: alimentam os gráficos do Painel e do Fluxo de caixa. */
const MESES_DE_HISTORICO = 5;

const DESPESAS_FIXAS = [
  { descricao: 'Aluguel do terreno', valor: '2500.00', dia: 5 },
  { descricao: 'Conta de luz', valor: '480.00', dia: 12 },
  { descricao: 'Conta de água', valor: '135.00', dia: 15 },
];

/** "AAAA-MM" de `n` meses antes de `hoje`. Por mês de verdade: voltar "30 dias" repetiria o mês nos dias 29 a 31. */
export function mesesAtras(hoje: string, n: number): string {
  const total = Number(hoje.slice(0, 4)) * 12 + (Number(hoje.slice(5, 7)) - 1) - n;
  const ano = Math.floor(total / 12);
  return `${ano}-${String((total % 12) + 1).padStart(2, '0')}`;
}

export async function semearDemonstracao(prisma: PrismaClient): Promise<void> {
  const hoje = hojeEmSaoPaulo();
  const data = (texto: string) => new Date(`${texto}T00:00:00.000Z`);
  const dono = await prisma.usuario.findUniqueOrThrow({ where: { login: 'dono' } });
  let chave = 0;

  for (const c of CLIENTES) {
    const vaga = await prisma.vaga.findUniqueOrThrow({ where: { codigo: c.vaga } });
    const mensalista = await prisma.mensalista.create({
      data: { nome: c.nome, telefone: '12998877665' },
    });
    const veiculo = await prisma.veiculo.create({
      data: { mensalistaId: mensalista.id, placa: c.placa, categoria: c.categoria },
    });
    const vencimento = adicionarDias(hoje, c.vence);
    const contrato = await prisma.contrato.create({
      data: {
        mensalistaId: mensalista.id,
        veiculoId: veiculo.id,
        vagaId: vaga.id,
        tipo: c.tipo ?? 'mensal',
        valor: c.valor,
        diaVencimento: Number(vencimento.slice(8, 10)),
        inicio: data(adicionarDias(hoje, -30 * (MESES_DE_HISTORICO + 1))),
        vencimento: data(vencimento),
      },
    });
    await prisma.historicoContrato.create({
      data: {
        contratoId: contrato.id,
        evento: 'criado',
        em: new Date(`${adicionarDias(hoje, -30 * (MESES_DE_HISTORICO + 1))}T15:00:00Z`),
        usuarioId: dono.id,
      },
    });
    // Cada cliente pagou nos vencimentos anteriores, de 30 em 30 dias (quem está vencido deixou de pagar
    // no último). Isso espalha os recebimentos pelos meses, inclusive o atual.
    for (let mes = MESES_DE_HISTORICO; mes >= 1; mes -= 1) {
      const pagoEm = adicionarDias(hoje, c.vence - 30 * mes);
      if (pagoEm > hoje) continue;
      chave += 1;
      await prisma.pagamento.create({
        data: {
          contratoId: contrato.id,
          valor: c.valor,
          forma: c.forma,
          pagoEm: data(pagoEm),
          mesReferencia: data(`${pagoEm.slice(0, 7)}-01`),
          registradoPor: dono.id,
          chaveIdempotencia: `demonstracao-${chave}`,
        },
      });
    }
  }

  for (const fixa of DESPESAS_FIXAS) {
    const recorrencia = await prisma.recorrenciaDespesa.create({
      data: { descricao: fixa.descricao, valor: fixa.valor, diaDoMes: fixa.dia },
    });
    for (let mes = MESES_DE_HISTORICO; mes >= 0; mes -= 1) {
      const anoMes = mesesAtras(hoje, mes);
      const lancadaEm = `${anoMes}-${String(fixa.dia).padStart(2, '0')}`;
      if (lancadaEm > hoje) continue;
      await prisma.despesa.create({
        data: {
          descricao: fixa.descricao,
          valor: fixa.valor,
          tipo: 'fixa',
          data: data(lancadaEm),
          recorrenciaId: recorrencia.id,
          competencia: data(`${anoMes}-01`),
        },
      });
    }
  }
  await prisma.despesa.create({
    data: {
      descricao: 'Material de limpeza',
      valor: '86.50',
      tipo: 'variavel',
      data: data(adicionarDias(hoje, -4)),
      registradoPor: dono.id,
    },
  });
}
