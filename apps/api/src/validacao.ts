import { ErroHttp } from './erros';

/** O que `validar` precisa de um schema Zod (sem a API depender do zod diretamente). */
interface Esquema<T> {
  safeParse(
    dados: unknown,
  ): { success: true; data: T } | { success: false; error: { issues: Problema[] } };
}
interface Problema {
  path: PropertyKey[];
  message: string;
}

/**
 * Valida o corpo de uma requisição com um schema do pacote `shared`. Se estiver errado, lança o
 * 422 da spec com a primeira mensagem de cada campo: `{ campos: { valor: "..." } }`.
 */
export function validar<T>(esquema: Esquema<T>, dados: unknown): T {
  const resultado = esquema.safeParse(dados);
  if (resultado.success) return resultado.data;

  const campos: Record<string, string> = {};
  for (const problema of resultado.error.issues) {
    const campo = String(problema.path[0] ?? 'corpo');
    campos[campo] ??= problema.message;
  }
  throw new ErroHttp(422, 'DADOS_INVALIDOS', 'Confira os campos.', campos);
}
