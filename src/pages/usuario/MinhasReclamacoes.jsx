// src/pages/usuario/MinhasReclamacoes.jsx
import { useState, useEffect } from "react";
import { Trans, useTranslation } from "react-i18next";
import { reclamacoesApi, mensagemDeErro } from "../../services/ocorrenciasApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import {
  CATEGORIAS,
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

const FORM_VAZIO = { categoria: "BARULHO", descricao: "", anexoUrl: "" };

// ─── Aba: Abrir Reclamação ───────────────────
function AbaNovaReclamacao({ onCriada }) {
  const { t } = useTranslation("ocorrencias");
  const [form, setForm] = useState(FORM_VAZIO);
  const [criada, setCriada] = useState(null);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const res = await reclamacoesApi.registrar({
        categoria: form.categoria,
        descricao: form.descricao.trim(),
        anexoUrl: form.anexoUrl?.trim() || undefined,
      });
      onCriada(res.data);
      setCriada(res.data);
    } catch (err) {
      setErro(mensagemDeErro(err, t("minhas.nova.erro")));
    } finally {
      setEnviando(false);
    }
  };

  if (criada) {
    return (
      <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icone name="check_circle" className="text-4xl text-primary" />
        </div>
        <h2 className="font-headline text-2xl font-bold text-on-surface">{t("minhas.registrada.titulo")}</h2>
        <p className="text-on-surface-variant text-sm max-w-sm">
          <Trans
            t={t}
            i18nKey="minhas.registrada.texto"
            values={{ protocolo: criada.protocolo }}
            components={{ protocolo: <strong className="font-mono text-on-surface" />, aba: <strong /> }}
          />
        </p>
        <Botao
          onClick={() => {
            setCriada(null);
            setForm(FORM_VAZIO);
          }}
        >
          {t("minhas.registrada.outra")}
        </Botao>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-6">
      <div>
        <h2 className="font-headline text-xl font-bold text-on-surface">{t("minhas.nova.titulo")}</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          {t("minhas.nova.subtitulo")}
        </p>
      </div>
      {erro && (
        <div className="rounded-xl bg-error/10 border border-error/25 px-4 py-3 text-sm text-error">
          {erro}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            {t("minhas.nova.categoria")}
          </label>
          <select
            name="categoria"
            value={form.categoria}
            onChange={handleForm}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>
                {rotuloCategoria(c)}
              </option>
            ))}
          </select>
        </div>
        <TextArea
          label={t("detalhe.descricao")}
          name="descricao"
          value={form.descricao}
          onChange={handleForm}
          rows={4}
          maxLength={5000}
          placeholder={t("minhas.nova.descricaoPlaceholder")}
          required
        />
        <Campo
          label={t("minhas.nova.anexo")}
          name="anexoUrl"
          value={form.anexoUrl}
          onChange={handleForm}
          placeholder="https://..."
        />
        <div className="flex justify-end pt-2">
          <Botao type="submit" disabled={enviando}>
            <span className="flex items-center gap-2">
              <Icone name="send" className="text-lg" /> {enviando ? t("comum:acoes.enviando") : t("minhas.nova.enviar")}
            </span>
          </Botao>
        </div>
      </form>
    </div>
  );
}

