import { describe, expect, it } from 'vitest';
import { AVISO_DIAS, situacaoDoContrato } from './situacao';

describe('situacaoDoContrato', () => {
  it('é vencido quando o vencimento já passou', () => {
    expect(situacaoDoContrato('2026-10-25', '2026-10-26')).toBe('vencido');
  });

  it('é a vencer quando vence hoje', () => {
    expect(situacaoDoContrato('2026-10-26', '2026-10-26')).toBe('a_vencer');
  });

  it('é a vencer quando faltam exatamente 7 dias', () => {
    expect(situacaoDoContrato('2026-11-02', '2026-10-26')).toBe('a_vencer');
  });

  it('é em dia quando faltam 8 dias', () => {
    expect(situacaoDoContrato('2026-11-03', '2026-10-26')).toBe('em_dia');
  });

  it('usa 7 dias como aviso padrão', () => {
    expect(AVISO_DIAS).toBe(7);
  });

  it('aceita aviso diferente do padrão', () => {
    expect(situacaoDoContrato('2026-10-29', '2026-10-26', 2)).toBe('em_dia');
  });

  it('atravessa a virada de ano', () => {
    expect(situacaoDoContrato('2027-01-02', '2026-12-30')).toBe('a_vencer');
  });
});
