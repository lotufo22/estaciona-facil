/** Junta classes CSS ignorando valores vazios. */
export function juntar(...partes: (string | false | null | undefined)[]): string {
  return partes.filter(Boolean).join(' ');
}
