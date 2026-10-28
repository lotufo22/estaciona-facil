import { formatarReais, paraCentavos, type CaixaResposta } from '@estacionafacil/shared';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { NOME_DA_FORMA } from '../recebimentos/Comprovante';

/** Cada forma tem cor e também nome, valor e percentual em texto: a cor sozinha não basta. */
const COR_DA_FORMA = {
  pix: '#0A7F75',
  dinheiro: '#4A55C7',
  debito: '#E0A100',
  credito: '#52606D',
} as const;

const emReais = (valor: unknown) => formatarReais(Number(valor).toFixed(2));

export function GraficoFormas({ porForma }: { porForma: CaixaResposta['porForma'] }) {
  const formas = porForma
    .map((f) => ({ ...f, centavos: paraCentavos(f.total) }))
    .sort((a, b) => b.centavos - a.centavos);
  const total = formas.reduce((soma, f) => soma + f.centavos, 0);

  if (total === 0) {
    return <p className="text-base text-texto-suave">Sem recebimentos no período.</p>;
  }

  const itens = formas.map((f) => ({
    ...f,
    nome: NOME_DA_FORMA[f.forma],
    percentual: Math.round((f.centavos / total) * 100),
  }));
  const resumo = itens
    .map((f) => `${f.nome}: ${formatarReais(f.total)}, ${f.percentual}%`)
    .join('; ');

  return (
    // Rosca em cima e legenda embaixo: lado a lado, a legenda não cabe no cartão (que divide a linha
    // com o gráfico de barras) e estourava a página.
    <div className="flex flex-col items-center gap-6">
      <div
        role="img"
        aria-label={`Divisão das receitas por forma de pagamento. ${resumo}.`}
        className="h-56 w-56 shrink-0"
      >
        <ResponsiveContainer
          width="100%"
          height="100%"
          initialDimension={{ width: 224, height: 224 }}
        >
          <PieChart>
            <Pie
              data={itens.map((f) => ({ nome: f.nome, valor: f.centavos / 100, forma: f.forma }))}
              dataKey="valor"
              nameKey="nome"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              isAnimationActive={false}
            >
              {itens.map((f) => (
                <Cell key={f.forma} fill={COR_DA_FORMA[f.forma]} />
              ))}
            </Pie>
            <Tooltip formatter={emReais} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul aria-label="Receitas por forma de pagamento" className="flex w-full flex-col gap-3">
        {itens.map((f) => (
          <li key={f.forma} className="flex items-center justify-between gap-4 text-base">
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="size-3 rounded-full"
                style={{ backgroundColor: COR_DA_FORMA[f.forma] }}
              />
              {f.nome}
            </span>
            <span>
              <strong>{formatarReais(f.total)}</strong>
              {` · ${f.percentual}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
