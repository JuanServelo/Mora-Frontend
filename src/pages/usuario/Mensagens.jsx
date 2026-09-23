// src/pages/usuario/Mensagens.jsx
// Chat morador ↔ administração: caixa de entrada à esquerda, conversa à direita.
import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";
import { chatApi } from "../../services/comunicacaoApi";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { useToast } from "../../contexts/ToastContext";
import { labelPerfil, podeAcessarPortaria } from "../../utils/perfis";
import { tempoRelativo } from "../../utils/notificacoes";

/** Enquanto uma conversa está aberta, ela é recarregada neste intervalo. */
const INTERVALO_MS = 15_000;

export function Mensagens() {
  const { usuario } = useAuth();
  const toast = useToast();
  const { recarregar } = useNotificacoes();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversas, setConversas] = useState([]);
  const [contatos, setContatos] = useState([]);
  const [carregandoLista, setCarregandoLista] = useState(true);
  const [novaConversa, setNovaConversa] = useState(false);

  const ativoId = searchParams.get("com");
  const isAdministracao = podeAcessarPortaria(usuario?.perfil);

  const carregarConversas = useCallback(async () => {
    try {
      const res = await chatApi.conversas();
      setConversas(res.data ?? []);
    } catch {
      toast.error("Não foi possível carregar suas conversas.");
    } finally {
      setCarregandoLista(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarConversas();
    chatApi
      .contatos()
      .then((res) => setContatos(res.data ?? []))
      .catch(() => setContatos([]));
  }, [carregarConversas]);

  function abrirConversa(id) {
    setNovaConversa(false);
    setSearchParams(id ? { com: String(id) } : {});
  }

  const participanteAtivo =
    conversas.find((c) => c.participante?.id === ativoId)?.participante
    ?? contatos.find((c) => c.id === ativoId)
    ?? (ativoId ? { id: ativoId, nome: "Conversa" } : null);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Comunicação
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            {isAdministracao ? "Atendimento" : "Fale com a"}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {isAdministracao ? "por mensagem" : "administração"}
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {isAdministracao
              ? "Conversas diretas com moradores e equipe do condomínio."
              : "Para assuntos pontuais que não justificam abrir uma reclamação formal."}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[20rem_1fr] gap-4 items-start">
          {/* Caixa de entrada — no mobile some quando há conversa aberta */}
          <div className={`${ativoId ? "hidden lg:block" : ""} space-y-3`}>
            <button
              onClick={() => {
                setNovaConversa(true);
                setSearchParams({});
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-all cursor-pointer"
            >
              <Icone name="edit_square" className="text-lg" />
              Nova conversa
            </button>

            <div className="glass-panel rounded-2xl overflow-hidden">
              {carregandoLista && (
                <p className="px-4 py-10 text-center text-sm text-on-surface-variant">Carregando...</p>
              )}

              {!carregandoLista && conversas.length === 0 && (
                <div className="px-4 py-10 text-center flex flex-col items-center gap-2 text-on-surface-variant">
                  <Icone name="forum" className="text-4xl opacity-30" />
                  <p className="text-sm">Nenhuma conversa ainda.</p>
                </div>
              )}

              {conversas.map((c) => {
                const ativo = c.participante?.id === ativoId;
                return (
                  <button
                    key={c.participante?.id}
                    onClick={() => abrirConversa(c.participante?.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-white/5 last:border-b-0 transition-colors cursor-pointer
                      ${ativo ? "bg-primary/10" : "hover:bg-white/5"}`}
                  >
                    <Avatar usuario={c.participante} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {c.participante?.nome}
                        </p>
                        <span className="text-[11px] text-on-surface-variant/70 shrink-0 ml-auto">
                          {tempoRelativo(c.ultimaEm)}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant truncate mt-0.5">
                        {c.ultimaMinha ? "Você: " : ""}
                        {c.ultimaMensagem}
                      </p>
                    </div>
                    {c.naoLidas > 0 && (
                      <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-primary text-on-primary text-[11px] font-bold flex items-center justify-center shrink-0">
                        {c.naoLidas > 99 ? "99+" : c.naoLidas}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Painel da direita */}
          {novaConversa ? (
            <SeletorContato
              contatos={contatos}
              jaConversados={new Set(conversas.map((c) => c.participante?.id))}
              onEscolher={abrirConversa}
              onCancelar={() => setNovaConversa(false)}
              isAdministracao={isAdministracao}
            />
          ) : ativoId ? (
            <Conversa
              key={ativoId}
              participante={participanteAtivo}
              onVoltar={() => abrirConversa(null)}
              onMudou={() => {
                carregarConversas();
                recarregar();
              }}
            />
          ) : (
            <div className="hidden lg:flex glass-panel rounded-2xl min-h-[28rem] flex-col items-center justify-center gap-3 text-on-surface-variant px-6 text-center">
              <Icone name="chat" className="text-5xl opacity-30" />
              <p className="text-sm max-w-xs">
                Escolha uma conversa à esquerda ou comece uma nova.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
function Avatar({ usuario }) {
  const inicial = usuario?.nome?.trim()?.[0]?.toUpperCase() ?? "?";
  return usuario?.fotoUrl ? (
    <img
      src={usuario.fotoUrl}
      alt=""
      className="w-9 h-9 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="w-9 h-9 shrink-0 rounded-full bg-primary/15 flex items-center justify-center">
      <span className="text-sm font-bold text-primary">{inicial}</span>
    </div>
  );
}

// ════════════════════════════════════════════
// SELETOR DE CONTATO
// ════════════════════════════════════════════
function SeletorContato({ contatos, jaConversados, onEscolher, onCancelar, isAdministracao }) {
  const [busca, setBusca] = useState("");

  const filtrados = contatos.filter((c) =>
    (c.nome ?? "").toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <div className="glass-panel rounded-2xl overflow-hidden min-h-[28rem] flex flex-col">
      <div className="px-4 sm:px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <button
          onClick={onCancelar}
          aria-label="Cancelar"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all cursor-pointer"
        >
          <Icone name="arrow_back" className="text-lg" />
        </button>
        <div>
          <p className="text-sm font-bold text-on-surface">Nova conversa</p>
          <p className="text-xs text-on-surface-variant">
            {isAdministracao
              ? "Escolha quem você quer atender."
              : "O chat é com a administração: síndico ou portaria."}
          </p>
        </div>
      </div>

      <div className="px-4 sm:px-5 py-3 border-b border-white/5">
        <div className="relative">
          <Icone
            name="search"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar pelo nome..."
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-2.5 pl-10 pr-4 text-sm text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtrados.length === 0 && (
          <div className="px-4 py-12 text-center flex flex-col items-center gap-2 text-on-surface-variant">
            <Icone name="person_off" className="text-4xl opacity-30" />
            <p className="text-sm">
              {contatos.length === 0
                ? "Nenhum contato disponível no seu condomínio."
                : "Ninguém com esse nome."}
            </p>
          </div>
        )}

        {filtrados.map((c) => (
          <button
            key={c.id}
            onClick={() => onEscolher(c.id)}
            className="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <Avatar usuario={c} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface truncate">{c.nome}</p>
              <p className="text-xs text-on-surface-variant">
                {labelPerfil(c.perfil)}
                {c.bloco || c.apartamento
                  ? ` · ${[c.bloco, c.apartamento].filter(Boolean).join(" ")}`
                  : ""}
              </p>
            </div>
            {jaConversados.has(c.id) && (
              <span className="text-[11px] text-on-surface-variant/70 shrink-0">já conversaram</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// CONVERSA
// ════════════════════════════════════════════
function Conversa({ participante, onVoltar, onMudou }) {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const fimRef = useRef(null);
  const toast = useToast();

  const outroId = participante?.id;

  const carregar = useCallback(async ({ silencioso = false } = {}) => {
    if (!outroId) return;
    if (!silencioso) setCarregando(true);
    try {
      const res = await chatApi.buscarConversa(outroId);
      setMensagens(res.data ?? []);
    } catch {
      if (!silencioso) toast.error("Não foi possível carregar a conversa.");
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }, [outroId, toast]);

  // Abrir a conversa já dá as mensagens por lidas — é o que o usuário fez.
  useEffect(() => {
    if (!outroId) return;
    let cancelado = false;

    (async () => {
      await carregar();
      if (cancelado) return;
      try {
        await chatApi.marcarConversaLida(outroId);
        onMudou();
      } catch {
        // A conversa abre de qualquer forma; o contador se corrige no polling.
      }
    })();

    const id = setInterval(() => carregar({ silencioso: true }), INTERVALO_MS);
    return () => {
      cancelado = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outroId]);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [mensagens]);

  async function enviar(e) {
    e.preventDefault();
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    try {
      const res = await chatApi.enviar(outroId, conteudo);
      setMensagens((prev) => [...prev, res.data]);
      setTexto("");
      onMudou();
    } catch (err) {
      toast.error(
        err.response?.data?.erro
          ?? err.response?.data?.mensagem
          ?? "Não foi possível enviar a mensagem.",
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl overflow-hidden min-h-[28rem] flex flex-col">
      <div className="px-4 sm:px-5 py-4 border-b border-white/5 flex items-center gap-3">
        <button
          onClick={onVoltar}
          aria-label="Voltar para a lista"
          className="lg:hidden w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition-all cursor-pointer"
        >
          <Icone name="arrow_back" className="text-lg" />
        </button>
        <Avatar usuario={participante} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-on-surface truncate">{participante?.nome}</p>
          {participante?.perfil && (
            <p className="text-xs text-on-surface-variant">{labelPerfil(participante.perfil)}</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 max-h-[26rem]">
        {carregando && (
          <div className="flex justify-center py-10">
            <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}

        {!carregando && mensagens.length === 0 && (
          <div className="py-12 text-center flex flex-col items-center gap-2 text-on-surface-variant">
            <Icone name="waving_hand" className="text-4xl opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda. Escreva a primeira.</p>
          </div>
        )}

        {mensagens.map((m) => (
          <div key={m.id} className={`flex ${m.minha ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                m.minha
                  ? "bg-primary/15 text-on-surface rounded-br-sm"
                  : "bg-surface-container-highest/50 text-on-surface rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.texto}</p>
              <p className="text-[11px] text-on-surface-variant/70 mt-1 flex items-center gap-1 justify-end">
                {new Date(m.enviadoEm).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {m.minha && (
                  <Icone
                    name={m.lida ? "done_all" : "done"}
                    className={`text-sm ${m.lida ? "text-primary" : ""}`}
                  />
                )}
              </p>
            </div>
          </div>
        ))}
        <div ref={fimRef} />
      </div>

      <form onSubmit={enviar} className="px-4 sm:px-5 py-3 border-t border-white/5 flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            // Enter envia; Shift+Enter quebra linha — o esperado num chat.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              enviar(e);
            }
          }}
          rows={1}
          maxLength={4000}
          placeholder="Escreva uma mensagem..."
          className="flex-1 resize-none bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-sm text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all max-h-32"
        />
        <button
          type="submit"
          disabled={!texto.trim() || enviando}
          aria-label="Enviar mensagem"
          className="w-11 h-11 shrink-0 rounded-xl bg-primary text-on-primary flex items-center justify-center hover:opacity-90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Icone name="send" className="text-lg" />
        </button>
      </form>
    </div>
  );
}
