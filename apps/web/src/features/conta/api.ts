import type { Sessao } from '@estacionafacil/shared';
import { useMutation } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export function useAtualizarNome() {
  return useMutation({
    mutationFn: (nome: string) => apiFetch<Sessao>('/conta', { metodo: 'PATCH', corpo: { nome } }),
  });
}

export function useTrocarSenha() {
  return useMutation({
    mutationFn: (dados: { senhaAtual: string; novaSenha: string }) =>
      apiFetch<undefined>('/conta/senha', { metodo: 'POST', corpo: dados }),
  });
}
