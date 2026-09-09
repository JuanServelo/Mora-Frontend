// src/contexts/NotificacoesContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext";
import { financeiroApi } from "../services/financeiroApi";

const NotificacoesContext = createContext(null);

const PERFIS_COM_NOTIFICACOES = [
  "ADMIN_SINDICO", "MORADOR", "DONO_ALUGUEL",
];
const POLL_INTERVAL = 5 * 60 * 1000; // 5 min

export function NotificacoesProvider({ children }) {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState([]);
  const [naoLidas, setNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(false);
  const timerRef = useRef(null);

  const buscar = useCallback(async () => {
    if (!usuario || !PERFIS_COM_NOTIFICACOES.includes(usuario.perfil)) return;
    try {
      const { data } = await financeiroApi.listarNotificacoes();
      if (data?.sucesso) {
        setNotificacoes(data.notificacoes ?? []);
        setNaoLidas(data.naoLidas ?? 0);
      }
    } catch {
      // silencioso — serviço pode estar indisponível
    }
  }, [usuario]);

  useEffect(() => {
    if (!usuario || !PERFIS_COM_NOTIFICACOES.includes(usuario.perfil)) {
      setNotificacoes([]);
      setNaoLidas(0);
      return;
    }

    setCarregando(true);
    buscar().finally(() => setCarregando(false));

    timerRef.current = setInterval(buscar, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [usuario, buscar]);

  const marcarLida = useCallback(async (id) => {
    try {
      await financeiroApi.marcarNotificacaoLida(id);
      setNotificacoes((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
      );
      setNaoLidas((prev) => Math.max(0, prev - 1));
    } catch { /* silencioso */ }
  }, []);

  const marcarTodasLidas = useCallback(async () => {
    try {
      await financeiroApi.marcarTodasNotificacoesLidas();
      setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
    } catch { /* silencioso */ }
  }, []);

  return (
    <NotificacoesContext.Provider value={{ notificacoes, naoLidas, carregando, buscar, marcarLida, marcarTodasLidas }}>
      {children}
    </NotificacoesContext.Provider>
  );
}

export const useNotificacoes = () => {
  const ctx = useContext(NotificacoesContext);
  if (!ctx) throw new Error("useNotificacoes deve ser usado dentro de NotificacoesProvider");
  return ctx;
};
