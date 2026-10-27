import type {
  PagamentoEntrada,
  PagamentoItem,
  PagamentosResposta,
  RegistroPagamentoResposta,
} from '@estacionafacil/shared';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { apiFetch, type ErroApiCliente } from '../../lib/api';

export interface FiltroPagamentos {
  de?: string;
  ate?: string;
}

const chaveDoPagamento = (id: number) => ['pagamentos', 'detalhe', id] as const;

function montarConsulta(filtro: FiltroPagamentos): string {
  const parametros = new URLSearchParams();
  for (const [chave, valor] of Object.entries(filtro)) {
    if (valor) parametros.set(chave, valor);
  }
  const texto = parametros.toString();
  return texto ? `?${texto}` : '';
}

export function usePagamentos(filtro: FiltroPagamentos) {
  return useQuery({
    queryKey: ['pagamentos', 'lista', filtro],
    queryFn: () => apiFetch<PagamentosResposta>(`/pagamentos${montarConsulta(filtro)}`),
    placeholderData: keepPreviousData,
  });
}

export function usePagamento(id: number) {
  return useQuery({
    queryKey: chaveDoPagamento(id),
    queryFn: () => apiFetch<PagamentoItem>(`/pagamentos/${id}`),
    enabled: Number.isInteger(id) && id > 0,
  });
}

/**
 * Registra o recebimento. A `Idempotency-Key` identifica o envio: reenviar o mesmo formulário
 * depois de uma falha de rede (ou de um erro 5xx, em que não se sabe se o servidor gravou) usa a
 * mesma chave, e o servidor não registra duas vezes. Mudar algum dado, uma recusa definitiva (4xx)
 * ou o sucesso encerram a tentativa: o próximo envio ganha uma chave nova.
 */
export function useRegistrarPagamento() {
  const cliente = useQueryClient();
  const tentativa = useRef<{ chave: string; assinatura: string } | null>(null);

  return useMutation<RegistroPagamentoResposta, ErroApiCliente, PagamentoEntrada>({
    mutationFn: (dados) => {
      const assinatura = JSON.stringify(dados);
      if (tentativa.current?.assinatura !== assinatura) {
        tentativa.current = { chave: crypto.randomUUID(), assinatura };
      }
      return apiFetch<RegistroPagamentoResposta>('/pagamentos', {
        metodo: 'POST',
        corpo: dados,
        idempotencia: tentativa.current.chave,
      });
    },
    onSuccess: ({ pagamento }) => {
      tentativa.current = null;
      cliente.setQueryData(chaveDoPagamento(pagamento.id), pagamento);
      // O pagamento muda o vencimento do contrato, as listas e os totais.
      for (const chave of ['pagamentos', 'mensalistas', 'vencimentos', 'painel']) {
        void cliente.invalidateQueries({ queryKey: [chave] });
      }
    },
    onError: (erro) => {
      if (erro.status >= 400 && erro.status < 500) tentativa.current = null;
    },
  });
}
