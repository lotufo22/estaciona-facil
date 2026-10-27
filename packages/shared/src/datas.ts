export type TipoContrato = 'mensal' | 'semanal';

const MS_POR_DIA = 86_400_000;

function partes(data: string): { ano: number; mes: number; dia: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  if (!m) throw new Error(`Data inválida: "${data}" (esperado AAAA-MM-DD)`);
  return { ano: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
}

function montar(ano: number, mes: number, dia: number): string {
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

export function ultimoDiaDoMes(ano: number, mes: number): number {
  return new Date(Date.UTC(ano, mes, 0)).getUTCDate();
}

/** Dias corridos de `de` até `ate` (negativo se `ate` for anterior). */
export function diasEntre(de: string, ate: string): number {
  const a = partes(de);
  const b = partes(ate);
  const diferenca = Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia);
  return Math.round(diferenca / MS_POR_DIA);
}

export function adicionarDias(data: string, dias: number): string {
  const { ano, mes, dia } = partes(data);
  const d = new Date(Date.UTC(ano, mes - 1, dia + dias));
  return montar(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Próxima data a pagar depois de um pagamento.
 * Mensal: mês seguinte, no `diaVencimento` limitado ao último dia daquele mês.
 * Semanal: 7 dias depois.
 */
export function proximoVencimento(
  vencimentoAtual: string,
  tipo: TipoContrato,
  diaVencimento: number,
): string {
  if (tipo === 'semanal') return adicionarDias(vencimentoAtual, 7);
  const { ano, mes } = partes(vencimentoAtual);
  const anoAlvo = mes === 12 ? ano + 1 : ano;
  const mesAlvo = mes === 12 ? 1 : mes + 1;
  return montar(anoAlvo, mesAlvo, Math.min(diaVencimento, ultimoDiaDoMes(anoAlvo, mesAlvo)));
}

/** Data de hoje (AAAA-MM-DD) no fuso America/Sao_Paulo. */
export function hojeEmSaoPaulo(agora: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(agora);
}
