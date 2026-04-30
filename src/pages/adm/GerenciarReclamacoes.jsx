// src/pages/adm/GerenciarReclamacoes.jsx
import { useState, useEffect } from "react";
import { reclamacoesApi } from "../../services/reclamacoesApi";
import { Icone } from "../../components/icones/Icone";

// ─── helpers ────────────────────────────────
function TextArea({ label, ...props }) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
          {label}
        </label>
      )}
      <textarea
        className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all resize-none"
        {...props}
      />
    </div>
  );
}

const CATEGORIAS = [
  "BARULHO",
  "INFRAESTRUTURA",
  "LIMPEZA",
  "GARAGEM",
  "ANIMAIS",
  "ELEVADORES",
  "ILUMINACAO",
  "ELETRICA",
  "HIDRAULICA",
  "PINTURA",
  "JARDINAGEM",
  "SUGESTAO_MELHORIA",
  "OUTROS",
];

const STATUS_RECLAMACAO = ["PENDENTE", "EM_ANALISE", "RESOLVIDO"];

const statusColor = (s) => {
  if (s === "PENDENTE") return "bg-tertiary/10 text-tertiary";
  if (s === "EM_ANALISE") return "bg-primary/10 text-primary";
  return "bg-primary/10 text-primary";
};

const statusIcon = (s) => {
  if (s === "PENDENTE") return "schedule";
  if (s === "EM_ANALISE") return "manage_search";
  return "check_circle";
};

const catLabel = (c) =>
  c
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

