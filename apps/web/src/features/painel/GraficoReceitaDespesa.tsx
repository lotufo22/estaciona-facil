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

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** "2026-10-01" → "out/26". */
export function rotuloDoMes(mes: string): string {
  const [ano = '', numero = '1'] = mes.split('-');
  return `${MESES[Number(numero) - 1]}/${ano.slice(2)}`;
}

const emReais = (valor: unknown) => formatarReais(Number(valor).toFixed(2));

export function GraficoReceitaDespesa({ serie }: { serie: SerieMensalItem[] }) {
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
      className="h-72"
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
        initialDimension={{ width: 640, height: 288 }}
      >
        <BarChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
          <CartesianGrid vertical={false} stroke="#CBD2D9" />
          <XAxis dataKey="mes" tick={{ fill: '#52606D', fontSize: 14 }} />
          <YAxis
            tick={{ fill: '#52606D', fontSize: 14 }}
            tickFormatter={(v: number) => `${v / 1000} mil`}
          />
          <Tooltip formatter={emReais} />
          <Legend />
          <Bar dataKey="Receitas" fill="#0A7F75" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Despesas" fill="#E0A100" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
