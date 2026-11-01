import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { mesesAtras, semearDemonstracao } from '../../../scripts/dados-de-demonstracao';
import { semearVagas } from '../prisma/seed';
import { criarUsuario } from '../src/autenticacao/usuarios';
import { criarAppDeTeste } from './ajudantes';

const { prisma, limparBanco, encerrar } = criarAppDeTeste();

beforeEach(limparBanco);
afterAll(encerrar);

describe('mesesAtras (dados de demonstração)', () => {
  it('volta por mês de verdade, atravessando o ano', () => {
    expect(mesesAtras('2026-10-15', 0)).toBe('2026-10');
    expect(mesesAtras('2026-10-15', 3)).toBe('2026-07');
    expect(mesesAtras('2026-01-31', 1)).toBe('2025-12');
    expect(mesesAtras('2026-02-10', 14)).toBe('2024-12');
  });

  it.each(['2026-10-29', '2026-10-30', '2026-10-31', '2026-03-31', '2026-05-31'])(
    'em %s (dias 29 a 31) cada passo cai num mês diferente',
    (hoje) => {
      const meses = [0, 1, 2, 3, 4, 5, 6].map((n) => mesesAtras(hoje, n));
      expect(new Set(meses).size).toBe(meses.length);
    },
  );
});

describe('semearDemonstracao', () => {
  it('inclui um noturno que divide a vaga com um diurno', async () => {
    await semearVagas(prisma);
    await criarUsuario(prisma, {
      nome: 'Dono',
      login: 'dono',
      senha: 'senha-de-teste-123',
      perfil: 'proprietario',
    });
    await semearDemonstracao(prisma);

    const noturnos = await prisma.contrato.findMany({
      where: { turno: 'noturno', status: 'ativo' },
    });
    expect(noturnos).toHaveLength(1);
    const diurno = await prisma.contrato.findFirst({
      where: { vagaId: noturnos[0]?.vagaId ?? -1, turno: 'diurno', status: 'ativo' },
    });
    expect(diurno).not.toBeNull();
  });
});
