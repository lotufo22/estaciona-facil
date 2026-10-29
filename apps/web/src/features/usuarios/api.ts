import type {
  UsuarioAtualizarEntrada,
  UsuarioCriarEntrada,
  UsuarioItem,
  UsuariosResposta,
} from '@estacionafacil/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

const CHAVE = ['usuarios'] as const;

export function useUsuarios() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: () => apiFetch<UsuariosResposta>('/usuarios'),
  });
}

export function useCriarUsuario() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: UsuarioCriarEntrada) =>
      apiFetch<UsuarioItem>('/usuarios', { metodo: 'POST', corpo: dados }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useAtualizarUsuario(id: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: UsuarioAtualizarEntrada) =>
      apiFetch<UsuarioItem>(`/usuarios/${id}`, { metodo: 'PATCH', corpo: dados }),
    onSuccess: () => cliente.invalidateQueries({ queryKey: CHAVE }),
  });
}
