import { useSyncExternalStore } from 'react';
const CONSULTA = '(prefers-reduced-motion: reduce)';
function assinar(avisar: () => void) {
  const consulta = typeof window.matchMedia === 'function' ? window.matchMedia(CONSULTA) : null;
  consulta?.addEventListener('change', avisar);
  return () => consulta?.removeEventListener('change', avisar);
}
function valorAtual() {
  return typeof window.matchMedia === 'function' && window.matchMedia(CONSULTA).matches;
}
export function useReduzirMovimento() {
  return useSyncExternalStore(assinar, valorAtual, () => true);
}
