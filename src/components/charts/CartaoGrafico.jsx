import { Icone } from "../icones/Icone";

/**
 * Moldura dos gráficos.
 *
 * A altura fixa não é decorativa: o ResponsiveContainer do Recharts mede o pai,
 * e sem altura explícita o gráfico renderiza com altura zero.
 */
export function CartaoGrafico({ titulo, descricao, vazio, mensagemVazio, altura = 300, children }) {
  return (
    <div className="glass-panel rounded-3xl p-6">
      <div className="mb-4">
        <h2 className="font-headline text-lg font-bold text-on-surface">{titulo}</h2>
        {descricao && <p className="text-on-surface-variant text-xs mt-0.5">{descricao}</p>}
      </div>

      {vazio ? (
        <div
          className="flex flex-col items-center justify-center text-on-surface-variant/60 gap-2"
          style={{ height: altura }}
        >
          <Icone name="bar_chart" className="text-3xl opacity-40" />
          <p className="text-sm">{mensagemVazio ?? "Sem dados suficientes ainda."}</p>
        </div>
      ) : (
        <div style={{ height: altura }}>{children}</div>
      )}
    </div>
  );
}
