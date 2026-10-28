// src/pages/adm/GerenciarReclamacoes.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { reclamacoesApi, mensagemDeErro } from "../../services/ocorrenciasApi";
import { Icone } from "../../components/icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { PERFIS } from "../../utils/perfis";
import {
  STATUS_RECLAMACAO,
  rotuloCategoria,
  statusReclamacao,
  statusOs,
  tempoDaOcorrencia,
  dataHora,
} from "../../utils/ocorrencias";
import { formatarData } from "../../utils/datas";

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

/** "" = só responder, sem mudar o status. */
const MANTER = "";

// ─── Atendimento ─────────────────────────────
function FormAtendimento({ rec, onAtualizada }) {
  const { t } = useTranslation("ocorrencias");
  const toast = useToast();
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState(rec.status === "PENDENTE" ? "EM_ANALISE" : MANTER);
  const [enviando, setEnviando] = useState(false);

  const enviar = async () => {
    if (!mensagem.trim()) {
      toast.warning(status ? t("gestao.atendimento.justificativaObrigatoria") : t("gestao.atendimento.respostaObrigatoria"));
      return;
    }
    setEnviando(true);
    try {
      const res = await reclamacoesApi.atender(rec.id, {
        mensagem: mensagem.trim(),
        ...(status ? { status } : {}),
      });
      onAtualizada(res.data);
      setMensagem("");
      setStatus(MANTER);
      toast.success(t("gestao.atendimento.sucesso"));
    } catch (err) {
      toast.error(mensagemDeErro(err, t("gestao.atendimento.erro")));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
        {status ? t("gestao.atendimento.tituloComStatus") : t("gestao.atendimento.titulo")}
      </p>
      <TextArea
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
        rows={3}
        maxLength={5000}
        placeholder={status ? t("gestao.atendimento.placeholderJustificativa") : t("gestao.atendimento.placeholderResposta")}
      />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="appearance-none bg-surface-container-highest/50 border border-veu/10 rounded-xl py-2.5 pl-4 pr-10 text-on-surface text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all cursor-pointer"
          >
            <option value={MANTER}>{t("gestao.atendimento.manterStatus", { status: statusReclamacao(rec.status).rotulo })}</option>
            {Object.entries(STATUS_RECLAMACAO)
              .filter(([s]) => s !== rec.status)
              .map(([s, cfg]) => (
                <option key={s} value={s}>
                  {t("gestao.atendimento.mudarPara", { status: cfg.rotulo })}
                </option>
              ))}
          </select>
          <Icone name="expand_more" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
        </div>
        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/25 transition-all cursor-pointer disabled:opacity-50"
        >
          <Icone name="send" className="text-base" />
          {enviando ? t("comum:acoes.enviando") : t("comum:acoes.enviar")}
        </button>
      </div>
    </div>
  );
}

// ─── Histórico ───────────────────────────────
function Historico({ interacoes }) {
  const { t } = useTranslation("ocorrencias");
  if (!interacoes?.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
        {t("gestao.historico")}
      </p>
      <div className="space-y-2">
        {interacoes.map((i) => (
          <div key={i.id} className="bg-surface-container-highest/30 rounded-xl p-3 border-l-2 border-primary/40 space-y-1">
            <p className="text-sm text-on-surface whitespace-pre-line">{i.mensagem}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <span>{dataHora(i.criadoEm)}</span>
              {i.autorEmail && <span>· {i.autorEmail}</span>}
              {i.statusNovo && (
                <span className={`font-semibold px-2 py-0.5 rounded-full ${statusReclamacao(i.statusNovo).cor}`}>
                  {i.statusAnterior ? `${statusReclamacao(i.statusAnterior).rotulo} → ` : ""}{statusReclamacao(i.statusNovo).rotulo}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
export function GerenciarReclamacoes() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { t } = useTranslation("ocorrencias");
  // O Admin Geral acompanha, mas quem atende é o síndico do condomínio.
  const podeAtender = usuario?.perfil === PERFIS.ADMIN_SINDICO;

  const [reclamacoes, setReclamacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [expandido, setExpandido] = useState(null);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await reclamacoesApi.listar();
        if (ok) setReclamacoes(res.data || []);
      } catch (e) {
        if (ok) {
          setReclamacoes([]);
          setErro(mensagemDeErro(e, t("gestao.erroCarregar")));
        }
      } finally {
        if (ok) setCarregando(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, [t]);

  const atualizar = (atual) =>
    setReclamacoes((prev) => prev.map((rec) => (rec.id === atual.id ? atual : rec)));

  const recFiltradas =
    filtroStatus === "TODOS" ? reclamacoes : reclamacoes.filter((r) => r.status === filtroStatus);

  const contadores = Object.keys(STATUS_RECLAMACAO).reduce(
    (acc, s) => ({ ...acc, [s]: reclamacoes.filter((r) => r.status === s).length }),
    {}
  );

  if (carregando) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-6">
        <div className="max-w-6xl mx-auto py-20 text-center text-on-surface-variant text-sm">{t("comum:estado.carregando")}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              {t("geral.painelAdministrativo")}
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              {t("gestao.cabecalho.titulo")}{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                {t("gestao.cabecalho.tituloDestaque")}
              </span>
            </h1>
          </div>
          <button
            type="button"
            onClick={() => navigate("/adm/ordens-servico")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-veu/5 text-on-surface font-semibold text-sm hover:bg-veu/10 transition-all cursor-pointer self-start md:self-auto"
          >
            <Icone name="construction" className="text-lg" />
            {t("detalhe.ordensServico")}
          </button>
        </header>

        {erro && (
          <div className="rounded-xl bg-error/10 border border-error/25 px-4 py-3 text-sm text-error">{erro}</div>
        )}

        {/* Cards resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {Object.entries(STATUS_RECLAMACAO).map(([s, cfg]) => (
            <button
              key={s}
              onClick={() => setFiltroStatus(filtroStatus === s ? "TODOS" : s)}
              className={`glass-panel rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.02] ${
                filtroStatus === s ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.cor}`}>
                <Icone name={cfg.icone} className="text-xl" />
              </div>
              <div className="text-left">
                <p className="text-2xl font-extrabold text-on-surface font-headline">{contadores[s] ?? 0}</p>
                <p className="text-xs text-on-surface-variant">{cfg.rotulo}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Filtro ativo */}
        {filtroStatus !== "TODOS" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-on-surface-variant">{t("gestao.filtrandoPor")}</span>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusReclamacao(filtroStatus).cor}`}>
              {statusReclamacao(filtroStatus).rotulo}
            </span>
            <button
              onClick={() => setFiltroStatus("TODOS")}
              className="text-xs text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer underline underline-offset-2"
            >
              {t("comum:acoes.limparFiltro")}
            </button>
          </div>
        )}

        {/* Lista */}
        <div className="space-y-3">
          {recFiltradas.map((rec) => {
            const st = statusReclamacao(rec.status);
            return (
              <div key={rec.id} className="glass-panel rounded-2xl overflow-hidden">
                {/* Cabeçalho */}
                <button
                  className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left cursor-pointer hover:bg-veu/5 transition-all"
                  onClick={() => setExpandido(expandido === rec.id ? null : rec.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${st.cor}`}>
                      <Icone name={st.icone} className="text-xl" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <p className="font-semibold text-on-surface">{rotuloCategoria(rec.categoria)}</p>
                        <span className="text-xs text-on-surface-variant font-mono">{rec.protocolo}</span>
                      </div>
                      <p className="text-xs text-on-surface-variant line-clamp-1 max-w-md">{rec.descricao}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden md:inline text-xs text-on-surface-variant">{tempoDaOcorrencia(rec)}</span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${st.cor}`}>{st.rotulo}</span>
                    <Icone
                      name={expandido === rec.id ? "expand_less" : "expand_more"}
                      className="text-on-surface-variant text-xl"
                    />
                  </div>
                </button>

                {/* Detalhes expandidos */}
                {expandido === rec.id && (
                  <div className="px-6 pb-5 border-t border-veu/5 pt-4 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-surface-container-highest/30 rounded-xl p-3">
                        <p className="text-xs text-on-surface-variant mb-1">{t("detalhe.morador")}</p>
                        <p className="text-sm font-semibold text-on-surface break-words">
                          {rec.usuario?.nome || rec.usuario?.email || t("detalhe.usuarioId", { id: rec.usuarioId })}
                        </p>
                      </div>
                      <div className="bg-surface-container-highest/30 rounded-xl p-3">
                        <p className="text-xs text-on-surface-variant mb-1">{t("detalhe.registradaEm")}</p>
                        <p className="text-sm font-semibold text-on-surface">{dataHora(rec.criadoEm)}</p>
                      </div>
                      <div className="bg-surface-container-highest/30 rounded-xl p-3">
                        <p className="text-xs text-on-surface-variant mb-1">{t("detalhe.tempo")}</p>
                        <p className="text-sm font-semibold text-on-surface">{tempoDaOcorrencia(rec)}</p>
                      </div>
                      {rec.anexoUrl && (
                        <div className="bg-surface-container-highest/30 rounded-xl p-3">
                          <p className="text-xs text-on-surface-variant mb-1">{t("detalhe.anexo")}</p>
                          <a
                            href={rec.anexoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-primary hover:underline"
                          >
                            {t("detalhe.verArquivo")}
                          </a>
                        </div>
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">{t("detalhe.descricao")}</p>
                      <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3 whitespace-pre-line">
                        {rec.descricao}
                      </p>
                    </div>

                    {/* Ordens de serviço vinculadas */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                          {t("detalhe.ordensServico")}
                        </p>
                        {podeAtender && rec.status !== "RESOLVIDO" && (
                          <button
                            type="button"
                            onClick={() => navigate(`/adm/ordens-servico?reclamacao=${rec.id}`)}
                            className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
                          >
                            <Icone name="add" className="text-base" />
                            {t("gestao.abrirOs")}
                          </button>
                        )}
                      </div>
                      {rec.ordensServico?.length ? (
                        rec.ordensServico.map((os) => (
                          <button
                            key={os.id}
                            type="button"
                            onClick={() => navigate(`/adm/ordens-servico?os=${os.id}`)}
                            className="w-full bg-surface-container-highest/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 hover:bg-veu/5 transition-all cursor-pointer text-left"
                          >
                            <span className="flex items-center gap-2">
                              <Icone name="construction" className="text-lg text-on-surface-variant" />
                              <span className="text-sm font-mono text-on-surface">{os.numero}</span>
                              <span className="text-xs text-on-surface-variant">{t("detalhe.prazo", { data: formatarData(os.prazo) })}</span>
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusOs(os.status).cor}`}>
                              {statusOs(os.status).rotulo}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-on-surface-variant">{t("gestao.semOs")}</p>
                      )}
                    </div>

                    <Historico interacoes={rec.interacoes} />

                    {podeAtender && <FormAtendimento rec={rec} onAtualizada={atualizar} />}
                  </div>
                )}
              </div>
            );
          })}

          {recFiltradas.length === 0 && (
            <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
              <Icone name="inbox" className="text-5xl opacity-30" />
              <p className="text-sm">{t("gestao.vazio")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
