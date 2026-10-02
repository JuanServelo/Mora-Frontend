// src/pages/usuario/FAQ.jsx
import { useState, useEffect, useCallback } from "react";
import { Icone } from "../../components/icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { conhecimentoApi, perguntasFaqApi, mensagemDeErro } from "../../services/comunicacaoApi";

const CATEGORIA_LABEL = {
  REGRA: "Regra",
  MANUAL: "Manual",
  TUTORIAL: "Tutorial",
  ORIENTACAO_CONVIVENCIA: "Orientação de Convivência",
  FAQ: "FAQ",
};

function dataCurta(iso) {
  return iso ? new Date(iso).toLocaleDateString("pt-BR") : "";
}

/**
 * "Essa resposta ajudou?"
 *
 * Clicar no voto já escolhido retira o voto. Um "não" oferece mandar a dúvida
 * para a administração — é quando a FAQ falhou que a pergunta faz sentido.
 */
function AvaliacaoArtigo({ artigo, meuVoto, aoVotar, aoPerguntar }) {
  const [enviando, setEnviando] = useState(false);

  async function votar(util) {
    if (enviando) return;
    setEnviando(true);
    try {
      await aoVotar(artigo.id, meuVoto === util ? null : util);
    } finally {
      setEnviando(false);
    }
  }

  const botao = (util, icone, rotulo) => {
    const ativo = meuVoto === util;
    return (
      <button
        type="button"
        onClick={() => votar(util)}
        disabled={enviando}
        aria-pressed={ativo}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-60
          ${ativo
            ? util ? "bg-primary/15 text-primary" : "bg-error/15 text-error"
            : "bg-surface-container-highest/40 text-on-surface-variant hover:bg-veu/10"}`}
      >
        <Icone name={icone} className="text-base" />
        {rotulo}
      </button>
    );
  };

  return (
    <div className="mt-5 pt-4 border-t border-veu/5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-on-surface-variant mr-1">Essa resposta ajudou?</span>
        {botao(true, "thumb_up", "Sim")}
        {botao(false, "thumb_down", "Não")}
        {meuVoto === true && (
          <span className="text-xs text-primary ml-1">Obrigado pelo retorno!</span>
        )}
      </div>

      {meuVoto === false && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-veu/5 px-4 py-3">
          <p className="flex-1 text-xs text-on-surface-variant">
            Que pena. Conte para a administração o que ficou faltando.
          </p>
          <button
            type="button"
            onClick={() => aoPerguntar(`Sobre "${artigo.titulo}": `, artigo.categoria)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition cursor-pointer"
          >
            <Icone name="contact_support" className="text-base" />
            Enviar minha dúvida
          </button>
        </div>
      )}
    </div>
  );
}

function ItemFAQ({ artigo, meuVoto, aoVotar, aoPerguntar }) {
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
        className="w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 text-left cursor-pointer hover:bg-veu/5 transition-colors"
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
        <div className="px-4 sm:px-6 pb-5 border-t border-veu/5">
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

          <AvaliacaoArtigo
            artigo={artigo}
            meuVoto={meuVoto}
            aoVotar={aoVotar}
            aoPerguntar={aoPerguntar}
          />
        </div>
      )}
    </div>
  );
}

/** Formulário para mandar a dúvida à administração. */
function ModalPergunta({ inicial, aoFechar, aoEnviar }) {
  const [texto, setTexto] = useState(inicial.texto ?? "");
  const [categoria, setCategoria] = useState(inicial.categoria ?? "");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const tamanho = texto.trim().length;

  async function enviar(e) {
    e.preventDefault();
    if (tamanho < 10) {
      setErro("Escreva a sua dúvida com pelo menos 10 caracteres.");
      return;
    }
    setEnviando(true);
    setErro("");
    try {
      await aoEnviar({ texto: texto.trim(), categoria: categoria || null });
    } catch (err) {
      setErro(mensagemDeErro(err, "Não foi possível enviar a pergunta."));
      setEnviando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={aoFechar}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={enviar}
        className="glass-panel rounded-3xl w-full max-w-lg p-6 space-y-4 max-h-[90dvh] overflow-y-auto"
      >
        <div>
          <h2 className="font-headline text-xl font-bold text-on-surface">Enviar pergunta</h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Sua dúvida vai para a administração do condomínio. A resposta aparece
            em <strong>Minhas perguntas</strong>.
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-on-surface-variant">Sua dúvida</span>
          <textarea
            autoFocus
            required
            rows={5}
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: Posso usar a churrasqueira em dia de semana?"
            className="mt-1 w-full resize-none bg-surface-container-highest/40 border-none rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="block text-right text-[11px] text-on-surface-variant/60 tabular-nums">
            {tamanho}/1000
          </span>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-on-surface-variant">Assunto (opcional)</span>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="mt-1 w-full bg-surface-container-highest/40 border-none rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
          >
            <option value="">Não sei / outro</option>
            {Object.entries(CATEGORIA_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>{rotulo}</option>
            ))}
          </select>
        </label>

        {erro && <p className="text-xs text-error">{erro}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={aoFechar}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={enviando}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-50 cursor-pointer"
          >
            {enviando ? "Enviando…" : "Enviar pergunta"}
          </button>
        </div>
      </form>
    </div>
  );
}

function MinhasPerguntas({ perguntas, carregando, aoExcluir, aoPerguntar }) {
  if (carregando) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (perguntas.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-6 sm:p-10 text-center space-y-4">
        <Icone name="contact_support" className="text-4xl text-on-surface-variant" />
        <p className="text-sm text-on-surface-variant">
          Você ainda não enviou nenhuma pergunta.
        </p>
        <button
          onClick={() => aoPerguntar()}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition cursor-pointer"
        >
          <Icone name="add" className="text-lg" />
          Enviar pergunta
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {perguntas.map((p) => {
        const respondida = p.status === "RESPONDIDA";
        return (
          <div key={p.id} className="glass-panel rounded-2xl p-4 sm:p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-on-surface whitespace-pre-wrap break-words">
                  {p.texto}
                </p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Enviada em {dataCurta(p.criadoEm)}
                  {p.categoria && ` · ${CATEGORIA_LABEL[p.categoria] ?? p.categoria}`}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${
                  respondida ? "bg-primary/10 text-primary" : "bg-tertiary/10 text-tertiary"
                }`}
              >
                {respondida ? "Respondida" : "Aguardando resposta"}
              </span>
            </div>

            {respondida ? (
              <div className="rounded-xl bg-surface-container-highest/30 p-4 space-y-2">
                <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                  {p.resposta}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {p.respondidaPor ? `${p.respondidaPor} · ` : ""}
                  {dataCurta(p.respondidaEm)}
                  {p.artigoId && (
                    <span className="inline-flex items-center gap-1 ml-2 text-primary font-semibold">
                      <Icone name="public" className="text-sm" />
                      Publicada na FAQ
                    </span>
                  )}
                </p>
              </div>
            ) : (
              <div className="flex justify-end">
                <button
                  onClick={() => aoExcluir(p)}
                  className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition cursor-pointer"
                >
                  <Icone name="delete" className="text-sm" />
                  Excluir
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function FAQ() {
  const toast = useToast();
  const confirm = useConfirm();

  const [aba, setAba] = useState("faq");
  const [artigos, setArtigos] = useState([]);
  const [votos, setVotos] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [busca, setBusca] = useState("");
  const [categoriaAtiva, setCategoriaAtiva] = useState("TODAS");

  const [perguntas, setPerguntas] = useState([]);
  const [carregandoPerguntas, setCarregandoPerguntas] = useState(true);
  const [perguntando, setPerguntando] = useState(null);

  useEffect(() => {
    conhecimentoApi
      .listarPublicados()
      .then(({ data }) => setArtigos(data))
      .catch(() => setErro("Não foi possível carregar os artigos."))
      .finally(() => setCarregando(false));

    // Sem os votos a FAQ continua funcionando: só não mostra o que já foi votado.
    conhecimentoApi
      .avaliacoes()
      .then(({ data }) =>
        setVotos(Object.fromEntries((data ?? []).map((a) => [a.artigoId, a.meuVoto]))),
      )
      .catch(() => {});
  }, []);

  const carregarPerguntas = useCallback(() => {
    perguntasFaqApi
      .minhas()
      .then(({ data }) => setPerguntas(data ?? []))
      .catch(() => setPerguntas([]))
      .finally(() => setCarregandoPerguntas(false));
  }, []);

  useEffect(() => { carregarPerguntas(); }, [carregarPerguntas]);

  async function votar(artigoId, util) {
    try {
      if (util === null) await conhecimentoApi.removerAvaliacao(artigoId);
      else await conhecimentoApi.avaliar(artigoId, util);
      setVotos((v) => ({ ...v, [artigoId]: util }));
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível registrar sua avaliação."));
    }
  }

  function abrirPergunta(texto = "", categoria = null) {
    setPerguntando({ texto, categoria });
  }

  async function enviarPergunta(dados) {
    await perguntasFaqApi.perguntar(dados);
    setPerguntando(null);
    toast.success("Pergunta enviada! A resposta vai aparecer em Minhas perguntas.");
    carregarPerguntas();
    setAba("minhas");
  }

  async function excluirPergunta(pergunta) {
    const ok = await confirm({
      titulo: "Excluir pergunta",
      mensagem: "A pergunta ainda não foi respondida. Deseja mesmo excluí-la?",
      confirmarTexto: "Sim, excluir",
      cancelarTexto: "Cancelar",
      variante: "danger",
    });
    if (!ok) return;
    try {
      await perguntasFaqApi.excluir(pergunta.id);
      setPerguntas((prev) => prev.filter((p) => p.id !== pergunta.id));
    } catch (err) {
      toast.error(mensagemDeErro(err, "Não foi possível excluir a pergunta."));
    }
  }

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
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
            Perguntas Frequentes
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Encontre respostas para as dúvidas mais comuns do condomínio.
          </p>
        </div>
        <button
          onClick={() => abrirPergunta(busca)}
          className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition cursor-pointer"
        >
          <Icone name="contact_support" className="text-lg" />
          Enviar pergunta
        </button>
      </div>

      {/* Abas */}
      <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-full sm:w-fit mb-6">
        {[
          { id: "faq", label: "Perguntas frequentes", icon: "quiz" },
          { id: "minhas", label: "Minhas perguntas", icon: "forum" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setAba(tab.id)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
              aba === tab.id
                ? "bg-primary/15 text-primary"
                : "text-on-surface-variant hover:text-on-surface hover:bg-veu/5"
            }`}
          >
            <Icone name={tab.icon} className="text-lg" />
            {tab.label}
            {tab.id === "minhas" && perguntas.length > 0 && (
              <span className="min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center">
                {perguntas.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {aba === "minhas" ? (
        <MinhasPerguntas
          perguntas={perguntas}
          carregando={carregandoPerguntas}
          aoExcluir={excluirPergunta}
          aoPerguntar={abrirPergunta}
        />
      ) : (
        <>
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
                    : "bg-surface-container-highest/40 text-on-surface-variant hover:bg-veu/10"
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
        <div className="glass-panel rounded-2xl p-6 sm:p-8 text-center">
          <Icone name="error_outline" className="text-3xl text-tertiary mb-2" />
          <p className="text-sm text-on-surface-variant">{erro}</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="glass-panel rounded-2xl p-5 sm:p-8 sm:p-12 text-center space-y-4">
          <Icone name="search_off" className="text-4xl text-on-surface-variant" />
          <p className="text-sm text-on-surface-variant">
            {busca ? "Nenhum resultado para sua busca." : "Nenhum artigo publicado ainda."}
          </p>
          <button
            onClick={() => abrirPergunta(busca)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition cursor-pointer"
          >
            <Icone name="contact_support" className="text-lg" />
            Perguntar à administração
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((artigo) => (
            <ItemFAQ
              key={artigo.id}
              artigo={artigo}
              meuVoto={votos[artigo.id] ?? null}
              aoVotar={votar}
              aoPerguntar={abrirPergunta}
            />
          ))}

          <div className="rounded-2xl border border-dashed border-veu/15 p-5 flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <Icone name="contact_support" className="text-2xl text-on-surface-variant" />
            <p className="flex-1 text-sm text-on-surface-variant">
              Não encontrou o que procurava? Envie sua dúvida para a administração.
            </p>
            <button
              onClick={() => abrirPergunta(busca)}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-primary bg-primary/10 hover:bg-primary/20 transition cursor-pointer"
            >
              Enviar pergunta
            </button>
          </div>
        </div>
      )}
        </>
      )}
      </div>

      {perguntando && (
        <ModalPergunta
          inicial={perguntando}
          aoFechar={() => setPerguntando(null)}
          aoEnviar={enviarPergunta}
        />
      )}
    </div>
  );
}
