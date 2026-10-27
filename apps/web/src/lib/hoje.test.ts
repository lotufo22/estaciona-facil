import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOJE_MOCK } from '../mocks/banco';
import { fixarHoje, hoje } from './hoje';

// O setup dos testes fixa a data dos mocks; aqui cada teste decide a sua e devolve a dos mocks no fim.
afterEach(() => {
  vi.useRealTimers();
  fixarHoje(HOJE_MOCK);
});

describe('hoje', () => {
  describe('sem data fixada', () => {
    beforeEach(() => fixarHoje(null));

    it('é a data de hoje em São Paulo', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2027-03-15T15:00:00-03:00'));
      expect(hoje()).toBe('2027-03-15');
    });

    it('à noite em São Paulo ainda é o mesmo dia, mesmo já sendo o dia seguinte em UTC', () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2027-03-16T01:30:00Z'));
      expect(hoje()).toBe('2027-03-15');
    });
  });

  it('com a data fixada, ignora o relógio', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T15:00:00-03:00'));
    fixarHoje('2026-10-26');
    expect(hoje()).toBe('2026-10-26');
  });

  it('fixarHoje(null) volta a usar a data real', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2027-03-15T15:00:00-03:00'));
    fixarHoje('2026-10-26');
    fixarHoje(null);
    expect(hoje()).toBe('2027-03-15');
  });

  it('os testes começam com a data dos mocks', () => {
    expect(hoje()).toBe(HOJE_MOCK);
  });
});
