import { ultimoDiaDoMes } from '@estacionafacil/shared';

/** Do primeiro ao último dia do mês de `hoje` (AAAA-MM-DD) e o nome do mês por extenso. */
export function mesDe(hoje: string) {
  const ano = Number(hoje.slice(0, 4));
  const mes = Number(hoje.slice(5, 7));
  const prefixo = hoje.slice(0, 7);
  return {
    de: `${prefixo}-01`,
    ate: `${prefixo}-${String(ultimoDiaDoMes(ano, mes)).padStart(2, '0')}`,
    nome: new Date(Date.UTC(ano, mes - 1, 1)).toLocaleDateString('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }),
  };
}
