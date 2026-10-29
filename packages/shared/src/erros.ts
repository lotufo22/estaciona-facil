export const CODIGOS_ERRO = [
  'PLACA_JA_CADASTRADA',
  'VAGA_OCUPADA',
  'LOGIN_EM_USO',
  'CONTRATO_ENCERRADO',
  'CREDENCIAIS_INVALIDAS',
  'MUITAS_TENTATIVAS',
  'SEM_PERMISSAO',
  'NAO_AUTENTICADO',
  'NAO_ENCONTRADO',
  'DADOS_INVALIDOS',
  'CHAVE_IDEMPOTENCIA_AUSENTE',
  'ERRO_INTERNO',
] as const;

export type CodigoErro = (typeof CODIGOS_ERRO)[number];

/** Corpo de toda resposta de erro da API. `mensagem` vai direto para a tela. */
export interface ErroApi {
  erro: {
    codigo: CodigoErro;
    mensagem: string;
    campos?: Record<string, string>;
  };
}
