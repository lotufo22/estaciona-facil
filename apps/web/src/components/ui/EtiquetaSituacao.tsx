import type { Situacao } from '@estacionafacil/shared';

const ESTILOS: Record<Situacao, { texto: string; classe: string; ponto: string }> = {
  em_dia: { texto: 'Em dia', classe: 'bg-ok-fundo text-ok', ponto: 'bg-ok' },
  a_vencer: { texto: 'A vencer', classe: 'bg-alerta-fundo text-alerta', ponto: 'bg-alerta' },
  vencido: { texto: 'Em atraso', classe: 'bg-atraso-fundo text-atraso', ponto: 'bg-atraso' },
};

/** A situação sempre aparece com texto: a cor sozinha não basta. */
export function EtiquetaSituacao({ situacao }: { situacao: Situacao }) {
  const { texto, classe, ponto } = ESTILOS[situacao];
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-base font-semibold ${classe}`}
    >
      <span aria-hidden="true" className={`size-2.5 rounded-full ${ponto}`} />
      {texto}
    </span>
  );
}
