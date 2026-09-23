// src/components/notificacoes/SinoNotificacoes.jsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icone } from "../icones/Icone";
import { notificacaoApi } from "../../services/comunicacaoApi";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { destinoNotificacao, iconeNotificacao, tempoRelativo } from "../../utils/notificacoes";

const PANEL_STYLE = {
  background: "rgba(18,18,24,0.97)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.08)",
};

/** Quantas cabem no dropdown antes de valer a pena abrir a lista completa. */
const PREVIA = 6;

export function SinoNotificacoes({ alinhamento = "direita" }) {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { naoLidas, recarregar, setNaoLidas } = useNotificacoes();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    function handleKey(e) {
      if (e.key === "Escape") setAberto(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, []);

  // Busca só ao abrir: o contador já vem do polling do contexto, então manter
  // a lista carregada o tempo todo seria tráfego para uma gaveta fechada.
  useEffect(() => {
    if (!aberto) return;
    notificacaoApi
      .listar({ size: PREVIA })
      .then((res) => setItens(res.data?.content ?? []))
      .catch(() => setItens([]))
      .finally(() => setCarregando(false));
  }, [aberto]);

  async function abrirItem(notificacao) {
    setAberto(false);
    if (!notificacao.lida) {
      try {
        await notificacaoApi.marcarLida(notificacao.id);
        setNaoLidas((n) => Math.max(0, n - 1));
      } catch {
        // Navegar importa mais que o contador; o polling corrige.
      }
    }
    const destino = destinoNotificacao(notificacao);
    if (destino) navigate(destino);
  }

  async function marcarTodas() {
    try {
      await notificacaoApi.marcarTodasLidas();
      setItens((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
      recarregar();
    } catch {
      // Silencioso: o polling reconcilia no próximo ciclo.
    }
  }

  const posicao = alinhamento === "esquerda" ? "left-0" : "right-0";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => {
          // O loading liga aqui, e nao no efeito: assim a gaveta ja abre com o
          // estado certo, sem um render intermediario so para marca-lo.
          if (!aberto) setCarregando(true);
          setAberto((o) => !o);
        }}
        aria-label={naoLidas > 0 ? `Notificações (${naoLidas} não lidas)` : "Notificações"}
        aria-expanded={aberto}
        className={`relative w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
          ${aberto ? "text-primary bg-primary/10" : "text-on-surface-variant hover:text-primary hover:bg-primary/10"}`}
      >
        <Icone name="notifications" className="text-xl" />
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-error text-on-error text-[10px] font-bold flex items-center justify-center">
            {naoLidas > 99 ? "99+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div
          className={`absolute top-[calc(100%+10px)] ${posicao} w-[min(22rem,calc(100vw-2rem))] rounded-2xl overflow-hidden z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]`}
          style={PANEL_STYLE}
        >
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Notificações
            </p>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodas}
                className="text-xs font-semibold text-primary hover:underline cursor-pointer"
              >
                Marcar todas
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {carregando && (
              <p className="px-4 py-8 text-center text-sm text-on-surface-variant">Carregando...</p>
            )}

            {!carregando && itens.length === 0 && (
              <div className="px-4 py-10 text-center flex flex-col items-center gap-2 text-on-surface-variant">
                <Icone name="notifications_off" className="text-3xl opacity-30" />
                <p className="text-sm">Nenhuma notificação por aqui.</p>
              </div>
            )}

            {!carregando &&
              itens.map((n) => (
                <button
                  key={n.id}
                  onClick={() => abrirItem(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-white/5 last:border-b-0 transition-colors cursor-pointer hover:bg-white/5
                    ${n.lida ? "" : "bg-primary/[0.06]"}`}
                >
                  <div className="w-8 h-8 shrink-0 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <Icone name={iconeNotificacao(n.tipo)} className="text-primary text-base" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm leading-snug ${n.lida ? "text-on-surface-variant" : "text-on-surface font-semibold"}`}>
                      {n.titulo}
                    </p>
                    {n.mensagem && (
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-0.5">{n.mensagem}</p>
                    )}
                    <p className="text-[11px] text-on-surface-variant/70 mt-1">{tempoRelativo(n.criadoEm)}</p>
                  </div>
                  {!n.lida && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
                </button>
              ))}
          </div>

          <button
            onClick={() => {
              setAberto(false);
              navigate("/notificacoes");
            }}
            className="w-full px-4 py-3 text-sm font-semibold text-primary border-t border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
          >
            Ver todas
          </button>
        </div>
      )}
    </div>
  );
}
