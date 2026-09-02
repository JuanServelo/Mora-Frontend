// src/pages/adm/GerenciarConhecimento.jsx
// Página ADMIN — Base de Conhecimento (FAQ, global) + Avisos e Comunicados (por condomínio)
import { useState, useEffect } from "react";
import { conhecimentoApi, avisoApi } from "../../services/portariaApi";
import { useAuth } from "../../contexts/AuthContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

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
  const [aba, setAba] = useState("conhecimento");

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Painel Administrativo
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Base de{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Conhecimento
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Gerencie a base de conhecimento (FAQ) e os avisos do condomínio.
          </p>
        </header>

        {/* Sub-navbar de abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "conhecimento", label: "Base de Conhecimento", icon: "library_books" },
            { id: "avisos", label: "Avisos", icon: "campaign" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
            >
              <Icone name={tab.icon} className="text-lg" />
              {tab.label}
            </button>
          ))}
        </div>

        {aba === "conhecimento" ? <AbaConhecimento /> : <AbaAvisos />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: BASE DE CONHECIMENTO (FAQ) — global
// ════════════════════════════════════════════
const CATEGORIAS = [
  { value: "REGRA", label: "Regra" },
  { value: "MANUAL", label: "Manual" },
  { value: "TUTORIAL", label: "Tutorial" },
  { value: "ORIENTACAO_CONVIVENCIA", label: "Orientação de Convivência" },
  { value: "FAQ", label: "FAQ" },
];

const CATEGORIA_LABEL = Object.fromEntries(CATEGORIAS.map((c) => [c.value, c.label]));

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

function AbaConhecimento() {
  const [artigos, setArtigos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(ARTIGO_INICIAL);
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("TODAS");

  useEffect(() => {
    carregarArtigos();
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
    if (!confirm("Tem certeza que deseja excluir este artigo?")) return;
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
              <Icone name="add" className="text-lg" /> Novo Artigo
            </span>
          </Botao>
        )}
      </div>

      {(criando || editando) && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {editando ? "Editar Artigo" : "Novo Artigo"}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Campo label="Título" name="titulo" value={form.titulo} onChange={handleForm} placeholder="Ex: Regras de uso da piscina" required />
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Categoria</label>
                <select name="categoria" value={form.categoria} onChange={handleForm} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all" required>
                  {CATEGORIAS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
                </select>
              </div>
            </div>
            <Campo label="Autor" name="autor" value={form.autor} onChange={handleForm} placeholder="Nome do autor (opcional)" />
            <TextArea label="Conteúdo" name="conteudo" value={form.conteudo} onChange={handleForm} rows={8} placeholder="Escreva o conteúdo do artigo..." required />
            <div className="flex items-center gap-3">
              <input type="checkbox" id="art-publicado" name="publicado" checked={form.publicado} onChange={handleForm} className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="art-publicado" className="text-sm text-on-surface-variant">Publicar artigo (visível para todos os moradores)</label>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setCriando(false); setEditando(null); setForm(ARTIGO_INICIAL); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer">Cancelar</button>
              <Botao type="submit">{editando ? "Salvar alterações" : "Criar artigo"}</Botao>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total de artigos", valor: artigos.length, icon: "library_books", color: "primary" },
          { label: "Publicados", valor: artigos.filter((a) => a.publicado).length, icon: "check_circle", color: "primary" },
          { label: "Rascunhos", valor: artigos.filter((a) => !a.publicado).length, icon: "edit_note", color: "error" },
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
          <Campo placeholder="Buscar por título ou autor..." icon="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="sm:w-56">
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all">
            <option value="TODAS">Todas as categorias</option>
            {CATEGORIAS.map((c) => (<option key={c.value} value={c.value}>{c.label}</option>))}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {filtrados.map((artigo) => (
          <div key={artigo.id} className="glass-panel rounded-2xl overflow-hidden">
            <button className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left cursor-pointer hover:bg-white/5 transition-all" onClick={() => setExpandido(expandido === artigo.id ? null : artigo.id)}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name={CATEGORIA_ICON[artigo.categoria] ?? "article"} className="text-primary text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{artigo.titulo}</p>
                  <p className="text-xs text-on-surface-variant">
                    {artigo.autor ? `Por ${artigo.autor} · ` : ""}
                    {new Date(artigo.criadoEm).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${categoriaColor(artigo.categoria)}`}>{CATEGORIA_LABEL[artigo.categoria] ?? artigo.categoria}</span>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${artigo.publicado ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>{artigo.publicado ? "Publicado" : "Rascunho"}</span>
                <Icone name={expandido === artigo.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
              </div>
            </button>
            {expandido === artigo.id && (
              <div className="px-4 sm:px-6 pb-5 border-t border-white/5 pt-4 space-y-4">
                <div className="bg-surface-container-highest/30 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Conteúdo</p>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{artigo.conteudo}</p>
                </div>
                {artigo.atualizadoEm && (
                  <p className="text-xs text-on-surface-variant">Última atualização: {new Date(artigo.atualizadoEm).toLocaleDateString("pt-BR")}</p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <button onClick={() => alternarPublicado(artigo)} className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${artigo.publicado ? "bg-error/10 text-error border-error/20 hover:bg-error/20" : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"}`}>{artigo.publicado ? "Despublicar" : "Publicar"}</button>
                  <button onClick={() => iniciarEdicao(artigo)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-all cursor-pointer"><Icone name="edit" className="text-sm" /> Editar</button>
                  <button onClick={() => excluir(artigo.id)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer"><Icone name="delete" className="text-sm" /> Excluir</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {filtrados.length === 0 && !carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="library_books" className="text-5xl opacity-30" />
            <p className="text-sm">Nenhum artigo encontrado.</p>
          </div>
        )}
        {carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <p className="text-sm">Carregando artigos...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: AVISOS E COMUNICADOS — por condomínio
// ════════════════════════════════════════════
const PUBLICOS = [
  { value: "TODOS", label: "Todos" },
  { value: "MORADORES", label: "Moradores" },
  { value: "FUNCIONARIOS", label: "Funcionários" },
];
const PUBLICO_LABEL = Object.fromEntries(PUBLICOS.map((p) => [p.value, p.label]));

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
      setErro("Informe um período de exibição válido.");
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
      setErro(err.response?.data?.mensagem || err.response?.data?.message || "Erro ao salvar aviso.");
    }
  };

  const excluir = async (aviso) => {
    const ok = await confirm({
      titulo: "Excluir aviso",
      mensagem: `Tem certeza que deseja excluir "${aviso.titulo}"? Essa ação não pode ser desfeita.`,
      confirmarTexto: "Sim, excluir",
      cancelarTexto: "Cancelar",
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
        Seu usuário não está vinculado a um condomínio, então não há avisos para gerenciar.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        {!criando && !editando && (
          <Botao onClick={() => { setCriando(true); setForm(AVISO_INICIAL); setErro(""); }}>
            <span className="flex items-center gap-2">
              <Icone name="add" className="text-lg" /> Novo Aviso
            </span>
          </Botao>
        )}
      </div>

      {(criando || editando) && (
        <div className="glass-panel rounded-2xl p-6 space-y-5">
          <h2 className="font-headline text-xl font-bold text-on-surface">
            {editando ? "Editar Aviso" : "Novo Aviso"}
          </h2>
          <form onSubmit={salvar} className="space-y-4">
            <Campo label="Título" name="titulo" value={form.titulo} onChange={handleForm} placeholder="Ex: Manutenção da piscina" required />
            <TextArea label="Mensagem" name="mensagem" value={form.mensagem} onChange={handleForm} rows={5} placeholder="Escreva o comunicado..." required />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Início da exibição</label>
                <input type="date" name="dataInicio" value={form.dataInicio} onChange={handleForm} required className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Fim da exibição</label>
                <input type="date" name="dataFim" value={form.dataFim} onChange={handleForm} required className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Público-alvo</label>
                <select name="publicoAlvo" value={form.publicoAlvo} onChange={handleForm} className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none">
                  {PUBLICOS.map((p) => (<option key={p.value} value={p.value}>{p.label}</option>))}
                </select>
              </div>
            </div>
            <Campo label="Autor" name="autor" value={form.autor} onChange={handleForm} placeholder="Nome do autor (opcional)" />
            <div className="flex items-center gap-3">
              <input type="checkbox" id="aviso-publicado" name="publicado" checked={form.publicado} onChange={handleForm} className="w-4 h-4 accent-primary rounded" />
              <label htmlFor="aviso-publicado" className="text-sm text-on-surface-variant">Publicar (exibir aos moradores dentro do período)</label>
            </div>
            {erro && <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>}
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => { setCriando(false); setEditando(null); setForm(AVISO_INICIAL); setErro(""); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer">Cancelar</button>
              <Botao type="submit">{editando ? "Salvar alterações" : "Criar aviso"}</Botao>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { label: "Total de avisos", valor: avisos.length, icon: "campaign", color: "primary" },
          { label: "Vigentes agora", valor: avisos.filter(vigente).length, icon: "check_circle", color: "primary" },
          { label: "Encerrados / rascunho", valor: avisos.filter((a) => !vigente(a)).length, icon: "history", color: "error" },
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
            <button className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 py-4 text-left cursor-pointer hover:bg-white/5 transition-all" onClick={() => setExpandido(expandido === aviso.id ? null : aviso.id)}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name="campaign" className="text-primary text-xl" />
                </div>
                <div>
                  <p className="font-semibold text-on-surface">{aviso.titulo}</p>
                  <p className="text-xs text-on-surface-variant">
                    {new Date(aviso.dataInicio).toLocaleDateString("pt-BR")} – {new Date(aviso.dataFim).toLocaleDateString("pt-BR")}
                    {" · "}{PUBLICO_LABEL[aviso.publicoAlvo] ?? aviso.publicoAlvo}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${vigente(aviso) ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>{vigente(aviso) ? "Vigente" : aviso.publicado ? "Fora do período" : "Rascunho"}</span>
                <Icone name={expandido === aviso.id ? "expand_less" : "expand_more"} className="text-on-surface-variant text-xl" />
              </div>
            </button>
            {expandido === aviso.id && (
              <div className="px-4 sm:px-6 pb-5 border-t border-white/5 pt-4 space-y-4">
                <div className="bg-surface-container-highest/30 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2">Mensagem</p>
                  <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">{aviso.mensagem}</p>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {aviso.publicado && (
                    <button onClick={() => encerrar(aviso)} className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-error/10 text-error border-error/20 hover:bg-error/20 transition-all cursor-pointer">Encerrar</button>
                  )}
                  <button onClick={() => iniciarEdicao(aviso)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10 transition-all cursor-pointer"><Icone name="edit" className="text-sm" /> Editar</button>
                  <button onClick={() => excluir(aviso)} className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer"><Icone name="delete" className="text-sm" /> Excluir</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {avisos.length === 0 && !carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="campaign" className="text-5xl opacity-30" />
            <p className="text-sm">Nenhum aviso cadastrado.</p>
          </div>
        )}
        {carregando && (
          <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <p className="text-sm">Carregando avisos...</p>
          </div>
        )}
      </div>
    </div>
  );
}
