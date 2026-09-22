import { Icone } from "../icones/Icone";

const ESTILOS = {
  success: {
    icon: "check_circle",
    border: "border-primary/30",
    iconColor: "text-primary",
    bg: "bg-primary/5",
  },
  error: {
    icon: "error",
    border: "border-error/40",
    iconColor: "text-error",
    bg: "bg-error/5",
  },
  warning: {
    icon: "warning",
    border: "border-secondary/40",
    iconColor: "text-secondary",
    bg: "bg-secondary/5",
  },
  info: {
    icon: "info",
    border: "border-tertiary/30",
    iconColor: "text-tertiary",
    bg: "bg-tertiary/5",
  },
};

function ToastItem({ toast, onDismiss }) {
  const estilo = ESTILOS[toast.tipo] || ESTILOS.info;

  return (
    <div
      role="alert"
      className={`
        glass-panel rounded-2xl p-4 shadow-2xl border w-full sm:w-auto sm:min-w-[280px] max-w-full sm:max-w-sm
        animate-[slideIn_0.3s_ease-out]
        ${estilo.border} ${estilo.bg}
      `}
    >
      <div className="flex gap-3">
        <Icone name={estilo.icon} className={`${estilo.iconColor} text-2xl shrink-0 mt-0.5`} />
        <div className="flex-1 min-w-0">
          {toast.titulo && (
            <p className="text-on-surface font-semibold text-sm mb-0.5">{toast.titulo}</p>
          )}
          <p className="text-on-surface text-sm leading-relaxed">{toast.mensagem}</p>
          {toast.detalhe && (
            <p className="text-on-surface-variant text-xs mt-2 font-mono bg-surface-container-highest/50 rounded-lg px-2 py-1.5">
              {toast.detalhe}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-on-surface-variant hover:text-on-surface shrink-0 cursor-pointer"
          aria-label="Fechar"
        >
          <Icone name="close" className="text-lg" />
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 left-4 sm:top-4 sm:left-auto z-[9999] flex flex-col items-stretch sm:items-end gap-3 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