// ─── Histórico ───────────────────────────────
function Historico({ interacoes }) {
  const { t } = useTranslation("ocorrencias");
  if (!interacoes?.length) {
    return (
      <div className="bg-surface-container-highest/20 rounded-xl p-3 flex items-center gap-2 text-on-surface-variant">
        <Icone name="hourglass_empty" className="text-lg opacity-50" />
        <p className="text-sm">{t("minhas.aguardando")}</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
        {t("minhas.respostas")}
      </p>
      <div className="space-y-2">
        {interacoes.map((i) => (
          <div
            key={i.id}
            className="bg-surface-container-highest/30 rounded-xl p-3 border-l-2 border-primary/40 space-y-1"
          >
            <p className="text-sm text-on-surface whitespace-pre-line">{i.mensagem}</p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant">
              <span>{dataHora(i.criadoEm)}</span>
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

// ─── Aba: Minhas Reclamações ─────────────────
function AbaMinhasReclamacoes({ reclamacoes }) {
  const { t } = useTranslation("ocorrencias");
  const [expandido, setExpandido] = useState(null);

  if (reclamacoes.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
        <Icone name="inbox" className="text-5xl opacity-30" />
        <p className="text-sm">{t("minhas.vazio")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reclamacoes.map((rec) => {
        const st = statusReclamacao(rec.status);
        return (
          <div key={rec.id} className="glass-panel rounded-2xl overflow-hidden">
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
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${st.cor}`}>{st.rotulo}</span>
                <Icone
                  name={expandido === rec.id ? "expand_less" : "expand_more"}
                  className="text-on-surface-variant text-xl"
                />
              </div>
            </button>

            {expandido === rec.id && (
              <div className="px-6 pb-5 border-t border-veu/5 pt-4 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-surface-container-highest/30 rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">{t("detalhe.protocolo")}</p>
                    <p className="text-sm font-semibold text-on-surface font-mono">{rec.protocolo}</p>
                  </div>
                  <div className="bg-surface-container-highest/30 rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">{t("detalhe.registradaEm")}</p>
                    <p className="text-sm font-semibold text-on-surface">{dataHora(rec.criadoEm)}</p>
                  </div>
                  <div className="bg-surface-container-highest/30 rounded-xl p-3">
                    <p className="text-xs text-on-surface-variant mb-1">{t("detalhe.tempo")}</p>
                    <p className="text-sm font-semibold text-on-surface">{tempoDaOcorrencia(rec)}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                    {t("detalhe.descricao")}
                  </p>
                  <p className="text-sm text-on-surface bg-surface-container-highest/30 rounded-xl p-3 whitespace-pre-line">
                    {rec.descricao}
                  </p>
                </div>

                {rec.anexoUrl && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                      {t("detalhe.anexo")}
                    </p>
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

                {rec.ordensServico?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">
                      {t("detalhe.ordensServico")}
                    </p>
                    <div className="space-y-2">
                      {rec.ordensServico.map((os) => (
                        <div
                          key={os.id}
                          className="bg-surface-container-highest/30 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <Icone name="construction" className="text-lg text-on-surface-variant" />
                            <span className="text-sm font-mono text-on-surface">{os.numero}</span>
                            <span className="text-xs text-on-surface-variant">{t("detalhe.prazo", { data: formatarData(os.prazo) })}</span>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusOs(os.status).cor}`}>
                            {statusOs(os.status).rotulo}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Historico interacoes={rec.interacoes} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════
export function MinhasReclamacoes() {
  const { t } = useTranslation("ocorrencias");
  const [aba, setAba] = useState("nova");
  const [reclamacoes, setReclamacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ok = true;
    (async () => {
      try {
        const res = await reclamacoesApi.listarMinhas();
        if (ok) setReclamacoes(res.data || []);
      } catch {
        if (ok) setReclamacoes([]);
      } finally {
        if (ok) setCarregando(false);
      }
    })();
    return () => {
      ok = false;
    };
  }, []);

  const handleCriada = (nova) => {
    setReclamacoes((prev) => [nova, ...prev]);
  };

  const tabs = [
    { id: "nova", label: t("minhas.abas.nova"), icon: "add_circle" },
    { id: "minhas", label: t("minhas.abas.minhas"), icon: "list_alt" },
  ];

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            {t("minhas.cabecalho.area")}
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {t("minhas.cabecalho.titulo")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("minhas.cabecalho.tituloDestaque")}
            </span>
          </h1>
        </header>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/20 text-primary"
                  : "text-on-surface-variant hover:bg-veu/5"
              }`}
            >
              <Icone name={tab.icon} className="text-lg" />
              {tab.label}
              {tab.id === "minhas" && reclamacoes.length > 0 && (
                <span className="ml-1 text-xs bg-primary/20 text-primary font-bold px-2 py-0.5 rounded-full">
                  {reclamacoes.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {aba === "nova" ? (
          <AbaNovaReclamacao onCriada={handleCriada} />
        ) : carregando ? (
          <div className="glass-panel rounded-2xl py-16 text-center text-on-surface-variant text-sm">
            {t("comum:estado.carregando")}
          </div>
        ) : (
          <AbaMinhasReclamacoes reclamacoes={reclamacoes} />
        )}
      </div>
    </div>
  );
}
