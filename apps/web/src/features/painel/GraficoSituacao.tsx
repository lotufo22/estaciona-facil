import type { PainelResposta } from '@estacionafacil/shared';
type Chave = keyof PainelResposta['situacao'];
const SEGMENTOS: { chave: Chave; texto: string; cor: string }[] = [
  { chave: 'emDia', texto: 'Em dia', cor: 'bg-ok' },
  { chave: 'aVencer', texto: 'A vencer', cor: 'bg-alerta' },
  { chave: 'vencido', texto: 'Em atraso', cor: 'bg-atraso' },
];
export function GraficoSituacao({ situacao }: { situacao: PainelResposta['situacao'] }) {
  const total = situacao.emDia + situacao.aVencer + situacao.vencido;
  const percentual = total ? Math.round((situacao.emDia / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end gap-3 pt-2">
        <strong className="text-5xl font-semibold tracking-tight">
          {percentual}
          <span className="text-2xl text-texto-suave">%</span>
        </strong>
        <p className="pb-1 text-xs leading-5 text-texto-suave">
          dos contratos
          <br />
          estão em dia
        </p>
      </div>
      <div aria-hidden="true" className="flex h-2 gap-1 overflow-hidden rounded-full bg-fundo">
        {SEGMENTOS.map(({ chave, cor }) => (
          <div
            key={chave}
            className={`rounded-full ${cor}`}
            style={{ width: total ? `${(situacao[chave] / total) * 100}%` : 0 }}
          />
        ))}
      </div>
      <ul className="flex flex-col divide-y divide-borda/70 text-sm">
        {SEGMENTOS.map(({ chave, texto, cor }) => (
          <li key={chave} className="flex items-center justify-between gap-4 py-3">
            <span className="flex items-center gap-2.5 text-texto-suave">
              <span aria-hidden="true" className={`size-2 rounded-full ${cor}`} />
              {texto}
            </span>
            <strong className="font-semibold tabular-nums">{situacao[chave]}</strong>
          </li>
        ))}
      </ul>
      {total === 0 && (
        <p className="text-xs text-texto-suave">Os contratos cadastrados aparecerão aqui.</p>
      )}
    </div>
  );
}
