/** Silhueta da tela enquanto os dados chegam: nunca deixa a tela em branco. */
export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">{texto}</span>
      <div aria-hidden="true" className="h-24 animate-pulse rounded-lg bg-borda/60" />
      <div aria-hidden="true" className="h-64 animate-pulse rounded-lg bg-borda/40" />
    </div>
  );
}
