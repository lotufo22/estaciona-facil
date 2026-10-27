import type { VencimentosResposta } from '@estacionafacil/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../lib/api';

/** Quantidade de contratos vencidos para o sino da barra. Só o Proprietário consulta. */
export function useContagemVencidos(habilitado: boolean) {
  return useQuery({
    queryKey: ['vencimentos', 'contagem'],
    queryFn: () => apiFetch<VencimentosResposta>('/vencimentos'),
    select: (dados) => dados.totais.vencido.quantidade,
    enabled: habilitado,
  });
}
