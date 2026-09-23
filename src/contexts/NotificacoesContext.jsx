import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { notificacaoApi, chatApi } from "../services/comunicacaoApi";
import { useAuth } from "./AuthContext";
import { perfilTemAcessoSistema } from "../utils/perfis";

/**
 * Contadores de notificações e mensagens não lidas.
 *
 * Vive num contexto porque três lugares mostram o mesmo número — o sino da
 * navbar, o badge da sidebar e a própria tela de notificações — e eles
 * precisam cair juntos quando o usuário marca algo como lido. Sem isso o
 * badge continuaria mostrando "3" depois de a lista já estar zerada.
 */
const NotificacoesContext = createContext(null);

/** Intervalo do polling. Notificação in-app não precisa ser instantânea. */
const INTERVALO_MS = 45_000;

export function NotificacoesProvider({ children }) {
  const { usuario } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0);

  const ativo = Boolean(usuario) && perfilTemAcessoSistema(usuario?.perfil);

  const recarregar = useCallback(async () => {
    if (!ativo) return;
    // Uma das duas pode falhar sem derrubar a outra: o badge que der certo aparece.
    const [nots, msgs] = await Promise.allSettled([
      notificacaoApi.contador(),
      chatApi.contador(),
    ]);
    if (nots.status === "fulfilled") setNaoLidas(nots.value.data?.naoLidas ?? 0);
    if (msgs.status === "fulfilled") setMensagensNaoLidas(msgs.value.data?.naoLidas ?? 0);
  }, [ativo]);

  useEffect(() => {
    if (!ativo) return;
    recarregar();
    const id = setInterval(recarregar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [ativo, recarregar]);

  // Sem sessao os contadores sao zerados por derivacao, nao por setState no
  // efeito: evita que o numero do usuario anterior pisque apos o logout.
  const valor = useMemo(
    () => ({
      naoLidas: ativo ? naoLidas : 0,
      mensagensNaoLidas: ativo ? mensagensNaoLidas : 0,
      recarregar,
      setNaoLidas,
      setMensagensNaoLidas,
    }),
    [ativo, naoLidas, mensagensNaoLidas, recarregar],
  );

  return (
    <NotificacoesContext.Provider value={valor}>
      {children}
    </NotificacoesContext.Provider>
  );
}

/**
 * Nunca lança: componentes de navegação são montados também fora do provider
 * (telas de login), e um badge zerado é melhor que uma tela branca.
 */
export function useNotificacoes() {
  return useContext(NotificacoesContext) ?? {
    naoLidas: 0,
    mensagensNaoLidas: 0,
    recarregar: () => {},
    setNaoLidas: () => {},
    setMensagensNaoLidas: () => {},
  };
}
