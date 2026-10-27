import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { semearVagas, VAGAS_DE_CARRO, VAGAS_DE_MOTO } from '../prisma/seed';
import { criarAppDeTeste, criarCenario, dadosDeContrato } from './ajudantes';

const { prisma, limparBanco, encerrar } = criarAppDeTeste();

beforeEach(limparBanco);
afterAll(encerrar);

/** A operação precisa falhar apontando para esta restrição do banco (pelo nome, na mensagem). */
async function violacaoDe(restricao: string, operacao: Promise<unknown>) {
  const erro = await operacao.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro, `esperava que o banco recusasse (${restricao})`).not.toBeNull();
  expect(String((erro as Error).message)).toContain(restricao);
}

describe('um contrato ativo por placa e por vaga', () => {
  it('dois contratos ativos para o mesmo veículo (placa) violam a unicidade', async () => {
    const cenario = await criarCenario(prisma);
    await prisma.contrato.create({ data: dadosDeContrato(cenario) });
    await violacaoDe(
      'contratos_um_ativo_por_veiculo',
      prisma.contrato.create({ data: dadosDeContrato(cenario) }),
    );
  });

  it('dois contratos ativos na mesma vaga violam a unicidade', async () => {
    const primeiro = await criarCenario(prisma, { placa: 'AAA1A11', vaga: '07' });
    await prisma.contrato.create({ data: dadosDeContrato(primeiro) });

    const outroMensalista = await prisma.mensalista.create({
      data: { nome: 'Carlos Mendes', telefone: '12988880000' },
    });
    const outroVeiculo = await prisma.veiculo.create({
      data: { mensalistaId: outroMensalista.id, placa: 'BBB2B22', categoria: 'carro' },
    });
    await violacaoDe(
      'contratos_um_ativo_por_vaga',
      prisma.contrato.create({
        data: dadosDeContrato({
          mensalistaId: outroMensalista.id,
          veiculoId: outroVeiculo.id,
          vagaId: primeiro.vagaId,
        }),
      }),
    );
  });

  it('encerrar o primeiro contrato libera a placa e a vaga para o segundo', async () => {
    const cenario = await criarCenario(prisma, { vaga: '07' });
    const primeiro = await prisma.contrato.create({ data: dadosDeContrato(cenario) });
    await prisma.contrato.update({
      where: { id: primeiro.id },
      data: { status: 'encerrado', encerradoEm: new Date() },
    });

    const segundo = await prisma.contrato.create({ data: dadosDeContrato(cenario) });
    expect(segundo.status).toBe('ativo');
    expect(await prisma.contrato.count()).toBe(2);
  });

  it('contratos sem vaga não disputam entre si (vaga é opcional)', async () => {
    const um = await criarCenario(prisma, { placa: 'AAA1A11' });
    const outroMensalista = await prisma.mensalista.create({
      data: { nome: 'Rita Souza', telefone: '12977770000' },
    });
    const outroVeiculo = await prisma.veiculo.create({
      data: { mensalistaId: outroMensalista.id, placa: 'CCC3C33', categoria: 'moto' },
    });
    await prisma.contrato.create({ data: dadosDeContrato(um) });
    await expect(
      prisma.contrato.create({
        data: dadosDeContrato({
          mensalistaId: outroMensalista.id,
          veiculoId: outroVeiculo.id,
          vagaId: null,
        }),
      }),
    ).resolves.toBeTruthy();
  });

  it('a placa é única entre os veículos', async () => {
    const cenario = await criarCenario(prisma, { placa: 'ABC1D23' });
    await violacaoDe(
      'placa',
      prisma.veiculo.create({
        data: { mensalistaId: cenario.mensalistaId, placa: 'ABC1D23', categoria: 'carro' },
      }),
    );
  });
});

describe('dinheiro em NUMERIC(12,2)', () => {
  it('nunca guarda fração de centavo: o banco arredonda para duas casas', async () => {
    const cenario = await criarCenario(prisma);
    const contrato = await prisma.contrato.create({
      data: dadosDeContrato(cenario, { valor: '255.456' }),
    });
    expect(contrato.valor.toFixed(2)).toBe('255.46');
    const [linha] = await prisma.$queryRaw<{ valor: string }[]>`
      SELECT valor::text AS valor FROM contratos WHERE id = ${contrato.id}`;
    expect(linha?.valor).toBe('255.46');
  });

  it('guarda valores grandes sem perder centavos', async () => {
    const cenario = await criarCenario(prisma);
    const contrato = await prisma.contrato.create({
      data: dadosDeContrato(cenario, { valor: '9999999999.99' }),
    });
    expect(contrato.valor.toFixed(2)).toBe('9999999999.99');
  });

  it('recusa um valor acima do que NUMERIC(12,2) comporta', async () => {
    const cenario = await criarCenario(prisma);
    await violacaoDe(
      'numeric',
      prisma.contrato.create({ data: dadosDeContrato(cenario, { valor: '10000000000.00' }) }),
    );
  });

  it.each(['0.00', '-5.00'])('recusa valor %s no contrato', async (valor) => {
    const cenario = await criarCenario(prisma);
    await violacaoDe(
      'contratos_valor_positivo',
      prisma.contrato.create({ data: dadosDeContrato(cenario, { valor }) }),
    );
  });

  it('recusa valor zero em despesa e em recorrência', async () => {
    await violacaoDe(
      'despesas_valor_positivo',
      prisma.despesa.create({
        data: { descricao: 'Luz', valor: '0.00', tipo: 'variavel', data: new Date('2026-10-10') },
      }),
    );
    await violacaoDe(
      'recorrencias_valor_positivo',
      prisma.recorrenciaDespesa.create({
        data: { descricao: 'Aluguel', valor: '0.00', diaDoMes: 5 },
      }),
    );
  });

  it('recusa dia do mês fora de 1 a 31', async () => {
    const cenario = await criarCenario(prisma);
    await violacaoDe(
      'contratos_dia_vencimento_valido',
      prisma.contrato.create({ data: dadosDeContrato(cenario, { diaVencimento: 32 }) }),
    );
    await violacaoDe(
      'recorrencias_dia_do_mes_valido',
      prisma.recorrenciaDespesa.create({
        data: { descricao: 'Água', valor: '430.00', diaDoMes: 0 },
      }),
    );
  });
});

