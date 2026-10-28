import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { meetingApi } from "../../services/meetingApi";

export function GoogleMeetConnection() {
  const { usuario } = useAuth();
  const [status, setStatus] = useState(null);
  const [erro, setErro] = useState("");
  const [conectando, setConectando] = useState(false);
  const tenant = usuario?.condominioId;
  const manager = ["ADMIN_GERAL", "ADMIN_SINDICO"].includes(usuario?.perfil);

  const conectar = useCallback(async () => {
    sessionStorage.setItem(`google-meet-attempt:${usuario?.id}:${tenant}`, "1");
    setConectando(true);
    setErro("");
    try {
      const { data } = await meetingApi.conectarGoogle();
      window.location.assign(data.authorizationUrl);
    } catch (e) {
      setErro(e.response?.data?.message || "Não foi possível conectar ao Google Meet. Tente novamente.");
      setConectando(false);
    }
  }, [tenant, usuario?.id]);

  useEffect(() => {
    if (!manager || !tenant) return;
    let ativo = true;
    const result = new URLSearchParams(window.location.search).get("googleMeet");
    const attemptKey = `google-meet-attempt:${usuario.id}:${tenant}`;
    if (result) {
      const url = new URL(window.location.href);
      url.searchParams.delete("googleMeet");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      if (result === "error") setErro("A conexão com o Google não foi concluída. Você pode tentar novamente.");
    }
    meetingApi.googleStatus().then(({ data }) => {
      if (!ativo) return;
      setStatus(data);
      // Full-page navigation avoids popup blockers. A declined grant never causes a redirect loop.
      if (data.configured && !data.connected && !result && !sessionStorage.getItem(attemptKey)) {
        sessionStorage.setItem(attemptKey, "1");
        conectar();
      }
      if (data.connected) sessionStorage.removeItem(attemptKey);
    }).catch(() => {
      if (ativo) setErro("Não foi possível verificar a conexão com o Google Meet.");
    });
    return () => { ativo = false; };
  }, [tenant, manager, usuario?.id, conectar]);

  useEffect(() => {
    if (!manager || !tenant) return;
    let ativo = true;
    const verificar = () => meetingApi.googleStatus().then(({ data }) => {
      if (ativo) { setStatus(data); setErro(""); }
    }).catch(() => { if (ativo) setErro("Não foi possível verificar a conexão com o Google Meet."); });
    window.addEventListener("google-meet-connection-changed", verificar);
    return () => { ativo = false; window.removeEventListener("google-meet-connection-changed", verificar); };
  }, [manager, tenant]);

  if (!manager || !tenant || (!erro && (!status || status.connected))) return null;
  return (
    <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3" role="status">
      <p className="text-sm text-on-surface-variant">
        {erro || (conectando ? "Abrindo autorização do Google..." : status?.message || "Verificando conexão com o Google Meet...")}
      </p>
      {!conectando && (
        <button type="button" onClick={conectar} className="px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold cursor-pointer">
          {status?.connected ? "Reconectar Google Meet" : "Conectar Google Meet"}
        </button>
      )}
    </div>
  );
}
