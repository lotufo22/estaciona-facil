interface MarcaProps {
  clara?: boolean;
  compacta?: boolean;
}

/** Os arquivos de marca preservam o desenho original; o texto adapta o contraste ao fundo. */
export function Marca({ clara = false, compacta = false }: MarcaProps) {
  if (!clara && !compacta) {
    return (
      <div className="w-60 max-w-full">
        <img
          src="/marca/logo-horizontal-480.png"
          srcSet="/marca/logo-horizontal-480.png 480w, /marca/logo-horizontal-960.png 960w"
          sizes="240px"
          width={480}
          height={105}
          alt="EstacionaFácil"
          decoding="async"
          className="h-auto w-full"
        />
        <p className="mt-2 text-[9px] font-medium tracking-[.14em] text-texto-suave uppercase">
          Gestão inteligente de estacionamentos
        </p>
      </div>
    );
  }

  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${clara ? 'text-white' : 'text-texto'}`}>
      <img
        src="/marca/icone-48.png"
        srcSet="/marca/icone-48.png 1x, /marca/icone-96.png 2x"
        width={40}
        height={40}
        alt=""
        decoding="async"
        className="size-10 shrink-0 object-contain"
      />
      <div className="min-w-0">
        <p className="text-[15px] font-semibold tracking-tight whitespace-nowrap">
          Estaciona<span className={clara ? 'text-marca-azul-claro' : 'text-primaria'}>Fácil</span>
        </p>
        {!compacta && (
          <p
            className={`mt-1 text-[9px] font-medium tracking-[.08em] uppercase ${clara ? 'text-barra-texto' : 'text-texto-suave'}`}
          >
            Gestão inteligente
          </p>
        )}
      </div>
    </div>
  );
}
