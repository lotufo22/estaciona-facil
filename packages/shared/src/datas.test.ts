import { describe, expect, it } from 'vitest';
import { hojeEmSaoPaulo, proximoVencimento, ultimoDiaDoMes, vencimentoAnterior } from './datas';

describe('vencimentoAnterior', () => {
  it('volta um mês mantendo o dia', () => {
    expect(vencimentoAnterior('2026-11-05', 'mensal', 5)).toBe('2026-10-05');
  });

  it('dia 31 volta ao último dia de fevereiro, e de 29 em ano bissexto', () => {
    expect(vencimentoAnterior('2026-03-31', 'mensal', 31)).toBe('2026-02-28');
    expect(vencimentoAnterior('2028-03-31', 'mensal', 31)).toBe('2028-02-29');
  });

  it('atravessa a virada de ano', () => {
    expect(vencimentoAnterior('2026-01-15', 'mensal', 15)).toBe('2025-12-15');
  });

  it('contrato semanal volta 7 dias', () => {
    expect(vencimentoAnterior('2026-11-12', 'semanal', 5)).toBe('2026-11-05');
  });

  it('é a inversa de proximoVencimento para qualquer dia de vencimento', () => {
    for (let dia = 1; dia <= 31; dia += 1) {
      for (let mes = 1; mes <= 12; mes += 1) {
        const ate = Math.min(dia, ultimoDiaDoMes(2026, mes));
        const atual = `2026-${String(mes).padStart(2, '0')}-${String(ate).padStart(2, '0')}`;
        const seguinte = proximoVencimento(atual, 'mensal', dia);
        expect(vencimentoAnterior(seguinte, 'mensal', dia)).toBe(atual);
      }
    }
  });
});

describe('proximoVencimento', () => {
  it('avança um mês mantendo o dia', () => {
    expect(proximoVencimento('2026-10-05', 'mensal', 5)).toBe('2026-11-05');
  });

  it('dia 31 cai no último dia de fevereiro', () => {
    expect(proximoVencimento('2026-01-31', 'mensal', 31)).toBe('2026-02-28');
  });

  it('dia 31 cai em 29 de fevereiro em ano bissexto', () => {
    expect(proximoVencimento('2028-01-31', 'mensal', 31)).toBe('2028-02-29');
  });

  it('volta ao dia 31 depois de um mês curto', () => {
    expect(proximoVencimento('2026-02-28', 'mensal', 31)).toBe('2026-03-31');
  });

  it('atravessa a virada de ano', () => {
    expect(proximoVencimento('2026-12-05', 'mensal', 5)).toBe('2027-01-05');
  });

  it('contrato semanal avança 7 dias', () => {
    expect(proximoVencimento('2026-10-05', 'semanal', 5)).toBe('2026-10-12');
  });

  it('contrato semanal atravessa o fim do mês', () => {
    expect(proximoVencimento('2026-10-28', 'semanal', 28)).toBe('2026-11-04');
  });
});

describe('hojeEmSaoPaulo', () => {
  it('usa o fuso de São Paulo, não o UTC', () => {
    expect(hojeEmSaoPaulo(new Date('2026-10-27T02:30:00Z'))).toBe('2026-10-26');
  });

  it('mantém o dia quando já é manhã em São Paulo', () => {
    expect(hojeEmSaoPaulo(new Date('2026-10-27T12:00:00Z'))).toBe('2026-10-27');
  });
});
