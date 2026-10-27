import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Lido pelo sistema de arquivos: o Vitest troca arquivos .css por texto vazio (inclusive com ?raw).
const css = readFileSync(resolve(import.meta.dirname, 'estilos.css'), 'utf8');

function cor(nome: string): string {
  const m = new RegExp(`--color-${nome}:\\s*(#[0-9a-fA-F]{6})\\s*;`).exec(css);
  if (!m?.[1]) throw new Error(`Token de cor ausente em estilos.css: --color-${nome}`);
  return m[1].toLowerCase();
}

function luminancia(hex: string): number {
  const canais = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = canais.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contraste(a: string, b: string): number {
  const [claro, escuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro! + 0.05) / (escuro! + 0.05);
}

const TOKENS = [
  'primaria',
  'primaria-escura',
  'primaria-clara',
  'destaque',
  'amarelo',
  'texto',
  'texto-suave',
  'fundo',
  'superficie',
  'borda',
  'ok',
  'ok-fundo',
  'alerta',
  'alerta-fundo',
  'atraso',
  'atraso-fundo',
  'barra',
  'barra-texto',
  'barra-icone',
  'barra-ativa',
];

// Texto (primeiro) sobre o fundo (segundo): todos os usos de texto da interface.
const PARES_DE_TEXTO: [string, string][] = [
  ['texto', 'fundo'],
  ['texto', 'superficie'],
  ['texto-suave', 'fundo'],
  ['texto-suave', 'superficie'],
  ['primaria', 'superficie'],
  ['primaria', 'fundo'],
  ['primaria', 'primaria-clara'],
  ['ok', 'ok-fundo'],
  ['alerta', 'alerta-fundo'],
  ['atraso', 'atraso-fundo'],
  ['atraso', 'superficie'],
  ['barra-texto', 'barra'],
  ['ok', 'superficie'],
  ['primaria', 'superficie'],
];

const BRANCO = '#ffffff';
const PARES_SOBRE_BRANCO = [
  'primaria',
  'primaria-escura',
  'atraso',
  'ok',
  'destaque',
  'barra',
  'barra-ativa',
];

describe('tokens de cor (spec §7)', () => {
  it.each(TOKENS)('o token %s existe como cor hexadecimal', (nome) => {
    expect(cor(nome)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('usa a fonte Inter', () => {
    expect(css).toMatch(/--font-sans:\s*'Inter Variable'/);
  });
});

describe('contraste de texto ≥ 4,5:1', () => {
  it.each(PARES_DE_TEXTO)('%s sobre %s', (texto, fundo) => {
    expect(contraste(cor(texto), cor(fundo))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(PARES_SOBRE_BRANCO)('texto branco sobre %s', (fundo) => {
    expect(contraste(BRANCO, cor(fundo))).toBeGreaterThanOrEqual(4.5);
  });
});
