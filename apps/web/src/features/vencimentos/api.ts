import type {
  Categoria,
  Situacao,
  TipoContrato,
  VencimentosResposta,
} from '@estacionafacil/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface FiltrosVencimentos {
  situacao?: Situacao;
  categoria?: Categoria;
  tipo?: TipoContrato;
}

function montarConsulta(filtros: FiltrosVencimentos): string {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor) parametros.set(chave, valor);
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

export function useVencimentos(filtros: FiltrosVencimentos) {
  return useQuery({
    queryKey: ['vencimentos', 'lista', filtros],
    queryFn: () => apiFetch<VencimentosResposta>(`/vencimentos${montarConsulta(filtros)}`),
    placeholderData: keepPreviousData,
  });
}
