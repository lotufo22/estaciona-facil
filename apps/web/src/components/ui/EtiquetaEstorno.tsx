/** Marca um lançamento estornado. Sempre com texto: a cor sozinha não basta. */
export function EtiquetaEstorno({ feminino = false }: { feminino?: boolean }) {
  return (
    <span className="inline-flex items-center rounded-full bg-atraso-fundo px-3 py-1 text-base font-semibold text-atraso">
      {feminino ? 'Estornada' : 'Estornado'}
    </span>
  );
}
