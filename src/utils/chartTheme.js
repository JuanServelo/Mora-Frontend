/**
 * Recharts não resolve classes Tailwind — precisa de cor literal.
 * Os valores abaixo espelham as variáveis de src/index.css; se o tema mudar lá,
 * mude aqui também.
 */
export const CORES = {
  primary: "#9fcfd4",
  tertiary: "#74d6db",
  secondary: "#e5c277",
  error: "#ffb4ab",
  onSurfaceVariant: "#c0c8c9",
  grid: "rgba(255,255,255,0.08)",
};

/** Paleta para séries categóricas, na ordem dos 6 perfis. */
export const PALETA = [
  CORES.primary,
  CORES.tertiary,
  CORES.secondary,
  "#a8b8c8",
  CORES.error,
  "#8f7fb8",
];

/** O tooltip padrão do Recharts é branco e some no tema escuro. */
export const TOOLTIP_STYLE = {
  contentStyle: {
    background: "rgba(33,30,37,0.96)",
    border: "1px solid rgba(255,255,255,0.12)",
    borderRadius: 12,
    color: "#e5e2e6",
    fontSize: 13,
  },
  labelStyle: { color: CORES.onSurfaceVariant, marginBottom: 4 },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

export const EIXO_STYLE = {
  stroke: CORES.onSurfaceVariant,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

/** "2026-08" → "ago/26" */
export function rotuloMes(chave) {
  const [ano, mes] = String(chave).split("-");
  const nomes = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${nomes[Number(mes) - 1] ?? mes}/${String(ano).slice(2)}`;
}
