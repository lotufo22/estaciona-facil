export function Rodape({ celular = false }: { celular?: boolean }) {
  return (
    <footer
      className={`mt-auto flex flex-wrap justify-between gap-2 border-t border-borda px-4 py-5 text-[11px] leading-relaxed text-texto-suave sm:px-6 lg:px-10 ${celular ? 'pb-24' : ''}`}
    >
      <span>{'© 2026 EstacionaFácil · '}</span>
      <span>Projeto Integrador IV · Universidade de Taubaté</span>
    </footer>
  );
}
