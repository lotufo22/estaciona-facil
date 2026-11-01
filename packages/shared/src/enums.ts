export const PERFIS = ['proprietario', 'auxiliar'] as const;
export type Perfil = (typeof PERFIS)[number];

export const CATEGORIAS = ['carro', 'moto'] as const;
export type Categoria = (typeof CATEGORIAS)[number];

export const TIPOS_CONTRATO = ['mensal', 'semanal'] as const;

/** Turno do contrato: a mesma vaga numerada pode ter um diurno e um noturno. */
export const TURNOS = ['diurno', 'noturno'] as const;
export type Turno = (typeof TURNOS)[number];

export const FORMAS_PAGAMENTO = ['dinheiro', 'pix', 'debito', 'credito'] as const;
export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export const TIPOS_DESPESA = ['fixa', 'variavel'] as const;
export type TipoDespesa = (typeof TIPOS_DESPESA)[number];
