import type { Sessao } from '@estacionafacil/shared';
import { apiFetch } from '../../lib/api';

export function buscarSessao(): Promise<Sessao> {
  return apiFetch<Sessao>('/auth/me', { naoRedirecionarEm401: true });
}

export function fazerLogin(login: string, senha: string): Promise<Sessao> {
  return apiFetch<Sessao>('/auth/login', {
    metodo: 'POST',
    corpo: { login, senha },
    naoRedirecionarEm401: true,
  });
}

export function fazerLogout(): Promise<void> {
  return apiFetch<void>('/auth/logout', { metodo: 'POST', naoRedirecionarEm401: true });
}
