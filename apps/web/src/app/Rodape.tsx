export function Rodape({ celular = false }: { celular?: boolean }) {
  return (
    <footer
      className={`mt-auto border-t border-borda bg-superficie px-4 py-4 text-center text-sm text-texto-suave sm:px-8 ${
        celular ? 'pb-24' : ''
      }`}
    >
      © 2026 EstacionaFácil · Projeto Integrador IV · Universidade de Taubaté
    </footer>
  );
}
