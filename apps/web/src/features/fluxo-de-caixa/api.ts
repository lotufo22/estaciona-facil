import type { CaixaResposta, FiltrosCaixa } from '@estacionafacil/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

function montarConsulta(filtros: FiltrosCaixa): string {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor) parametros.set(chave, valor);
  }
  return `?${parametros.toString()}`;
}

/**
 * `habilitado` fica falso enquanto o período digitado é inválido: a tela mostra o erro do campo
 * e segue com os últimos números válidos, sem consultar a API com dados errados.
 */
export function useCaixa(filtros: FiltrosCaixa, opcoes: { habilitado?: boolean } = {}) {
  return useQuery({
    queryKey: ['caixa', filtros],
    queryFn: () => apiFetch<CaixaResposta>(`/caixa${montarConsulta(filtros)}`),
    placeholderData: keepPreviousData,
    enabled: opcoes.habilitado ?? true,
  });
}