// ════════════════════════════════════════════
export function GerenciarReclamacoes() {
  const [reclamacoes, setReclamacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [respostaPendente, setRespostaPendente] = useState({}); // { [id]: { text, status } }
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await reclamacoesApi.listarTodas();
        if (ok) setReclamacoes(res.data.reclamacoes || []);
      } catch (e) {
        console.error(e);
        if (ok) setReclamacoes([]);
      } finally {
        if (ok) setCarregando(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const responder = async (id) => {
    const r = respostaPendente[id];
    if (!r?.text?.trim()) return;
    try {
      const res = await reclamacoesApi.atualizarAdmin(id, {
        response: r.text.trim(),
        status: r.status || "EM_ANALISE",
      });
      const atual = res.data.reclamacao;
      setReclamacoes((prev) => prev.map((rec) => (rec.id === id ? atual : rec)));
      setRespostaPendente((prev) => ({ ...prev, [id]: { text: "", status: "EM_ANALISE" } }));
    } catch (e) {
      console.error(e);
    }
  };

  const recFiltradas =
    filtroStatus === "TODOS"
      ? reclamacoes
      : reclamacoes.filter((r) => r.status === filtroStatus);

  const contadores = STATUS_RECLAMACAO.reduce(
    (acc, s) => ({ ...acc, [s]: reclamacoes.filter((r) => r.status === s).length }),
    {}
  );

  if (carregando) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-6">
        <div className="max-w-6xl mx-auto py-20 text-center text-on-surface-variant text-sm">Carregando…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Gestão de{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Reclamações
              </span>
            </h1>
          </div>
        </header>

        {/* Cards resumo */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { s: "PENDENTE", label: "Pendentes", icon: "schedule", cor: "text-tertiary bg-tertiary/10" },
            { s: "EM_ANALISE", label: "Em Análise", icon: "manage_search", cor: "text-primary bg-primary/10" },
            { s: "RESOLVIDO", label: "Resolvidas", icon: "check_circle", cor: "text-primary bg-primary/10" },
          ].map(({ s, label, icon, cor }) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(filtroStatus === s ? "TODOS" : s)}
              className={`glass-panel rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] ${
                filtroStatus === s ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cor}`}>
                <Icone name={icon} className="text-xl" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-extrabold text-on-surface font-headline">{contadores[s] ?? 0}</p>
                <p className="text-xs text-on-surface-variant">{label}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Filtro ativo */}
        {filtroStatus !== "TODOS" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-on-surface-variant">Filtrando por:</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(filtroStatus)}`}>
              {filtroStatus.replace("_", " ")}
            </span>
            <button
              onClick={() => setFiltroStatus("TODOS")}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer underline underline-offset-2"
            >
              limpar filtro
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-3">
          {recFiltradas.map((rec) => (
            <div key={rec.id} className="glass-panel rounded-2xl overflow-hidden">
              {/* Cabeçalho */}
              <button
                className="w-full flex items-center justify-between px-6 py-4 text-left cursor-pointer hover:bg-white/5 transition-all"
                onClick={() =>
                  setExpandido(expandido === rec.id ? null : rec.id)
                }
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${statusColor(rec.status)}`}>
                    <Icone name={statusIcon(rec.status)} className="text-xl" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-on-surface">{catLabel(rec.category)}</p>
                      <span className="text-xs text-on-surface-variant font-mono">{rec.protocolNumber}</span>
                    </div>
                    <p className="text-xs text-on-surface-variant line-clamp-1 max-w-md">{rec.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusColor(rec.status)}`}>
                    {rec.status.replace("_", " ")}
                  </span>
                  <Icone
                    name={expandido === rec.id ? "expand_less" : "expand_more"}
                    className="text-on-surface-variant text-xl"
                  />
                </div>
              </button>

              {/* Detalhes expandidos */}
              {expandido === rec.id && (
                <div className="px-6 pb-5 border-t border-white/5 pt-4 space-y-5">
                  {/* Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="bg-surface-container-highest/30 rounded-xl p-3">
                      <p className="text-xs text-on-surface-variant mb-1">Morador</p>
                      <p className="text-sm font-semibold text-on-surface">
                        {rec.usuario?.nome || rec.usuario?.email || rec.residentId || "—"}
                      </p>
                    </div>
                    <div className="bg-surface-container-highest/30 rounded-xl p-3">
                      <p className="text-xs text-on-surface-variant mb-1">Registrada em</p>
                      <p className="text-sm font-semibold text-on-surface">{rec.createdAt?.replace("T", " ")}</p>
                    </div>
                    {rec.attachmentUrl && (
                      <div className="bg-surface-container-highest/30 rounded-xl p-3">
                        <p className="text-xs text-on-surface-variant mb-1">Anexo</p>
                        <a
                          href={rec.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-semibold text-primary hover:underline"
                        >
                          Ver arquivo
                        </a>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">Descrição</p>
                    <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3">
                      {rec.description}
                    </p>
                  </div>

                  {/* Histórico de interações */}
                  {(rec.interactions?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                        Histórico de respostas
                      </p>
                      <div className="space-y-2">
                        {(rec.interactions || []).map((i) => (
                          <div key={i.id} className="bg-surface-container-highest/30 rounded-xl p-3 border-l-2 border-primary/40">
                            <p className="text-sm text-on-surface">{i.response}</p>
                            <span className={`mt-1 inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor(i.status)}`}>
                              {i.status.replace("_", " ")}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Formulário resposta */}
                  {rec.status !== "RESOLVIDO" && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                        Responder
                      </p>
                      <TextArea
                        label=""
                        value={respostaPendente[rec.id]?.text ?? ""}
                        onChange={(e) =>
                          setRespostaPendente((prev) => ({
                            ...prev,
                            [rec.id]: { ...prev[rec.id], text: e.target.value },
                          }))
                        }
                        rows={3}
                        placeholder="Digite a resposta para o morador..."
                      />
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <select
                            value={respostaPendente[rec.id]?.status ?? "EM_ANALISE"}
                            onChange={(e) =>
                              setRespostaPendente((prev) => ({
                                ...prev,
                                [rec.id]: { ...prev[rec.id], status: e.target.value },
                              }))
                            }
                            className="appearance-none bg-surface-container-highest/50 border border-white/10 rounded-xl py-2.5 pl-4 pr-10 text-on-surface text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all cursor-pointer"
                          >
                            <option value="EM_ANALISE">Em Análise</option>
                            <option value="RESOLVIDO">Resolvido</option>
                          </select>
                          <Icone name="expand_more" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
                        </div>
                        <button
                          type="button"
                          onClick={() => responder(rec.id)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/25 transition-all cursor-pointer"
                        >
                          <Icone name="send" className="text-base" />
                          Enviar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {recFiltradas.length === 0 && (
            <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
              <Icone name="inbox" className="text-5xl opacity-30" />
              <p className="text-sm">Nenhuma reclamação encontrada.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
