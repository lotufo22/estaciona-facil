import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ErroApiCliente } from './api';

const MENSAGEM_GENERICA = 'Não foi possível salvar. Tente de novo.';

/**
 * Coloca os erros por campo da API (409 e 422) sob o campo certo do formulário.
 * Devolve a mensagem geral quando o erro não aponta para nenhum campo; senão, null.
 */
export function aplicarErroDeApi<T extends FieldValues>(
  erro: unknown,
  setError: UseFormSetError<T>,
  camposDoFormulario: readonly Path<T>[],
): string | null {
  if (!(erro instanceof ErroApiCliente)) return MENSAGEM_GENERICA;
  let aplicou = false;
  for (const [campo, message] of Object.entries(erro.campos ?? {})) {
    if ((camposDoFormulario as readonly string[]).includes(campo)) {
      setError(campo as Path<T>, { type: 'server', message });
      aplicou = true;
    }
  }
  return aplicou ? null : erro.message;
}
