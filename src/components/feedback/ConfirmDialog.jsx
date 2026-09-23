import { Icone } from "../icones/Icone";

export function ConfirmDialog({
  aberto,
  titulo,
  mensagem,
  confirmarTexto = "Confirmar",
  cancelarTexto = "Cancelar",
  variante = "default",
  onConfirmar,
  onCancelar,
}) {
  if (!aberto) return null;

  const isDanger = variante === "danger";

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
        onClick={onCancelar}
        aria-label="Fechar"
      />
      <div className="relative glass-panel rounded-3xl p-6 w-full max-w-md shadow-2xl border border-outline-variant/20 animate-[fadeIn_0.2s_ease-out]">
        <div className="flex items-start gap-4 mb-6">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${isDanger ? "bg-error/15" : "bg-primary/15"}`}>
            <Icone
              name={isDanger ? "warning" : "help"}
              className={`text-2xl ${isDanger ? "text-error" : "text-primary"}`}
            />
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">{titulo}</h2>
            {mensagem && (
              <p className="text-on-surface-variant text-sm mt-1 leading-relaxed">{mensagem}</p>
            )}
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancelar}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest/50 transition-colors cursor-pointer"
          >
            {cancelarTexto}
          </button>
          <button
            type="button"
            onClick={onConfirmar}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
              isDanger
                ? "bg-error/20 text-error hover:bg-error/30 border border-error/30"
                : "bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
            }`}
          >
            {confirmarTexto}
          </button>
        </div>
      </div>
    </div>
  );
}
