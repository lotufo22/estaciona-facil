import { describe, expect, it } from 'vitest';
import { deCentavos, formatarReais, normalizarValor, paraCentavos } from './dinheiro';

describe('dinheiro', () => {
  it('converte texto decimal em centavos inteiros', () => {
    expect(paraCentavos('255.00')).toBe(25500);
  });

  it('não perde centavos que o ponto flutuante perderia', () => {
    expect(paraCentavos('0.10') + paraCentavos('0.20')).toBe(30);
  });

  it('converte centavos em texto decimal com duas casas', () => {
    expect(deCentavos(25500)).toBe('255.00');
  });

  it('converte centavos menores que um real', () => {
    expect(deCentavos(5)).toBe('0.05');
  });

  it('converte centavos negativos', () => {
    expect(deCentavos(-530000)).toBe('-5300.00');
  });

  it('formata em reais com milhar e vírgula', () => {
    expect(formatarReais('11340.00')).toBe('R$ 11.340,00');
  });

  it('formata valor negativo', () => {
    expect(formatarReais('-5300.00')).toBe('-R$ 5.300,00');
  });

  describe('normalizarValor', () => {
    it.each([
      ['150', '150.00'],
      ['150,5', '150.50'],
      ['150,50', '150.50'],
      ['150.50', '150.50'],
      ['1.250,00', '1250.00'],
      ['1250', '1250.00'],
      [' R$ 80,00 ', '80.00'],
    ])('aceita %j e devolve %j', (entrada, esperado) => {
      expect(normalizarValor(entrada)).toBe(esperado);
    });

    it.each(['', 'abc', '255.001', '1.250', '150,505', '-5', '12,3,4'])(
      'devolve %j como veio, para a validação recusar',
      (entrada) => {
        expect(normalizarValor(entrada)).toBe(entrada);
      },
    );
  });
});
