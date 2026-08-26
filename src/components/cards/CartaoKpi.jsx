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

export function CartaoKpi({ valor, label, sub, tom = "neutro", icone, onClick }) {
  const clicavel = typeof onClick === "function";
  const Tag = clicavel ? "button" : "div";

  return (
    <Tag
      {...(clicavel ? { type: "button", onClick } : {})}
      className={`glass-panel rounded-2xl px-5 py-4 text-left w-full transition ${
        clicavel ? "hover:bg-white/5 cursor-pointer" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-3xl font-headline font-bold leading-none ${TOM[tom] ?? TOM.neutro}`}>
            {valor}
          </p>
          <p className="text-on-surface-variant text-xs uppercase tracking-wider mt-2">{label}</p>
          {sub && <p className="text-on-surface-variant/70 text-xs mt-1">{sub}</p>}
        </div>
        {icone && <Icone name={icone} className={`${TOM[tom] ?? TOM.neutro} opacity-40`} />}
      </div>
    </Tag>
  );
}