describe('unicidades que as tarefas seguintes usam', () => {
  it('o login do usuário é único', async () => {
    const dados = { nome: 'Dono', login: 'dono', senhaHash: 'x', perfil: 'proprietario' as const };
    await prisma.usuario.create({ data: dados });
    await violacaoDe('login', prisma.usuario.create({ data: dados }));
  });

  it('a chave de idempotência do pagamento é única: repetir a chave não duplica', async () => {
    const cenario = await criarCenario(prisma);
    const contrato = await prisma.contrato.create({ data: dadosDeContrato(cenario) });
    const usuario = await prisma.usuario.create({
      data: { nome: 'Auxiliar', login: 'aux', senhaHash: 'x', perfil: 'auxiliar' },
    });
    const pagamento = {
      contratoId: contrato.id,
      valor: '255.00',
      forma: 'pix' as const,
      pagoEm: new Date('2026-10-26'),
      mesReferencia: new Date('2026-10-01'),
      registradoPor: usuario.id,
      chaveIdempotencia: 'chave-1',
    };
    await prisma.pagamento.create({ data: pagamento });
    await violacaoDe('chave_idempotencia', prisma.pagamento.create({ data: pagamento }));
    expect(await prisma.pagamento.count()).toBe(1);
  });

  it('a despesa gerada pela recorrência é única por recorrência e mês', async () => {
    const recorrencia = await prisma.recorrenciaDespesa.create({
      data: { descricao: 'Aluguel', valor: '5500.00', diaDoMes: 5 },
    });
    const lancamento = {
      descricao: 'Aluguel',
      valor: '5500.00',
      tipo: 'fixa' as const,
      data: new Date('2026-11-05'),
      recorrenciaId: recorrencia.id,
      competencia: new Date('2026-11-01'),
    };
    await prisma.despesa.create({ data: lancamento });
    await violacaoDe('recorrencia_id_competencia', prisma.despesa.create({ data: lancamento }));

    // Outro mês da mesma recorrência é permitido.
    await expect(
      prisma.despesa.create({
        data: { ...lancamento, data: new Date('2026-12-05'), competencia: new Date('2026-12-01') },
      }),
    ).resolves.toBeTruthy();
  });

  it('despesas avulsas (sem recorrência) não colidem entre si', async () => {
    const avulsa = {
      descricao: 'Portão',
      valor: '600.00',
      tipo: 'variavel' as const,
      data: new Date('2026-10-18'),
    };
    await prisma.despesa.create({ data: avulsa });
    await expect(prisma.despesa.create({ data: avulsa })).resolves.toBeTruthy();
  });
});

describe('segurança no Supabase (RLS)', () => {
  it('todas as tabelas têm RLS ligado', async () => {
    const tabelas = await prisma.$queryRaw<{ tablename: string; rowsecurity: boolean }[]>`
      SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
    expect(tabelas.map((t) => t.tablename)).toEqual([
      '_prisma_migrations',
      'contratos',
      'despesas',
      'historico_contrato',
      'mensalistas',
      'pagamentos',
      'recorrencias_despesa',
      'sessoes',
      'tentativas_login',
      'usuarios',
      'vagas',
      'veiculos',
    ]);
    expect(tabelas.filter((t) => !t.rowsecurity)).toEqual([]);
  });

  it('nenhuma tabela tem política (o RLS bloqueia tudo que não vem do dono das tabelas)', async () => {
    const [linha] = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT count(*) AS total FROM pg_policies WHERE schemaname = 'public'`;
    expect(Number(linha?.total)).toBe(0);
  });
});

describe('seed das vagas', () => {
  it('cria as 49 vagas: 35 de carro e 14 de moto', async () => {
    const criadas = await semearVagas(prisma);
    expect(criadas).toBe(49);
    expect(await prisma.vaga.count({ where: { categoria: 'carro' } })).toBe(VAGAS_DE_CARRO);
    expect(await prisma.vaga.count({ where: { categoria: 'moto' } })).toBe(VAGAS_DE_MOTO);
    expect(VAGAS_DE_CARRO).toBe(35);
    expect(VAGAS_DE_MOTO).toBe(14);
  });

  it('usa os códigos 01 a 35 para carros e M1 a M14 para motos', async () => {
    await semearVagas(prisma);
    const codigos = (await prisma.vaga.findMany({ select: { codigo: true } })).map((v) => v.codigo);
    expect(codigos).toContain('01');
    expect(codigos).toContain('35');
    expect(codigos).toContain('M1');
    expect(codigos).toContain('M14');
  });

  it('rodar o seed de novo não duplica nada', async () => {
    await semearVagas(prisma);
    expect(await semearVagas(prisma)).toBe(0);
    expect(await prisma.vaga.count()).toBe(49);
  });
});
