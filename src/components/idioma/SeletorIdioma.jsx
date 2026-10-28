import { useTranslation } from "react-i18next";
import { IDIOMAS, trocarIdioma } from "../../i18n";
import { Icone } from "../icones/Icone";

/**
 * Troca o idioma do sistema.
 *
 * - `compacto`: um botão por idioma (PT · EN), para a tela de login, onde ainda
 *   não há menu.
 * - padrão: a lista com o nome de cada idioma, para a tela de Aparência.
 */
export function SeletorIdioma({ compacto = false }) {
  const { t, i18n } = useTranslation("comum");
  const atual = i18n.language;

  if (compacto) {
    return (
      <div role="group" aria-label={t("idioma.seletor")} className="inline-flex items-center gap-1 glass-panel rounded-full p-1">
        <Icone name="translate" className="text-base text-on-surface-variant ml-1.5" />
        {Object.entries(IDIOMAS).map(([id, cfg]) => (
          <button
            key={id}
            type="button"
            lang={id}
            onClick={() => trocarIdioma(id)}
            aria-pressed={atual === id}
            title={cfg.rotulo}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
              atual === id ? "bg-primary/20 text-primary" : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {cfg.curto}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Object.entries(IDIOMAS).map(([id, cfg]) => {
        const escolhido = atual === id;
        return (
          <button
            key={id}
            type="button"
            lang={id}
            onClick={() => trocarIdioma(id)}
            aria-pressed={escolhido}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition cursor-pointer ${
              escolhido
                ? "border-primary/60 bg-primary/10"
                : "border-veu/10 hover:border-veu/25 bg-surface-container-highest/20"
            }`}
          >
            <span
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${
                escolhido ? "bg-primary/15 text-primary" : "bg-surface-container-highest/50 text-on-surface-variant"
              }`}
            >
              {cfg.curto}
            </span>
            <p className="flex-1 font-semibold text-on-surface">{cfg.rotulo}</p>
            {escolhido && <Icone name="check_circle" className="text-primary shrink-0" />}
          </button>
        );
      })}
    </div>
  );
}
