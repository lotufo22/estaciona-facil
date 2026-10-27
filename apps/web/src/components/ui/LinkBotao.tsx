import { Link, type LinkProps } from 'react-router-dom';
import { classesDoBotao } from './Botao';
import { juntar } from './classes';

interface LinkBotaoProps extends LinkProps {
  variante?: 'primario' | 'secundario';
}

/** Navegação (um link de verdade) com a aparência de um botão. */
export function LinkBotao({ variante = 'primario', className, ...resto }: LinkBotaoProps) {
  return <Link className={juntar(classesDoBotao(variante), className)} {...resto} />;
}
