/** Maiúsculas, sem hífen nem espaços: " qrs-7t81 " → "QRS7T81". */
export function normalizarPlaca(texto: string): string {
  return texto.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Placa normalizada com hífen após a terceira letra: "QRS7T81" → "QRS-7T81". */
export function formatarPlaca(placa: string): string {
  return placa.length > 3 ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa;
}
