import { Icone } from "../icones/Icone";

/**
 * Tile de indicador. Extrai o markup que estava copiado em cada tela
 * administrativa (GerenciarUsuarios, GerenciarCondominios e outras).
 */
const TOM = {
  neutro: "text-on-surface",
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
  error: "text-error",
};

/**
 * `cor` (hexadecimal) sobrepõe o `tom`: é a cor que o usuário escolheu ao
 * personalizar o painel. Sem ela vale o tom, que carrega significado.
 */
export function CartaoKpi({ valor, label, sub, tom = "neutro", icone, onClick, cor }) {
  const clicavel = typeof onClick === "function";
  const Tag = clicavel ? "button" : "div";
  const classeTom = cor ? "" : (TOM[tom] ?? TOM.neutro);
  const estiloCor = cor ? { color: cor } : undefined;

  return (
    <Tag
      {...(clicavel ? { type: "button", onClick } : {})}
      className={`glass-panel rounded-2xl px-5 py-4 text-left w-full transition ${
        clicavel ? "hover:bg-veu/5 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-3xl font-headline font-bold leading-none ${classeTom}`} style={estiloCor}>
            {valor}
          </p>
          <p className="text-on-surface-variant text-xs uppercase tracking-wider mt-2">{label}</p>
          {sub && <p className="text-on-surface-variant/70 text-xs mt-1">{sub}</p>}
        </div>
        {icone && (
          <span style={estiloCor} className="opacity-40">
            <Icone name={icone} className={classeTom} />
          </span>
        )}
      </div>
    </Tag>
  );
}
