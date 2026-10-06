// src/components/adm/financeiro/comum.jsx
// Peças das telas de multas, contratos e prestação de contas — síndico e morador.
import { useEffect } from "react";
import { Icone } from "../../icones/Icone";

export const CAMPO =
  "w-full bg-veu/5 border border-veu/10 rounded-xl px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60";
export const ROTULO =
  "block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1";

export const BOTAO_PRIMARIO =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-tertiary text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition cursor-pointer";
export const BOTAO_SECUNDARIO =
  "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-veu/10 text-on-surface-variant text-sm font-semibold hover:bg-veu/5 transition cursor-pointer";

/**
 * Janela modal.
 *
 * O fundo vem dos tokens do tema (`surface-container-high`), e não de uma cor
 * fixa: os modais antigos do financeiro ficavam escuros no tema claro. Fecha no
 * Escape e no clique fora, como o pop-up de avisos.
 */
export function Janela({ titulo, aoFechar, children, largura = "max-w-md" }) {
  useEffect(() => {
    const tecla = (e) => e.key === "Escape" && aoFechar();
    document.addEventListener("keydown", tecla);
    return () => document.removeEventListener("keydown", tecla);
  }, [aoFechar]);

  return (
    <div
      onClick={aoFechar}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${largura} max-h-[90dvh] overflow-y-auto rounded-3xl p-6 space-y-5 bg-surface-container-high border border-veu/10 shadow-2xl`}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-headline text-xl font-bold text-on-surface">{titulo}</h3>
          <button
            onClick={aoFechar}
            aria-label="Fechar"
            className="p-1.5 -mr-1.5 rounded-lg text-on-surface-variant hover:bg-veu/5 cursor-pointer"
          >
            <Icone name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Carregando({ texto = "Carregando..." }) {
  return (
    <div className="flex items-center justify-center py-12 text-on-surface-variant">
      <Icone name="sync" className="text-3xl animate-spin mr-3" />
      <span>{texto}</span>
    </div>
  );
}

export function Vazio({ icone, texto }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-on-surface-variant text-sm text-center">
      <Icone name={icone} className="text-4xl opacity-30" />
      <p>{texto}</p>
    </div>
  );
}

export function Selo({ texto, tom }) {
  const cores = {
    alerta: "bg-secondary/15 text-secondary",
    ok: "bg-primary/15 text-primary",
    erro: "bg-error/10 text-error",
    neutro: "bg-veu/10 text-on-surface-variant",
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap ${cores[tom] ?? cores.neutro}`}>
      {texto}
    </span>
  );
}
