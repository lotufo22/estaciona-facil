import { useId, type ComponentProps } from 'react';
import { juntar } from './classes';

export interface CampoProps extends Omit<ComponentProps<'input'>, 'value'> {
  rotulo: string;
  /** Texto do campo controlado. Omita para usar com React Hook Form (`register`). */
  valor?: string;
  erro?: string;
  ajuda?: string;
}

export function Campo({ rotulo, valor, erro, ajuda, id, className, ...resto }: CampoProps) {
  const idGerado = useId();
  const idCampo = id ?? idGerado;
  const idMensagem = `${idCampo}-mensagem`;
  const mensagem = erro ?? ajuda;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={idCampo} className="text-sm font-medium text-texto">
        {rotulo}
      </label>
      <input
        id={idCampo}
        value={valor}
        aria-invalid={erro ? 'true' : 'false'}
        aria-describedby={mensagem ? idMensagem : undefined}
        className={juntar(
          'min-h-12 w-full min-w-0 rounded-lg bg-superficie px-4 py-3 text-base text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primaria',
          erro ? 'border-2 border-atraso' : 'border border-borda',
          className,
        )}
        {...resto}
      />
      {mensagem && (
        <p
          id={idMensagem}
          role={erro ? 'alert' : undefined}
          className={erro ? 'text-sm text-atraso' : 'text-sm text-texto-suave'}
        >
          {mensagem}
        </p>
      )}
    </div>
  );
}
