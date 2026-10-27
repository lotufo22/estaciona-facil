/** "2026-10-10" → "10/10/2026". */
export function formatarData(data: string): string {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

/** "12999990000" → "(12) 99999-0000"; números fora do padrão voltam como vieram. */
export function formatarTelefone(digitos: string): string {
  const m = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digitos);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : digitos;
}
