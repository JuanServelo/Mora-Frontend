import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ConfirmDialog } from "../components/feedback/ConfirmDialog";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => {
    resolveRef.current = resolve;
    setState({
      titulo: opts.titulo || "Confirmar",
      mensagem: opts.mensagem || "",
      confirmarTexto: opts.confirmarTexto || "Confirmar",
      cancelarTexto: opts.cancelarTexto || "Cancelar",
      variante: opts.variante || "default",
    });
  }), []);

  function fechar(resultado) {
    setState(null);
    resolveRef.current?.(resultado);
    resolveRef.current = null;
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <ConfirmDialog
        aberto={!!state}
        titulo={state?.titulo}
        mensagem={state?.mensagem}
        confirmarTexto={state?.confirmarTexto}
        cancelarTexto={state?.cancelarTexto}
        variante={state?.variante}
        onConfirmar={() => fechar(true)}
        onCancelar={() => fechar(false)}
      />
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm deve ser usado dentro de ConfirmProvider");
  return ctx.confirm;
}
