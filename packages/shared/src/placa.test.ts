import { describe, expect, it } from 'vitest';
import { formatarPlaca, normalizarPlaca } from './placa';

describe('placa', () => {
  it('normaliza maiúsculas, hífen e espaços (formato Mercosul)', () => {
    expect(normalizarPlaca(' qrs-7t81 ')).toBe('QRS7T81');
  });

  it('normaliza o formato antigo', () => {
    expect(normalizarPlaca('abc-1234')).toBe('ABC1234');
  });

  it('remove espaços internos', () => {
    expect(normalizarPlaca('qrs 7t81')).toBe('QRS7T81');
  });

  it('formata com hífen após a terceira letra', () => {
    expect(formatarPlaca('QRS7T81')).toBe('QRS-7T81');
  });

  it('formata o formato antigo', () => {
    expect(formatarPlaca('ABC1234')).toBe('ABC-1234');
  });
});
