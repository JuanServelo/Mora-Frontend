// src/pages/usuario/Notificacoes.jsx
import { useNavigate } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { ROTULO_ORIGEM, configDaNotificacao, tempoRelativo } from "../../utils/notificacoes";

export function Notificacoes() {
  const navigate = useNavigate();
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();

  function aoClicar(n) {
    marcarLida(n.id);
    const { destino } = configDaNotificacao(n);
    if (destino) navigate(destino);
  }

  const grupos = agruparPorDia(notificacoes);

  return (
    <div className="min-h-screen w-full pt-4 pb-24 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Cabeçalho */}
        <div className="pt-2 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-3xl font-bold text-on-surface">Notificações</h1>
            <p className="text-on-surface-variant text-sm mt-1">
              {naoLidas > 0 ? `${naoLidas} não lida${naoLidas > 1 ? "s" : ""}` : "Tudo em dia"}
            </p>
          </div>
          {naoLidas > 0 && (
            <button
              onClick={marcarTodasLidas}
              className="shrink-0 text-sm font-semibold text-primary hover:text-primary/80 transition cursor-pointer"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>

        {/* Lista vazia */}
        {notificacoes.length === 0 && (
          <div className="glass-panel rounded-3xl py-20 flex flex-col items-center gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Icone name="notifications_none" className="text-primary text-3xl" />
            </div>
            <div>
              <p className="font-semibold text-on-surface mb-1">Sem notificações</p>
              <p className="text-xs text-on-surface-variant">
                Faturas, respostas da administração e comunicados aparecem aqui.
              </p>
            </div>
          </div>
        )}

        {/* Grupos por dia */}
        {grupos.map(({ label, itens }) => (
          <div key={label} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant px-1">
              {label}
            </p>
            <div className="glass-panel rounded-3xl overflow-hidden divide-y divide-veu/5">
              {itens.map((n) => {
                const cfg = configDaNotificacao(n);
                return (
                  <button
                    key={n.id}
                    onClick={() => aoClicar(n)}
                    className={`w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-veu/5 transition cursor-pointer ${!n.lida ? "bg-primary/3" : ""}`}
                  >
                    {/* Ícone */}
                    <div className={`shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center ${cfg.cor}`}>
                      <Icone name={cfg.icone} className="text-xl" />
                    </div>

                    {/* Texto */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold leading-snug ${n.lida ? "text-on-surface-variant" : "text-on-surface"}`}>
                        {n.titulo}
                      </p>
                      {n.mensagem && (
                        <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                          {n.mensagem}
                        </p>
                      )}
                      {/* A etiqueta de origem existe porque a caixa deixou de
                          ser so do financeiro: fatura, aviso e mensagem chegam
                          na mesma lista. */}
                      <p className="text-[11px] text-on-surface-variant/50 mt-1.5">
                        {ROTULO_ORIGEM[n.origem] ?? n.origem} · {tempoRelativo(n.criadoEm)}
                      </p>
                    </div>

                    {/* Indicador de não lida */}
                    <div className="shrink-0 mt-2 flex items-center gap-2">
                      {!n.lida && <span className="w-2 h-2 rounded-full bg-primary" />}
                      {cfg.destino && (
                        <Icone name="chevron_right" className="text-base text-on-surface-variant/40" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── helpers ──────────────────────────────────────────────────────────────── */

function agruparPorDia(notificacoes) {
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const grupos = {};
  for (const n of notificacoes) {
    const d = new Date(n.criadoEm);
    let label;
    if (mesmoDia(d, hoje)) label = "Hoje";
    else if (mesmoDia(d, ontem)) label = "Ontem";
    else label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    if (!grupos[label]) grupos[label] = [];
    grupos[label].push(n);
  }

  return Object.entries(grupos).map(([label, itens]) => ({ label, itens }));
}

function mesmoDia(a, b) {
  return a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();
}
