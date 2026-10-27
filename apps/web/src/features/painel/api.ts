import type { PainelResposta } from '@estacionafacil/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export function usePainel() {
  return useQuery({
    queryKey: ['painel'],
    queryFn: () => apiFetch<PainelResposta>('/painel'),
  });
}
