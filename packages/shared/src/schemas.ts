import { z } from 'zod';
import { ultimoDiaDoMes } from './datas';
import { paraCentavos } from './dinheiro';
import { CATEGORIAS, FORMAS_PAGAMENTO, TIPOS_CONTRATO, TIPOS_DESPESA } from './enums';
import { normalizarPlaca } from './placa';

const FORMATO_VALOR = /^\d+\.\d{2}$/;
const FORMATO_PLACA = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/;

function dataExiste(texto: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  if (!m) return false;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  return mes >= 1 && mes <= 12 && dia >= 1 && dia <= ultimoDiaDoMes(ano, mes);
}

// O Zod 4 continua executando os checks depois de uma falha; por isso o refine
// só converte quando o formato já está certo (paraCentavos lança em texto inválido).
const valorSchema = z
  .string()
  .regex(FORMATO_VALOR, 'Informe o valor com duas casas decimais, como 255.00')
  .refine((v) => !FORMATO_VALOR.test(v) || paraCentavos(v) > 0, 'O valor deve ser maior que zero');

const dataSchema = z.string().refine(dataExiste, 'Data inválida. Use o formato AAAA-MM-DD');

const placaSchema = z
  .string()
  .transform(normalizarPlaca)
  .pipe(z.string().regex(FORMATO_PLACA, 'Placa inválida. Use o formato ABC-1234 ou ABC-1D23'));

const telefoneSchema = z
  .string()
  .transform((t) => t.replace(/\D/g, ''))
  .pipe(z.string().regex(/^\d{10,11}$/, 'Informe o telefone com DDD, de 10 ou 11 números'));

const nomeSchema = z
  .string()
  .trim()
  .min(3, 'Informe o nome completo')
  .max(120, 'O nome pode ter no máximo 120 letras');

const codigoVagaSchema = z
  .string()
  .trim()
  .min(1, 'Informe o código da vaga')
  .max(10, 'O código da vaga pode ter no máximo 10 caracteres');

const diaSchema = (mensagem: string) => z.number().int(mensagem).min(1, mensagem).max(31, mensagem);

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Informe o usuário'),
  senha: z.string().min(1, 'Informe a senha'),
});

export const mensalistaCriarSchema = z.object({
  nome: nomeSchema,
  telefone: telefoneSchema,
  placa: placaSchema,
  categoria: z.enum(CATEGORIAS, { error: 'Escolha carro ou moto' }),
  vaga: z
    .string()
    .trim()
    .max(10, 'O código da vaga pode ter no máximo 10 caracteres')
    .optional()
    .transform((v) => (v ? v : undefined)),
  tipo: z.enum(TIPOS_CONTRATO, { error: 'Escolha mensal ou semanal' }),
  valor: valorSchema,
  diaVencimento: diaSchema('O dia do vencimento deve ser de 1 a 31'),
  inicio: dataSchema,
});

export const mensalistaAtualizarSchema = z
  .object({
    telefone: telefoneSchema,
    placa: placaSchema,
    vaga: codigoVagaSchema.nullable(),
    valor: valorSchema,
  })
  .partial()
  .refine((o) => Object.keys(o).length > 0, 'Informe ao menos um campo para atualizar');

export const renovacaoSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(3, 'Explique o motivo da renovação')
    .max(200, 'O motivo pode ter no máximo 200 letras'),
  meses: z
    .number()
    .int('Informe um número inteiro de meses')
    .min(1, 'Renove por pelo menos 1 mês')
    .max(12, 'Renove por no máximo 12 meses'),
});

export const pagamentoCriarSchema = z.object({
  contratoId: z.number().int().positive(),
  valor: valorSchema,
  forma: z.enum(FORMAS_PAGAMENTO, { error: 'Escolha a forma de pagamento' }),
  pagoEm: dataSchema,
});

export const despesaCriarSchema = z
  .object({
    descricao: z
      .string()
      .trim()
      .min(3, 'Descreva a despesa')
      .max(120, 'A descrição pode ter no máximo 120 letras'),
    valor: valorSchema,
    tipo: z.enum(TIPOS_DESPESA, { error: 'Escolha fixa ou variável' }),
    data: dataSchema,
    diaDoMes: diaSchema('O dia do mês deve ser de 1 a 31').optional(),
  })
  .superRefine((d, ctx) => {
    if (d.tipo === 'fixa' && d.diaDoMes === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['diaDoMes'],
        message: 'Informe o dia do mês em que a despesa se repete',
      });
    }
  });

export const filtrosCaixaSchema = z
  .object({
    de: dataSchema,
    ate: dataSchema,
    tipo: z.enum(TIPOS_CONTRATO).optional(),
    categoria: z.enum(CATEGORIAS).optional(),
  })
  .superRefine((f, ctx) => {
    if (dataExiste(f.de) && dataExiste(f.ate) && f.ate < f.de) {
      ctx.addIssue({
        code: 'custom',
        path: ['ate'],
        message: 'A data final não pode ser anterior à data inicial',
      });
    }
  });

export type LoginEntrada = z.infer<typeof loginSchema>;
export type MensalistaCriarEntrada = z.infer<typeof mensalistaCriarSchema>;
export type MensalistaAtualizarEntrada = z.infer<typeof mensalistaAtualizarSchema>;
export type RenovacaoEntrada = z.infer<typeof renovacaoSchema>;
export type PagamentoEntrada = z.infer<typeof pagamentoCriarSchema>;
export type DespesaEntrada = z.infer<typeof despesaCriarSchema>;
export type FiltrosCaixa = z.infer<typeof filtrosCaixaSchema>;
