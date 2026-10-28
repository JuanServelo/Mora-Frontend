// src/pages/adm/GerenciarConhecimento.jsx
// Página ADMIN — Base de Conhecimento (FAQ, global) + Avisos e Comunicados (por condomínio)
import { useState, useEffect, useCallback } from "react";
import { conhecimentoApi, avisoApi, perguntasFaqApi, mensagemDeErro } from "../../services/comunicacaoApi";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useTranslation } from "react-i18next";
import { idiomaAtual } from "../../i18n";

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

// ════════════════════════════════════════════
// TOP-LEVEL: abas Base de Conhecimento | Avisos
// ════════════════════════════════════════════
export function GerenciarConhecimento() {
  const { t } = useTranslation("conhecimento");
  const [aba, setAba] = useState("conhecimento");
  const [pendentes, setPendentes] = useState(0);

  // O número na aba é o que diz ao síndico que há morador esperando resposta,
  // sem ele precisar abrir a aba para descobrir.
  const contarPendentes = useCallback(() => {
    perguntasFaqApi
      .listar("PENDENTE")
      .then(({ data }) => setPendentes((data ?? []).length))
      .catch(() => {});
  }, []);

  useEffect(() => { contarPendentes(); }, [contarPendentes]);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            {t("cabecalho.painelAdministrativo")}
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            {t("cabecalho.baseDe")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("cabecalho.conhecimento")}
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {t("cabecalho.subtitulo")}
          </p>
        </header>

        {/* Sub-navbar de abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "conhecimento", rotuloKey: "abas.conhecimento", icon: "library_books" },
            { id: "perguntas", rotuloKey: "abas.perguntas", icon: "contact_support", total: pendentes },
            { id: "avisos", rotuloKey: "abas.avisos", icon: "campaign" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-veu/5"
              }`}
            >
              <Icone name={tab.icon} className="text-lg" />
              {t(tab.rotuloKey)}
              {tab.total > 0 && (
                <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                  {tab.total}
                </span>
              )}
            </button>
          ))}
        </div>

        {aba === "conhecimento" && <AbaConhecimento />}
        {aba === "perguntas" && <AbaPerguntas aoMudar={contarPendentes} />}
        {aba === "avisos" && <AbaAvisos />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: BASE DE CONHECIMENTO (FAQ) — global
// ════════════════════════════════════════════
const CATEGORIAS = [
  { value: "REGRA", rotuloKey: "categorias.regra" },
  { value: "MANUAL", rotuloKey: "categorias.manual" },
  { value: "TUTORIAL", rotuloKey: "categorias.tutorial" },
  { value: "ORIENTACAO_CONVIVENCIA", rotuloKey: "categorias.orientacaoConvivencia" },
  { value: "FAQ", rotuloKey: "categorias.faq" },
];

const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.rotuloKey]));

const categoriaColor = (categoria) => {
  const map = {
    REGRA: "bg-error/10 text-error",
    MANUAL: "bg-primary/10 text-primary",
    TUTORIAL: "bg-tertiary/10 text-tertiary",
    ORIENTACAO_CONVIVENCIA: "bg-secondary/10 text-secondary",
    FAQ: "bg-primary/10 text-primary",
  };
  return map[categoria] ?? "bg-primary/10 text-primary";
};

const CATEGORIA_ICON = {
  REGRA: "gavel",
  MANUAL: "menu_book",
  TUTORIAL: "school",
  ORIENTACAO_CONVIVENCIA: "handshake",
  FAQ: "quiz",
};

const ARTIGO_INICIAL = {
  titulo: "",
  conteudo: "",
  categoria: "FAQ",
  autor: "",
  publicado: false,
};

/**
 * Mais "não ajudou" que "ajudou", com um mínimo de votos para um voto isolado
 * não marcar o artigo.
 */
function precisaRevisao(avaliacao) {
  if (!avaliacao) return false;
  return avaliacao.naoUteis >= 2 && avaliacao.naoUteis > avaliacao.uteis;
}

function Votos({ avaliacao }) {
  const { t } = useTranslation("conhecimento");
  if (!avaliacao || avaliacao.uteis + avaliacao.naoUteis === 0) return null;
  const alerta = precisaRevisao(avaliacao);
  return (
    <span
      title={alerta ? t("artigos.votos.alerta") : t("artigos.votos.titulo")}
      className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full ${alerta ? "bg-error/10 text-error" : "bg-veu/5 text-on-surface-variant"}`}
    >
      <span className="flex items-center gap-0.5"><Icone name="thumb_up" className="text-sm" />{avaliacao.uteis}</span>
      <span className="flex items-center gap-0.5"><Icone name="thumb_down" className="text-sm" />{avaliacao.naoUteis}</span>
    </span>
  );
}

function AbaConhecimento() {
  const { t } = useTranslation("conhecimento");
  const [artigos, setArtigos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(ARTIGO_INICIAL);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");
  const [avaliacoes, setAvaliacoes] = useState({});

  useEffect(() => {
    carregarArtigos();
    conhecimentoApi
      .avaliacoes()
      .then(({ data }) => setAvaliacoes(Object.fromEntries((data ?? []).map((a) => [a.artigoId, a]))))
      .catch(() => {});
  }, []);

  const carregarArtigos = async () => {
    try {
      const res = await conhecimentoApi.listarTodos();
      setArtigos(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar artigos:", err);
    } finally {
      setCarregando(false);
    }
  };

  const handleForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    try {
      if (editando) {
        const res = await conhecimentoApi.atualizar(editando, form);
        setArtigos((prev) => prev.map((a) => (a.id === editando ? res.data : a)));
        setEditando(null);
      } else {
        const res = await conhecimentoApi.criar(form);
        setArtigos((prev) => [res.data, ...prev]);
        setCriando(false);
      }
      setForm(ARTIGO_INICIAL);
    } catch (err) {
      console.error("Erro ao salvar artigo:", err);
    }
  };

  const excluir = async (id) => {
    if (!confirm(t("artigos.confirmarExclusao"))) return;
    try {
      await conhecimentoApi.excluir(id);
      setArtigos((prev) => prev.filter((a) => a.id !== id));
      if (expandido === id) setExpandido(null);
    } catch (err) {
      console.error("Erro ao excluir artigo:", err);
    }
  };

  const iniciarEdicao = (artigo) => {
    setForm({ ...artigo });
    setEditando(artigo.id);
    setCriando(false);
    setExpandido(null);
  };

  const alternarPublicado = async (artigo) => {
    try {
      const res = await conhecimentoApi.atualizar(artigo.id, {
        ...artigo,
        publicado: !artigo.publicado,
      });
      setArtigos((prev) => prev.map((a) => (a.id === artigo.id ? res.data : a)));
    } catch (err) {
      console.error("Erro ao alterar publicação:", err);
    }
  };

  const filtrados = artigos.filter((a) => {
    const buscaOk =
      a.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      (a.autor || "").toLowerCase().includes(busca.toLowerCase());
    const categoriaOk = filtroCategoria === "TODAS" || a.categoria === filtroCategoria;
    return buscaOk && categoriaOk;
  });

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        {!criando && !editando && (
          <Botao onClick={() => { setCriando(true); setForm(ARTIGO_INICIAL); }}>
            <span className="flex items-center gap-2">
              <Icone name="add" className="text-lg" /> {t("artigos.novo")}
            </span>
          </Botao>
        )}
      </div>

      {(criando || editando) && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {editando ? t("artigos.editar") : t("artigos.novo")}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label={t("artigos.form.titulo")} name="titulo" value={form.titulo} onChange={handleForm} placeholder={t("artigos.form.tituloPlaceholder")} required />
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("artigos.form.categoria")}</label>
                <select name="categoria" value={form.categoria} onChange={handleForm} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all" required>
                  {CATEGORIAS.map((c) => (<option key={c.value} value={c.value}>{t(c.rotuloKey)}</option>))}
                </select>
              </div>
            </div>
            <Campo label={t("artigos.form.autor")} name="autor" value={form.autor} onChange={handleForm} placeholder={t("artigos.form.autorPlaceholder")} />
            <TextArea label={t("artigos.form.conteudo")} name="conteudo" value={form.conteudo} onChange={handleForm} rows={8} placeholder={t("artigos.form.conteudoPlaceholder")} required />
            <div className="flex items-center gap-3">
              <input type="checkbox" id="art-publicado" name="publicado" checked={form.publicado} onChange={handleForm} className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="art-publicado" className="text-sm text-on-surface-variant">{t("artigos.form.publicar")}</label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setCriando(false); setEditando(null); setForm(ARTIGO_INICIAL); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">{t("comum:acoes.cancelar")}</button>
              <Botao type="submit">{editando ? t("artigos.form.salvarAlteracoes") : t("artigos.form.criar")}</Botao>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: t("artigos.resumo.total"), valor: artigos.length, icon: "library_books", color: "primary" },
          { label: t("artigos.resumo.publicados"), valor: artigos.filter((a) => a.publicado).length, icon: "check_circle", color: "primary" },
          { label: t("artigos.resumo.rascunhos"), valor: artigos.filter((a) => !a.publicado).length, icon: "edit_note", color: "error" },
          { label: t("artigos.resumo.revisao"), valor: artigos.filter((a) => precisaRevisao(avaliacoes[a.id])).length, icon: "thumb_down", color: "error" },
        ].map((c) => (
          <div key={c.label} className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${c.color}/10 flex items-center justify-center`}>
              <Icone name={c.icon} className={`text-${c.color} text-2xl`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-on-surface">{c.valor}</p>
              <p className="text-xs text-on-surface-variant">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Campo placeholder={t("artigos.buscarPlaceholder")} icon="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="sm:w-56">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all">
            <option value="TODAS">{t("artigos.todasCategorias")}</option>
            {CATEGORIAS.map((c) => (<option key={c.value} value={c.value}>{t(c.rotuloKey)}</option>))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtrados.map((artigo) => (
          <div key={artigo.id} className="glass-panel rounded-2xl overflow-hidden">
            <button className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left cursor-pointer hover:bg-veu/5 transition-all" onClick={() => setExpandido(expandido === artigo.id ? null : artigo.id)}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name={CATEGORIA_ICON[artigo.categoria] ?? "article"} className="text-primary text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{artigo.titulo}</p>
                  <p className="text-xs text-on-surface-variant">
                    {artigo.autor ? t("artigos.por", { autor: artigo.autor }) : ""}
                    {new Date(artigo.criadoEm).toLocaleDateString(idiomaAtual())}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <Votos avaliacao={avaliacoes[artigo.id]} />
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${categoriaColor(artigo.categoria)}`}>{CATEGORIA_LABEL[artigo.categoria] ? t(CATEGORIA_LABEL[artigo.categoria]) : artigo.categoria}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${artigo.publicado ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>{artigo.publicado ? t("artigos.status.publicado") : t("artigos.status.rascunho")}</span>
                <Icone name={expandido === artigo.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
              </div>
            </button>
            {expandido === artigo.id && (
              <div className="px-4 sm:px-6 pb-5 border-t border-veu/5 pt-4 space-y-4">
                <div className="bg-surface-container-highest/30 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t("artigos.conteudo")}</p>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{artigo.conteudo}</p>
                </div>
                {artigo.atualizadoEm && (
                  <p className="text-xs text-on-surface-variant">{t("artigos.ultimaAtualizacao", { data: new Date(artigo.atualizadoEm).toLocaleDateString(idiomaAtual()) })}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => alternarPublicado(artigo)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${artigo.publicado ? "bg-error/10 text-error border-error/20 hover:bg-error/20" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"}`}>{artigo.publicado ? t("artigos.despublicar") : t("artigos.publicar")}</button>
                  <button onClick={() => iniciarEdicao(artigo)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-veu/5 text-on-surface-variant hover:text-on-surface hover:bg-veu/10 transition-all cursor-pointer"><Icone name="edit" className="text-sm" /> {t("comum:acoes.editar")}</button>
                  <button onClick={() => excluir(artigo.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer"><Icone name="delete" className="text-sm" /> {t("comum:acoes.excluir")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtrados.length === 0 && !carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="library_books" className="text-5xl opacity-30" />
            <p className="text-sm">{t("artigos.vazio")}</p>
          </div>
        )}
        {carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <p className="text-sm">{t("artigos.carregando")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: PERGUNTAS DOS MORADORES
// ════════════════════════════════════════════
function AbaPerguntas({ aoMudar }) {
  const { t } = useTranslation("conhecimento");
  const toast = useToast();
  const confirm = useConfirm();
  const [perguntas, setPerguntas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("PENDENTE");
  const [respondendo, setRespondendo] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await perguntasFaqApi.listar(filtro === "TODAS" ? null : filtro);
      setPerguntas(data ?? []);
    } catch (err) {
      toast.error(mensagemDeErro(err, t("perguntas.erroCarregar")));
    } finally {
      setCarregando(false);
    }
  }, [filtro, toast, t]);

  useEffect(() => { carregar(); }, [carregar]);

  const aoResponder = () => {
    setRespondendo(null);
    carregar();
    aoMudar();
  };

  const descartar = async (pergunta) => {
    const ok = await confirm({
      titulo: t("perguntas.descartar.titulo"),
      mensagem: t("perguntas.descartar.mensagem"),
      confirmarTexto: t("perguntas.descartar.confirmar"),
      cancelarTexto: t("comum:acoes.cancelar"),
      variante: "danger",
    });
    if (!ok) return;
    try {
      await perguntasFaqApi.excluir(pergunta.id);
      setPerguntas((prev) => prev.filter((p) => p.id !== pergunta.id));
      aoMudar();
    } catch (err) {
      toast.error(mensagemDeErro(err, t("perguntas.descartar.erro")));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {[
          { v: "PENDENTE", r: "perguntas.filtros.pendente" },
          { v: "RESPONDIDA", r: "perguntas.filtros.respondidas" },
          { v: "TODAS", r: "comum:estado.todas" },
        ].map((o) => (
          <button
            key={o.v}
            onClick={() => setFiltro(o.v)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
              filtro === o.v ? "bg-primary text-on-primary" : "bg-surface-container-highest/40 text-on-surface-variant hover:bg-veu/10"
            }`}
          >
            {t(o.r)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {!carregando && perguntas.map((p) => (
          <div key={p.id} className="glass-panel rounded-2xl p-4 sm:p-6 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icone name="contact_support" className="text-primary text-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-on-surface whitespace-pre-wrap break-words">{p.texto}</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  {p.autorNome ?? t("perguntas.morador")} · {new Date(p.criadoEm).toLocaleDateString(idiomaAtual())}
                  {p.categoria && ` · ${CATEGORIA_LABEL[p.categoria] ? t(CATEGORIA_LABEL[p.categoria]) : p.categoria}`}
                </p>
              </div>
              <span className={`self-start shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                p.status === "RESPONDIDA" ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
              }`}>
                {p.status === "RESPONDIDA" ? t("perguntas.status.respondida") : t("perguntas.status.aguardando")}
              </span>
            </div>

            {p.status === "RESPONDIDA" ? (
              <div className="bg-surface-container-highest/30 rounded-xl p-4 space-y-2">
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{p.resposta}</p>
                <p className="text-xs text-on-surface-variant">
                  {p.respondidaPor ? `${p.respondidaPor} · ` : ""}
                  {p.respondidaEm && new Date(p.respondidaEm).toLocaleDateString(idiomaAtual())}
                  {p.artigoId && (
                    <span className="inline-flex items-center gap-1 ml-2 text-primary font-semibold">
                      <Icone name="public" className="text-sm" /> {t("perguntas.publicadaNaFaq")}
                    </span>
                  )}
                </p>
              </div>
            ) : respondendo === p.id ? (
              <FormResposta pergunta={p} aoCancelar={() => setRespondendo(null)} aoResponder={aoResponder} />
            ) : (
              <div className="flex flex-wrap gap-2 justify-end">
                <button onClick={() => descartar(p)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-all cursor-pointer">
                  <Icone name="delete" className="text-sm" /> {t("perguntas.descartar.botao")}
                </button>
                <button onClick={() => setRespondendo(p.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-all cursor-pointer">
                  <Icone name="reply" className="text-sm" /> {t("perguntas.responder")}
                </button>
              </div>
            )}
          </div>
        ))}

        {perguntas.length === 0 && !carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="contact_support" className="text-5xl opacity-30" />
            <p className="text-sm">
              {filtro === "PENDENTE" ? t("perguntas.vazioPendentes") : t("perguntas.vazio")}
            </p>
          </div>
        )}
        {carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center text-on-surface-variant">
            <p className="text-sm">{t("perguntas.carregando")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Resposta a uma pergunta. "Publicar na FAQ" já vem marcado: quase sempre a
 * dúvida de um morador é a de outros, e publicada ela deixa de ser perguntada.
 */
function FormResposta({ pergunta, aoCancelar, aoResponder }) {
  const { t } = useTranslation("conhecimento");
  const toast = useToast();
  const [resposta, setResposta] = useState("");
  const [publicar, setPublicar] = useState(true);
  const [titulo, setTitulo] = useState(pergunta.texto.slice(0, 200));
  const [categoria, setCategoria] = useState(pergunta.categoria ?? "FAQ");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      await perguntasFaqApi.responder(pergunta.id, {
        resposta: resposta.trim(),
        publicar,
        ...(publicar ? { titulo: titulo.trim(), categoria } : {}),
      });
      toast.success(publicar ? t("perguntas.resposta.sucessoPublicada") : t("perguntas.resposta.sucesso"));
      aoResponder();
    } catch (err) {
      setErro(mensagemDeErro(err, t("perguntas.resposta.erro")));
      setEnviando(false);
    }
  };

  return (
    <form onSubmit={enviar} className="space-y-4 border-t border-veu/5 pt-4">
      <TextArea label={t("perguntas.resposta.label")} value={resposta} onChange={(e) => setResposta(e.target.value)} rows={5} maxLength={5000} placeholder={t("perguntas.resposta.placeholder")} required autoFocus />

      <div className="flex items-center gap-3">
        <input type="checkbox" id={`publicar-${pergunta.id}`} checked={publicar} onChange={(e) => setPublicar(e.target.checked)} className="w-4 h-4 accent-primary rounded" />
        <label htmlFor={`publicar-${pergunta.id}`} className="text-sm text-on-surface-variant">
          {t("perguntas.resposta.publicar")}
        </label>
      </div>

      {publicar && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Campo label={t("perguntas.resposta.tituloArtigo")} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} required />
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("artigos.form.categoria")}</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all">
              {CATEGORIAS.map((c) => (<option key={c.value} value={c.value}>{t(c.rotuloKey)}</option>))}
            </select>
          </div>
        </div>
      )}

      {erro && <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={aoCancelar} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">{t("comum:acoes.cancelar")}</button>
        <Botao type="submit" disabled={enviando || !resposta.trim()} className="sm:w-auto px-8">{enviando ? t("perguntas.resposta.enviando") : t("perguntas.resposta.enviar")}</Botao>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════
// ABA: AVISOS E COMUNICADOS — por condomínio
// ════════════════════════════════════════════
const PUBLICOS = [
  { value: "TODOS", rotuloKey: "publico.todos" },
  { value: "MORADORES", rotuloKey: "publico.moradores" },
  { value: "FUNCIONARIOS", rotuloKey: "publico.funcionarios" },
];
const PUBLICO_LABEL = Object.fromEntries(PUBLICOS.map((p) => [p.value, p.rotuloKey]));

const AVISO_INICIAL = {
  titulo: "",
  mensagem: "",
  dataInicio: "",
  dataFim: "",
  publicoAlvo: "TODOS",
  autor: "",
  publicado: false,
};

function vigente(aviso) {
  if (!aviso.publicado) return false;
  const hoje = new Date().toISOString().slice(0, 10);
  return aviso.dataInicio <= hoje && aviso.dataFim >= hoje;
}

function AbaAvisos() {
  const { t } = useTranslation("avisos");
  const { usuario } = useAuth();
  const confirm = useConfirm();
  const condominioId = usuario?.condominioId;
  const [avisos, setAvisos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [form, setForm] = useState(AVISO_INICIAL);
  const [erro, setErro] = useState("");

  useEffect(() => {
    carregarAvisos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  const carregarAvisos = async () => {
    try {
      const res = await avisoApi.listar(condominioId);
      setAvisos(res.data || []);
    } catch (err) {
      console.error("Erro ao carregar avisos:", err);
    } finally {
      setCarregando(false);
    }
  };

  const handleForm = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErro("");
    if (form.dataInicio && form.dataFim && form.dataInicio > form.dataFim) {
      setErro(t("admin.form.erroPeriodo"));
      return;
    }
    const payload = { ...form, condominioId };
    try {
      if (editando) {
        const res = await avisoApi.atualizar(editando, payload);
        setAvisos((prev) => prev.map((a) => (a.id === editando ? res.data : a)));
        setEditando(null);
      } else {
        const res = await avisoApi.criar(payload);
        setAvisos((prev) => [res.data, ...prev]);
        setCriando(false);
      }
      setForm(AVISO_INICIAL);
    } catch (err) {
      setErro(err.response?.data?.mensagem || err.response?.data?.message || t("admin.form.erroSalvar"));
    }
  };

  const excluir = async (aviso) => {
    const ok = await confirm({
      titulo: t("admin.excluir.titulo"),
      mensagem: t("admin.excluir.mensagem", { titulo: aviso.titulo }),
      confirmarTexto: t("admin.excluir.confirmar"),
      cancelarTexto: t("comum:acoes.cancelar"),
      variante: "danger",
    });
    if (!ok) return;
    try {
      await avisoApi.excluir(aviso.id);
      setAvisos((prev) => prev.filter((a) => a.id !== aviso.id));
      if (expandido === aviso.id) setExpandido(null);
    } catch (err) {
      console.error("Erro ao excluir aviso:", err);
    }
  };

  const iniciarEdicao = (aviso) => {
    setForm({
      titulo: aviso.titulo,
      mensagem: aviso.mensagem,
      dataInicio: aviso.dataInicio,
      dataFim: aviso.dataFim,
      publicoAlvo: aviso.publicoAlvo,
      autor: aviso.autor || "",
      publicado: aviso.publicado,
    });
    setEditando(aviso.id);
    setCriando(false);
    setExpandido(null);
  };

  const encerrar = async (aviso) => {
    try {
      const res = await avisoApi.encerrar(aviso.id);
      setAvisos((prev) => prev.map((a) => (a.id === aviso.id ? res.data : a)));
    } catch (err) {
      console.error("Erro ao encerrar aviso:", err);
    }
  };

  if (!condominioId) {
    return (
      <div className="glass-panel rounded-2xl py-16 text-center text-on-surface-variant">
        {t("admin.semCondominio")}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        {!criando && !editando && (
          <Botao onClick={() => { setCriando(true); setForm(AVISO_INICIAL); setErro(""); }}>
            <span className="flex items-center gap-2">
              <Icone name="add" className="text-lg" /> {t("admin.novo")}
            </span>
          </Botao>
        )}
      </div>

      {(criando || editando) && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {editando ? t("admin.editar") : t("admin.novo")}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <Campo label={t("admin.form.titulo")} name="titulo" value={form.titulo} onChange={handleForm} placeholder={t("admin.form.tituloPlaceholder")} required />
            <TextArea label={t("admin.form.mensagem")} name="mensagem" value={form.mensagem} onChange={handleForm} rows={5} placeholder={t("admin.form.mensagemPlaceholder")} required />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("admin.form.inicioExibicao")}</label>
                <input type="date" name="dataInicio" value={form.dataInicio} onChange={handleForm} required className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("admin.form.fimExibicao")}</label>
                <input type="date" name="dataFim" value={form.dataFim} onChange={handleForm} required className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("admin.form.publicoAlvo")}</label>
                <select name="publicoAlvo" value={form.publicoAlvo} onChange={handleForm} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none">
                  {PUBLICOS.map((p) => (<option key={p.value} value={p.value}>{t(p.rotuloKey)}</option>))}
                </select>
              </div>
            </div>
            <Campo label={t("admin.form.autor")} name="autor" value={form.autor} onChange={handleForm} placeholder={t("admin.form.autorPlaceholder")} />
            <div className="flex items-center gap-3">
              <input type="checkbox" id="aviso-publicado" name="publicado" checked={form.publicado} onChange={handleForm} className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="aviso-publicado" className="text-sm text-on-surface-variant">{t("admin.form.publicar")}</label>
            </div>
            {erro && <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setCriando(false); setEditando(null); setForm(AVISO_INICIAL); setErro(""); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">{t("comum:acoes.cancelar")}</button>
              <Botao type="submit">{editando ? t("admin.form.salvarAlteracoes") : t("admin.form.criar")}</Botao>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: t("admin.resumo.total"), valor: avisos.length, icon: "campaign", color: "primary" },
          { label: t("admin.resumo.vigentes"), valor: avisos.filter(vigente).length, icon: "check_circle", color: "primary" },
          { label: t("admin.resumo.encerrados"), valor: avisos.filter((a) => !vigente(a)).length, icon: "history", color: "error" },
        ].map((c) => (
          <div key={c.label} className="glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl bg-${c.color}/10 flex items-center justify-center`}>
              <Icone name={c.icon} className={`text-${c.color} text-2xl`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold text-on-surface">{c.valor}</p>
              <p className="text-xs text-on-surface-variant">{c.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {avisos.map((aviso) => (
          <div key={aviso.id} className="glass-panel rounded-2xl overflow-hidden">
            <button className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left cursor-pointer hover:bg-veu/5 transition-all" onClick={() => setExpandido(expandido === aviso.id ? null : aviso.id)}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name="campaign" className="text-primary text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{aviso.titulo}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(aviso.dataInicio).toLocaleDateString(idiomaAtual())} – {new Date(aviso.dataFim).toLocaleDateString(idiomaAtual())}
                    {" · "}{PUBLICO_LABEL[aviso.publicoAlvo] ? t(PUBLICO_LABEL[aviso.publicoAlvo]) : aviso.publicoAlvo}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${vigente(aviso) ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>{vigente(aviso) ? t("admin.status.vigente") : aviso.publicado ? t("admin.status.foraDoPeriodo") : t("admin.status.rascunho")}</span>
                <Icone name={expandido === aviso.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
              </div>
            </button>
            {expandido === aviso.id && (
              <div className="px-4 sm:px-6 pb-5 border-t border-veu/5 pt-4 space-y-4">
                <div className="bg-surface-container-highest/30 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">{t("admin.lista.mensagem")}</p>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{aviso.mensagem}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aviso.publicado && (
                    <button onClick={() => encerrar(aviso)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-error/10 text-error border-error/20 hover:bg-error/20 transition-all cursor-pointer">{t("admin.lista.encerrar")}</button>
                  )}
                  <button onClick={() => iniciarEdicao(aviso)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-veu/5 text-on-surface-variant hover:text-on-surface hover:bg-veu/10 transition-all cursor-pointer"><Icone name="edit" className="text-sm" /> {t("comum:acoes.editar")}</button>
                  <button onClick={() => excluir(aviso)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer"><Icone name="delete" className="text-sm" /> {t("comum:acoes.excluir")}</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {avisos.length === 0 && !carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="campaign" className="text-5xl opacity-30" />
            <p className="text-sm">{t("admin.lista.vazio")}</p>
          </div>
        )}
        {carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <p className="text-sm">{t("admin.lista.carregando")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
