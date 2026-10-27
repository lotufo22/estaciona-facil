import type {
  DespesaEntrada,
  DespesasResposta,
  RecorrenciaItem,
  RecorrenciasResposta,
} from '@estacionafacil/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface PeriodoDespesas {
  de: string;
  ate: string;
}

export function useDespesas(periodo: PeriodoDespesas) {
  return useQuery({
    queryKey: ['despesas', 'lista', periodo],
    queryFn: () => apiFetch<DespesasResposta>(`/despesas?de=${periodo.de}&ate=${periodo.ate}`),
    placeholderData: keepPreviousData,
  });
}

export function useCriarDespesa() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: DespesaEntrada) =>
      apiFetch<{ despesaId: number; recorrenciaId: number | null }>('/despesas', {
        metodo: 'POST',
        corpo: dados,
      }),
    onSuccess: () => {
      // A despesa muda a lista, as despesas fixas (se for fixa) e o resultado do mês.
      for (const chave of ['despesas', 'recorrencias', 'caixa', 'painel']) {
        void cliente.invalidateQueries({ queryKey: [chave] });
      }
    },
  });
}

export function useRecorrencias() {
  return useQuery({
    queryKey: ['recorrencias'],
    queryFn: () => apiFetch<RecorrenciasResposta>('/recorrencias'),
  });
}

/** Pausa ou retoma uma despesa fixa; só o Proprietário pode. */
export function useAlternarRecorrencia() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativa }: { id: number; ativa: boolean }) =>
      apiFetch<RecorrenciaItem>(`/recorrencias/${id}`, { metodo: 'PATCH', corpo: { ativa } }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['recorrencias'] }),
  });
}
