import request from 'supertest';
import { expect } from 'vitest';
import type { Express } from 'express';
import type { Perfil } from '@estacionafacil/shared';
import { criarUsuario } from '../src/autenticacao/usuarios';
import type { PrismaClient } from '../src/prisma';

export const SENHA = 'senha-forte-123';
export const CABECALHO = { 'X-Estaciona-App': '1' };

/** Cria um usuário de cada perfil e uma carga mínima de vagas (2 de carro, 1 de moto). */
export async function semearBasico(prisma: PrismaClient): Promise<void> {
  for (const perfil of ['proprietario', 'auxiliar'] as const) {
    await criarUsuario(prisma, { nome: perfil, login: perfil, senha: SENHA, perfil });
  }
  await prisma.vaga.createMany({
    data: [
      { codigo: 'C01', categoria: 'carro' },
      { codigo: 'C02', categoria: 'carro' },
      { codigo: 'M01', categoria: 'moto' },
    ],
  });
}

/** Faz login e devolve o cookie pronto para `.set('Cookie', ...)`. */
export async function entrarComo(app: Express, perfil: Perfil): Promise<string> {
  const resposta = await request(app)
    .post('/api/auth/login')
    .set(CABECALHO)
    .send({ login: perfil, senha: SENHA });
  expect(resposta.status).toBe(200);
  const cookie = (resposta.headers['set-cookie'] as unknown as string[])[0] ?? '';
  return cookie.split(';')[0] ?? '';
}

export function mensalistaValido(sobrescritas: Record<string, unknown> = {}) {
  return {
    nome: 'Joana Prado',
    telefone: '(12) 99999-0000',
    placa: 'ABC1D23',
    categoria: 'carro',
    vaga: 'C01',
    tipo: 'mensal',
    valor: '255.00',
    diaVencimento: 5,
    inicio: '2026-10-05',
    ...sobrescritas,
  };
}
