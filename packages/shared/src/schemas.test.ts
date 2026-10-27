import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import {
  despesaCriarSchema,
  filtrosCaixaSchema,
  loginSchema,
  mensalistaAtualizarSchema,
  mensalistaCriarSchema,
  pagamentoCriarSchema,
  renovacaoSchema,
} from './schemas';

const mensalistaValido = {
  nome: 'Joana Prado',
  telefone: '(12) 99999-0000',
  placa: 'qrs-7t81',
  categoria: 'carro',
  vaga: '12',
  tipo: 'mensal',
  valor: '255.00',
  diaVencimento: 5,
  inicio: '2026-10-26',
};

/** Campos com erro, na ordem em que o Zod os reportou. */
function camposComErro(schema: ZodType, entrada: unknown): string[] {
  const resultado = schema.safeParse(entrada);
  if (resultado.success) return [];
  return resultado.error.issues.map((i) => String(i.path[0] ?? ''));
}

describe('mensalistaCriarSchema', () => {
  it('aceita um cadastro válido e normaliza placa e telefone', () => {
    const resultado = mensalistaCriarSchema.parse(mensalistaValido);
    expect(resultado.placa).toBe('QRS7T81');
    expect(resultado.telefone).toBe('12999990000');
    expect(resultado.vaga).toBe('12');
    expect(resultado.valor).toBe('255.00');
  });

  it('aceita a placa no formato antigo', () => {
    expect(mensalistaCriarSchema.parse({ ...mensalistaValido, placa: 'abc-1234' }).placa).toBe(
      'ABC1234',
    );
  });

  it.each(['255,00', '0.00', '-5.00', '255.001', '', 'abc'])(
    'rejeita o valor %j com erro no campo valor',
    (valor) => {
      expect(camposComErro(mensalistaCriarSchema, { ...mensalistaValido, valor })).toContain(
        'valor',
      );
    },
  );

  it('rejeita dia de vencimento 32 e 0', () => {
    expect(
      camposComErro(mensalistaCriarSchema, { ...mensalistaValido, diaVencimento: 32 }),
    ).toContain('diaVencimento');
    expect(
      camposComErro(mensalistaCriarSchema, { ...mensalistaValido, diaVencimento: 0 }),
    ).toContain('diaVencimento');
  });

  it('rejeita placa inválida', () => {
    expect(camposComErro(mensalistaCriarSchema, { ...mensalistaValido, placa: 'XX' })).toContain(
      'placa',
    );
  });

  it('rejeita telefone sem DDD', () => {
    expect(
      camposComErro(mensalistaCriarSchema, { ...mensalistaValido, telefone: '99999-0000' }),
    ).toContain('telefone');
  });

  it('rejeita categoria e tipo fora da lista', () => {
    expect(
      camposComErro(mensalistaCriarSchema, { ...mensalistaValido, categoria: 'caminhao' }),
    ).toContain('categoria');
    expect(camposComErro(mensalistaCriarSchema, { ...mensalistaValido, tipo: 'anual' })).toContain(
      'tipo',
    );
  });

  it('rejeita data de início que não existe no calendário', () => {
    expect(
      camposComErro(mensalistaCriarSchema, { ...mensalistaValido, inicio: '2026-02-30' }),
    ).toContain('inicio');
  });

  it('trata vaga vazia como ausente', () => {
    expect(mensalistaCriarSchema.parse({ ...mensalistaValido, vaga: '  ' }).vaga).toBeUndefined();
  });
});

describe('mensalistaAtualizarSchema', () => {
  it('aceita atualização parcial', () => {
    expect(mensalistaAtualizarSchema.parse({ telefone: '(12) 3333-4444' })).toEqual({
      telefone: '1233334444',
    });
  });

  it('permite remover a vaga com null', () => {
    expect(mensalistaAtualizarSchema.parse({ vaga: null })).toEqual({ vaga: null });
  });

  it('rejeita atualização vazia', () => {
    expect(mensalistaAtualizarSchema.safeParse({}).success).toBe(false);
  });

  it('valida a placa nova', () => {
    expect(camposComErro(mensalistaAtualizarSchema, { placa: 'XX' })).toContain('placa');
  });
});

describe('renovacaoSchema', () => {
  it('exige motivo e meses', () => {
    expect(renovacaoSchema.parse({ motivo: 'Acordo de pagamento', meses: 1 })).toEqual({
      motivo: 'Acordo de pagamento',
      meses: 1,
    });
    expect(camposComErro(renovacaoSchema, { motivo: '', meses: 1 })).toContain('motivo');
    expect(camposComErro(renovacaoSchema, { motivo: 'Acordo', meses: 0 })).toContain('meses');
  });
});

describe('pagamentoCriarSchema', () => {
  const pagamento = { contratoId: 7, valor: '255.00', forma: 'pix', pagoEm: '2026-10-26' };

  it('aceita as quatro formas de pagamento', () => {
    for (const forma of ['dinheiro', 'pix', 'debito', 'credito']) {
      expect(pagamentoCriarSchema.safeParse({ ...pagamento, forma }).success).toBe(true);
    }
  });

  it('rejeita forma de pagamento fora da lista', () => {
    expect(camposComErro(pagamentoCriarSchema, { ...pagamento, forma: 'cheque' })).toContain(
      'forma',
    );
  });

  it('rejeita valor com vírgula', () => {
    expect(camposComErro(pagamentoCriarSchema, { ...pagamento, valor: '255,00' })).toContain(
      'valor',
    );
  });
});

describe('despesaCriarSchema', () => {
  const base = { descricao: 'Aluguel', valor: '5500.00', data: '2026-10-05' };

  it('exige o dia do mês só para despesa fixa', () => {
    expect(camposComErro(despesaCriarSchema, { ...base, tipo: 'fixa' })).toContain('diaDoMes');
    expect(despesaCriarSchema.safeParse({ ...base, tipo: 'fixa', diaDoMes: 5 }).success).toBe(true);
    expect(despesaCriarSchema.safeParse({ ...base, tipo: 'variavel' }).success).toBe(true);
  });

  it('rejeita dia do mês fora de 1 a 31', () => {
    expect(camposComErro(despesaCriarSchema, { ...base, tipo: 'fixa', diaDoMes: 32 })).toContain(
      'diaDoMes',
    );
  });
});

describe('filtrosCaixaSchema', () => {
  it('aceita período sem filtros', () => {
    expect(filtrosCaixaSchema.safeParse({ de: '2026-10-01', ate: '2026-10-31' }).success).toBe(
      true,
    );
  });

  it('rejeita período em que o fim é anterior ao início, no campo ate', () => {
    expect(camposComErro(filtrosCaixaSchema, { de: '2026-10-31', ate: '2026-10-01' })).toContain(
      'ate',
    );
  });

  it('aceita filtros de tipo e categoria', () => {
    const r = filtrosCaixaSchema.parse({
      de: '2026-10-01',
      ate: '2026-10-31',
      tipo: 'mensal',
      categoria: 'moto',
    });
    expect(r.categoria).toBe('moto');
  });
});

describe('loginSchema', () => {
  it('exige login e senha', () => {
    expect(loginSchema.safeParse({ login: 'dono', senha: 'x' }).success).toBe(true);
    expect(camposComErro(loginSchema, { login: '', senha: 'x' })).toContain('login');
    expect(camposComErro(loginSchema, { login: 'dono', senha: '' })).toContain('senha');
  });
});
