import type { PainelResposta } from '@estacionafacil/shared';

type Chave = keyof PainelResposta['situacao'];

const SEGMENTOS: { chave: Chave; texto: string; cor: string }[] = [
  { chave: 'emDia', texto: 'Em dia', cor: 'bg-ok' },
  { chave: 'aVencer', texto: 'A vencer', cor: 'bg-alerta' },
  { chave: 'vencido', texto: 'Em atraso', cor: 'bg-atraso' },
];

/** Barra proporcional; a quantidade e o nome de cada situação ficam sempre em texto. */
export function GraficoSituacao({ situacao }: { situacao: PainelResposta['situacao'] }) {
  const total = situacao.emDia + situacao.aVencer + situacao.vencido;
  return (
    <div className="flex flex-col gap-4">
      <div aria-hidden="true" className="flex h-4 overflow-hidden rounded-full bg-borda/60">
        {SEGMENTOS.map(({ chave, cor }) => (
          <div
            key={chave}
            className={cor}
            style={{ width: total ? `${(situacao[chave] / total) * 100}%` : 0 }}
          />
        ))}
      </div>
      <ul className="flex flex-col gap-2 text-base">
        {SEGMENTOS.map(({ chave, texto, cor }) => (
          <li key={chave} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-3 rounded-full ${cor}`} />
              {texto}
            </span>
            <strong>{situacao[chave]}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}
