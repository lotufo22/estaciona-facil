import type {
  Categoria,
  ListaMensalistasResposta,
  MensalistaAtualizarEntrada,
  MensalistaCriarEntrada,
  MensalistaDetalhe,
  RenovacaoEntrada,
  Situacao,
  TipoContrato,
} from '@estacionafacil/shared';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '../../lib/api';

export interface FiltrosMensalistas {
  busca?: string;
  situacao?: Situacao;
  categoria?: Categoria;
  tipo?: TipoContrato;
  pagina?: number;
}

function montarConsulta(filtros: FiltrosMensalistas): string {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') parametros.set(chave, String(valor));
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

const chaveDoDetalhe = (id: number) => ['mensalistas', 'detalhe', id] as const;

/** Depois de mudar um contrato, tudo que mostra mensalistas, vencimentos ou totais fica velho. */
function invalidarDependentes(cliente: QueryClient) {
  void cliente.invalidateQueries({ queryKey: ['mensalistas'] });
  void cliente.invalidateQueries({ queryKey: ['vencimentos'] });
  void cliente.invalidateQueries({ queryKey: ['painel'] });
}

export function useMensalistas(filtros: FiltrosMensalistas) {
  return useQuery({
    queryKey: ['mensalistas', 'lista', filtros],
    queryFn: () => apiFetch<ListaMensalistasResposta>(`/mensalistas${montarConsulta(filtros)}`),
    placeholderData: keepPreviousData,
  });
}

export function useMensalista(id: number) {
  return useQuery({
    queryKey: chaveDoDetalhe(id),
    queryFn: () => apiFetch<MensalistaDetalhe>(`/mensalistas/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

export function useCriarMensalista() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: MensalistaCriarEntrada) =>
      apiFetch<{ mensalistaId: number; contratoId: number }>('/mensalistas', {
        metodo: 'POST',
        corpo: dados,
      }),
    onSuccess: () => invalidarDependentes(cliente),
  });
}

/** Guarda o detalhe devolvido pela API e avisa o resto das telas. */
function aoAtualizarDetalhe(cliente: QueryClient, detalhe: MensalistaDetalhe) {
  cliente.setQueryData(chaveDoDetalhe(detalhe.id), detalhe);
  invalidarDependentes(cliente);
}

export function useAtualizarMensalista(id: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (dados: MensalistaAtualizarEntrada) =>
      apiFetch<MensalistaDetalhe>(`/mensalistas/${id}`, { metodo: 'PATCH', corpo: dados }),
    onSuccess: (detalhe) => aoAtualizarDetalhe(cliente, detalhe),
  });
}

export function useRenovarContrato() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ contratoId, ...dados }: RenovacaoEntrada & { contratoId: number }) =>
      apiFetch<MensalistaDetalhe>(`/contratos/${contratoId}/renovacao`, {
        metodo: 'POST',
        corpo: dados,
      }),
    onSuccess: (detalhe) => aoAtualizarDetalhe(cliente, detalhe),
  });
}

export function useEncerrarContrato() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (contratoId: number) =>
      apiFetch<MensalistaDetalhe>(`/contratos/${contratoId}/encerramento`, { metodo: 'POST' }),
    onSuccess: (detalhe) => aoAtualizarDetalhe(cliente, detalhe),
  });
}
