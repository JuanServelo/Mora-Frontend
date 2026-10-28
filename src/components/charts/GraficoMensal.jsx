import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { CORES, EIXO_STYLE, TOOLTIP_STYLE } from "../../utils/chartTheme";

const MARGEM = { top: 8, right: 8, bottom: 0, left: -20 };

/**
 * Série mensal desenhada no formato que o usuário escolheu no painel.
 *
 * Os mesmos dados servem a barras, linhas, área ou combinado (a primeira série
 * em barras, as demais em linha). Concentrar aqui evita que cada gráfico do
 * painel repita os quatro desenhos.
 *
 * - `series`: `[{ chave, nome, cor }]`
 * - `eixoY`: props extras do eixo (`domain`, `unit`...)
 * - `tipo`: um de `TIPOS_SERIE` (utils/painelPersonalizado.js)
 * - `cor`: cor escolhida pelo usuário; pinta a primeira série
 */
export function GraficoMensal({ tipo = "barras", dados, eixoX = "rotulo", series: seriesBase, eixoY = {}, formatarTooltip, cor }) {
  // Se outra série já tinha a cor escolhida, ela herda a cor original da
  // primeira — senão as duas ficariam iguais e a legenda não diria nada.
  const original = seriesBase[0]?.cor;
  const series = cor
    ? seriesBase.map((s, i) => (i === 0 ? { ...s, cor } : s.cor === cor ? { ...s, cor: original } : s))
    : seriesBase;
  const comuns = (
    <>
      <CartesianGrid stroke={CORES.grid} vertical={false} />
      <XAxis dataKey={eixoX} {...EIXO_STYLE} />
      <YAxis allowDecimals={false} {...EIXO_STYLE} {...eixoY} />
      <Tooltip {...TOOLTIP_STYLE} {...(formatarTooltip ? { formatter: formatarTooltip } : {})} />
      {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12, color: CORES.onSurfaceVariant }} />}
    </>
  );

  let grafico;
  if (tipo === "linhas") {
    grafico = (
      <LineChart data={dados} margin={MARGEM}>
        {comuns}
        {series.map((s) => (
          <Line key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} strokeWidth={2} connectNulls dot />
        ))}
      </LineChart>
    );
  } else if (tipo === "area") {
    grafico = (
      <AreaChart data={dados} margin={MARGEM}>
        {comuns}
        {series.map((s) => (
          <Area key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} fill={s.cor} fillOpacity={0.2} strokeWidth={2} connectNulls />
        ))}
      </AreaChart>
    );
  } else if (tipo === "combinado") {
    const [primeira, ...demais] = series;
    grafico = (
      <ComposedChart data={dados} margin={MARGEM}>
        {comuns}
        <Bar dataKey={primeira.chave} name={primeira.nome} fill={primeira.cor} radius={[6, 6, 0, 0]} />
        {demais.map((s) => (
          <Line key={s.chave} type="monotone" dataKey={s.chave} name={s.nome} stroke={s.cor} strokeWidth={2} dot={false} />
        ))}
      </ComposedChart>
    );
  } else {
    grafico = (
      <BarChart data={dados} margin={MARGEM}>
        {comuns}
        {series.map((s) => (
          <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[6, 6, 0, 0]} />
        ))}
      </BarChart>
    );
  }

  return <ResponsiveContainer width="100%" height="100%">{grafico}</ResponsiveContainer>;
}
