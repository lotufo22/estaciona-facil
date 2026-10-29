import { describe, expect, it } from 'vitest';
import { mesesAtras } from '../../../scripts/dados-de-demonstracao';

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
