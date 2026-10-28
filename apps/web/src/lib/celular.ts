import { useSyncExternalStore } from 'react';

/** Telas até 639 px (abaixo do `sm` do Tailwind): o celular em pé. */
const CONSULTA_DO_CELULAR = '(max-width: 639px)';

function temMatchMedia(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function';
}

function assinar(avisar: () => void): () => void {
  if (!temMatchMedia()) return () => undefined;
  const consulta = window.matchMedia(CONSULTA_DO_CELULAR);
  consulta.addEventListener('change', avisar);
  return () => consulta.removeEventListener('change', avisar);
}

function valorAtual(): boolean {
  return temMatchMedia() ? window.matchMedia(CONSULTA_DO_CELULAR).matches : false;
}

/**
 * `true` quando a tela é de celular. Muda sozinho se a pessoa girar o aparelho. Sem `matchMedia`
 * (testes em jsdom) vale `false`, ou seja, o layout de computador.
 *
 * Existe em vez de classes só de CSS porque a barra de baixo e a barra de cima têm abas diferentes:
 * com as duas no HTML, leitores de tela e testes enxergariam os links duplicados.
 */
export function useEhCelular(): boolean {
  return useSyncExternalStore(assinar, valorAtual, () => false);
}
