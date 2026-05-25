import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { ToastContainer } from "../components/feedback/ToastContainer";

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((tipo, mensagem, opts = {}) => {
    const id = ++toastId;
    const duracao = opts.duracao ?? (tipo === "error" || tipo === "warning" ? 6000 : 4000);

    setToasts((prev) => [...prev, {
      id,
      tipo,
      mensagem,
      titulo: opts.titulo,
      detalhe: opts.detalhe,
      duracao,
    }]);

    if (duracao > 0) {
      setTimeout(() => removeToast(id), duracao);
    }

    return id;
  }, [removeToast]);

  const toast = useMemo(() => ({
    success: (mensagem, opts) => addToast("success", mensagem, opts),
    error: (mensagem, opts) => addToast("error", mensagem, opts),
    warning: (mensagem, opts) => addToast("warning", mensagem, opts),
    info: (mensagem, opts) => addToast("info", mensagem, opts),
  }), [addToast]);

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx.toast;
}
