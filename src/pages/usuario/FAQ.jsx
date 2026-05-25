// src/pages/usuario/FAQ.jsx
import { useState, useEffect } from "react";
import { Icone } from "../../components/icones/Icone";
import { conhecimentoApi } from "../../services/portariaApi";

const CATEGORIA_LABEL = {
  GERAL: "Geral",
  MANUTENCAO: "Manutenção",
  SEGURANCA: "Segurança",
  FINANCEIRO: "Financeiro",
  CONVIVENCIA: "Convivência",
  RESERVAS: "Reservas",
  OUTROS: "Outros",
};

function ItemFAQ({ artigo }) {
  const [aberto, setAberto] = useState(false);

  const tags = artigo.tags
    ? artigo.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div
      className="glass-panel rounded-2xl overflow-hidden transition-all duration-200"
    >
      <button
        onClick={() => setAberto((a) => !a)}
        className="w-full flex items-center gap-4 px-6 py-4 text-left cursor-pointer hover:bg-white/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icone name="help_outline" className="text-primary text-lg" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface leading-snug">
            {artigo.titulo}
          </p>
          {artigo.categoria && (
            <span className="text-xs text-on-surface-variant">
              {CATEGORIA_LABEL[artigo.categoria] ?? artigo.categoria}
            </span>
          )}
        </div>
        <Icone
          name="expand_more"
          className={`text-on-surface-variant shrink-0 transition-transform duration-200 ${
            aberto ? "rotate-180" : ""
          }`}
        />
      </button>

      {aberto && (
        <div className="px-6 pb-5 border-t border-white/5">
          <p className="text-sm text-on-surface-variant leading-relaxed mt-4 whitespace-pre-wrap">
            {artigo.conteudo}
          </p>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs px-2.5 py-1 rounded-full bg-surface-container-highest/50 text-on-surface-variant"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FAQ() {
  const [artigos, setArtigos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("TODAS");

  useEffect(() => {
    conhecimentoApi
      .listarPublicados()
      .then(({ data }) => setArtigos(data))
      .catch(() => setErro("Não foi possível carregar os artigos."))
      .finally(() => setCarregando(false));
  }, []);

  const categorias = [
    "TODAS",
    ...Array.from(new Set(artigos.map((a) => a.categoria).filter(Boolean))),
  ];

  const filtrados = artigos.filter((a) => {
    const matchCategoria =
      categoriaAtiva === "TODAS" || a.categoria === categoriaAtiva;
    const matchBusca =
      !busca ||
      a.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      a.conteudo.toLowerCase().includes(busca.toLowerCase());
    return matchCategoria && matchBusca;
  });

  return (
    <div className="max-w-3xl mx-auto px-4 pb-16">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-on-surface">
          Perguntas Frequentes
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Encontre respostas para as dúvidas mais comuns do condomínio.
        </p>
      </div>

      {/* Busca */}
      <div className="relative mb-6">
        <Icone
          name="search"
          className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
        />
        <input
          type="text"
          placeholder="Buscar pergunta..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full bg-surface-container-highest/40 border-none rounded-2xl py-3 pl-11 pr-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
        />
      </div>

      {/* Filtro de categorias */}
      {categorias.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer
                ${
                  categoriaAtiva === cat
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container-highest/40 text-on-surface-variant hover:bg-white/10"
                }`}
            >
              {cat === "TODAS" ? "Todas" : (CATEGORIA_LABEL[cat] ?? cat)}
            </button>
          ))}
        </div>
      )}

      {/* Conteúdo */}
      {carregando ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : erro ? (
        <div className="glass-panel rounded-2xl p-8 text-center">
          <Icone name="error_outline" className="text-3xl text-tertiary mb-2" />
          <p className="text-sm text-on-surface-variant">{erro}</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center">
          <Icone name="search_off" className="text-4xl text-on-surface-variant mb-3" />
          <p className="text-sm text-on-surface-variant">
            {busca ? "Nenhum resultado para sua busca." : "Nenhum artigo publicado ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((artigo) => (
            <ItemFAQ key={artigo.id} artigo={artigo} />
          ))}
        </div>
      )}
    </div>
  );
}
