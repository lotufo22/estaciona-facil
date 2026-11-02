import { formatarReais, paraCentavos, type SerieMensalItem } from '@estacionafacil/shared';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useReduzirMovimento } from '../lib/movimento';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-01" → "out/26". */
export function rotuloDoMes(mes: string): string {
  const [ano = '', numero = '1'] = mes.split('-');
  return `${MESES[Number(numero) - 1]}/${ano.slice(2)}`;
}

const emReais = (valor: unknown) => formatarReais(Number(valor).toFixed(2));

export function GraficoReceitaDespesa({ serie }: { serie: SerieMensalItem[] }) {
  const reduzirMovimento = useReduzirMovimento();
  const dados = serie.map((m) => ({
    mes: rotuloDoMes(m.mes),
    Receitas: paraCentavos(m.receitas) / 100,
    Despesas: paraCentavos(m.despesas) / 100,
  }));
  const resumo = serie
    .map(
      (m) =>
        `${rotuloDoMes(m.mes)}: receitas ${formatarReais(m.receitas)}, despesas ${formatarReais(m.despesas)}`,
    )
    .join('; ');

  return (
    <div
      role="img"
      aria-label={`Gráfico de receitas e despesas por mês. ${resumo}.`}
      className="h-72 w-full min-w-0 overflow-hidden"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 640, height: 288 }}
      >
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="#e0e5ed" strokeDasharray="3 5" />
          <XAxis
            axisLine={false}
            tickLine={false}
            tickMargin={12}
            dataKey="mes"
            tick={{ fill: '#52606D', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={46}
            tick={{ fill: '#52606D', fontSize: 11 }}
            tickFormatter={(v: number) => `${v / 1000} mil`}
          />
          <Tooltip
            formatter={emReais}
            cursor={{ fill: '#f1f5fb' }}
            contentStyle={{ border: '1px solid #e0e5ed', borderRadius: 10, fontSize: 12 }}
          />
          <Legend
            formatter={(valor: string) => <span className="text-texto-suave">{valor}</span>}
            iconType="circle"
            iconSize={7}
            wrapperStyle={{ fontSize: 12, paddingTop: 20 }}
          />
          <Bar
            isAnimationActive={!reduzirMovimento}
            animationDuration={550}
            dataKey="Receitas"
            fill="#0d6efd"
            maxBarSize={26}
            radius={[4, 4, 0, 0]}
          />
          <Bar
            isAnimationActive={!reduzirMovimento}
            animationDuration={550}
            dataKey="Despesas"
            fill="#ffc107"
            stroke="#805500"
            strokeWidth={1.25}
            maxBarSize={26}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
