// src/pages/usuario/Conversas.jsx
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { comunicacaoApi } from "../../services/comunicacaoApi";
import { FotoUsuario } from "../../components/avatar/FotoUsuario";
import { PERFIS } from "../../utils/perfis";

const PERFIS_GESTAO = [PERFIS.ADMIN_GERAL, PERFIS.ADMIN_SINDICO];

/**
 * Faz o elemento ocupar daqui até o fim da janela.
 *
 * O deslocamento do topo não é fixo: o AppLayout escolhe o invólucro pelo
 * PERFIL, e não pela rota — admin e porteiro ganham barra lateral, com uma
 * barra superior que só existe no celular; os demais ganham a navbar, que
 * reserva 6rem. Somam-se a isso os cabeçalhos da própria página.
 *
 * Medir o topo real cobre os quatro casos sem número mágico nenhum, e continua
 * certo se algum desses invólucros mudar de altura depois. Escreve direto no
 * nó em vez de passar por estado: é sincronizar o DOM com a janela, que é
 * justamente para o que serve um efeito — e não redesenha a árvore.
 */
function useAlturaRestante(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ajustar = () => {
      const topo = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `calc(100dvh - ${Math.max(0, Math.round(topo))}px)`;
    };

    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [ref]);
}

/**
 * Conversas do condomínio — a mesma tela para o morador e para o síndico.
 *
 * Não há duas versões porque o serviço já decide o que cada um enxerga: o
 * morador vê as conversas em que participa; a gestão vê também as endereçadas à
 * administração, mesmo as que ninguém da gestão abriu ainda. Duplicar a tela
 * por perfil faria a regra existir em dois lugares.
 *
 * O formato é o de um cliente de mensagens: lista fixa à esquerda, conversa à
 * direita, e a rolagem acontece dentro de cada painel em vez de na página. É o
 * que permite o campo de escrever ficar sempre visível, sem perseguir o fim da
 * conversa a cada mensagem nova.
 */
export function Conversas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const { buscar: recarregarSino } = useNotificacoes();

  const ehGestao = PERFIS_GESTAO.includes(usuario?.perfil);

  const caixa = useRef(null);
  useAlturaRestante(caixa);

  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [compondo, setCompondo] = useState(false);
  const [busca, setBusca] = useState("");

  const carregar = useCallback(async () => {
    try {
      const { data } = await comunicacaoApi.listarConversas();
      setConversas(data.conversas ?? []);
      setErro("");
    } catch {
      setErro("Não foi possível carregar as conversas.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Precisa ser estável: a Thread depende dela, e uma arrow nova a cada render
  // faria o efeito de lá disparar sem parar.
  const aoMudar = useCallback(() => {
    carregar();
    recarregarSino();
  }, [carregar, recarregarSino]);

  const selecionada = id ? Number(id) : null;

  // Filtro só de tela, sobre a lista que já veio: é busca dentro do que está
  // em mãos, não um recorte novo de dados.
  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return conversas;
    return conversas.filter(
      (c) =>
        c.assunto?.toLowerCase().includes(q) ||
        c.resumo?.toLowerCase().includes(q),
    );
  }, [conversas, busca]);

  return (
    <div
      ref={caixa}
      // A altura em CSS é o palpite até a medição entrar; o valor final é
      // escrito no nó, antes da primeira pintura.
      className="w-full h-[calc(100dvh-6rem)] flex flex-col p-3 sm:p-4 lg:p-6 gap-3 lg:gap-4"
    >
      <header className="flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <h1 className="font-headline text-2xl lg:text-3xl font-bold text-on-surface truncate">
            Conversas
          </h1>
          <p className="text-on-surface-variant text-xs lg:text-sm">
            {ehGestao
              ? "Chamados dos moradores e conversas diretas"
              : "Fale com a administração do condomínio"}
          </p>
        </div>
        <button
          onClick={() => setCompondo(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition cursor-pointer"
        >
          <Icone name="edit_square" className="text-lg" />
          <span className="hidden sm:inline">Nova conversa</span>
        </button>
      </header>

      {erro && (
        <div className="glass-panel rounded-2xl p-4 flex items-center gap-3 text-on-surface-variant shrink-0">
          <Icone name="error" className="text-error" />
          {erro}
        </div>
      )}

      {/*
        30 / 70 a partir de lg. Abaixo disso as duas colunas não cabem lado a
        lado, e a tela alterna entre lista e conversa, como um app de celular.
        `min-h-0` é o que permite a rolagem interna: sem ele, um filho alto
        estica o item de grid e quem rola passa a ser a página.
      */}
      <div className="flex-1 min-h-0 grid lg:grid-cols-[30%_70%] rounded-2xl overflow-hidden border border-veu/8 bg-surface-container-lowest/60">
        <aside
          className={`min-h-0 flex-col border-veu/8 lg:border-r bg-surface-container-low/50
            ${selecionada ? "hidden lg:flex" : "flex"}`}
        >
          <div className="p-3 shrink-0 border-b border-veu/5">
            <div className="relative">
              <Icone
                name="search"
                className="absolute left-3 top-1/2 -translate-y-1/2 text-base text-on-surface-variant/60 pointer-events-none"
              />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar conversa"
                className="w-full bg-surface-container-highest/40 border-none rounded-xl pl-10 pr-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <Lista
            conversas={filtradas}
            carregando={carregando}
            selecionada={selecionada}
            ehGestao={ehGestao}
            temBusca={Boolean(busca.trim())}
            aoEscolher={(c) => navigate(`/conversas/${c.id}`)}
          />
        </aside>

        <section className={`min-h-0 flex-col ${selecionada ? "flex" : "hidden lg:flex"}`}>
          {selecionada ? (
            <Thread
              key={selecionada}
              conversaId={selecionada}
              usuario={usuario}
              ehGestao={ehGestao}
              aoMudar={aoMudar}
              aoVoltar={() => navigate("/conversas")}
            />
          ) : (
            <Vazio ehGestao={ehGestao} />
          )}
        </section>
      </div>

      {compondo && (
        <ModalNova
          ehGestao={ehGestao}
          aoFechar={() => setCompondo(false)}
          aoCriar={(conversa) => {
            setCompondo(false);
            carregar();
            recarregarSino();
            navigate(`/conversas/${conversa.id}`);
          }}
        />
      )}
    </div>
  );
}

/* ── lista ─────────────────────────────────────────────────────────────── */

function Lista({ conversas, carregando, selecionada, ehGestao, temBusca, aoEscolher }) {
  if (carregando) {
    return <p className="p-4 text-sm text-on-surface-variant">Carregando…</p>;
  }

  if (conversas.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
        <Icone name={temBusca ? "search_off" : "forum"} className="text-3xl text-on-surface-variant/30" />
        <p className="text-sm text-on-surface-variant">
          {temBusca
            ? "Nenhuma conversa com esse termo."
            : ehGestao
              ? "Nenhum chamado aberto."
              : "Você ainda não abriu nenhuma conversa."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      {conversas.map((c) => {
        const ativa = selecionada === c.id;
        // O serviço já devolve o outro lado na perspectiva de quem pediu — e
        // não quem criou a conversa. Numa conversa direta aberta pela própria
        // gestão, quem criou é ela mesma; o que identifica é o morador.
        const outro = c.contraparte;

        return (
          <button
            key={c.id}
            onClick={() => aoEscolher(c)}
            className={`w-full text-left flex items-start gap-3 px-3 py-3 border-b border-veu/[0.04] transition cursor-pointer
              ${ativa ? "bg-primary/12" : "hover:bg-veu/[0.04]"}`}
          >
            <Avatar tipo={c.tipo} pessoa={outro} />

            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <p className={`flex-1 min-w-0 truncate text-sm ${c.naoLidas > 0 ? "font-bold text-on-surface" : "font-semibold text-on-surface/90"}`}>
                  {outro ? outro.nome : c.assunto}
                </p>
                <span className={`shrink-0 text-[11px] tabular-nums ${c.naoLidas > 0 ? "text-primary font-semibold" : "text-on-surface-variant/60"}`}>
                  {horaCurta(c.ultimaMensagemEm ?? c.criadaEm)}
                </span>
              </div>

              {/* Com o nome no topo, o assunto ganha a linha do meio: é o que
                  diz do que se trata o chamado sem precisar abri-lo. */}
              {outro && (
                <p className="truncate text-xs text-on-surface/70 mt-0.5">
                  {outro.unidade && (
                    <span className="text-on-surface-variant/70">{outro.unidade} · </span>
                  )}
                  {c.assunto}
                </p>
              )}

              <div className="flex items-center gap-2 mt-0.5">
                <p className="flex-1 min-w-0 truncate text-xs text-on-surface-variant/80">
                  {c.resumo ?? <span className="italic">sem mensagem visível</span>}
                </p>
                {c.encerradaEm && (
                  <Icone name="lock" className="shrink-0 text-xs text-on-surface-variant/40" />
                )}
                {c.naoLidas > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1.5 rounded-full bg-primary text-on-primary text-[10px] font-bold flex items-center justify-center">
                    {c.naoLidas}
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Avatar da conversa: a foto de quem a abriu, quando conhecida.
 *
 * O nome e a foto só chegam para a gestão: a listagem que o morador alcança é
 * recortada na unidade dele e não inclui a administração. Para ele a
 * contraparte é sempre "a administração", e o ícone de atendimento diz isso
 * melhor que um rosto qualquer.
 */
function Avatar({ tipo, pessoa, tamanho = "w-11 h-11" }) {
  const administracao = tipo === "ADMINISTRACAO";
  const cor = administracao ? "bg-primary/20 text-primary" : "bg-tertiary/20 text-tertiary";

  return (
    <div className={`${tamanho} shrink-0 rounded-full flex items-center justify-center overflow-hidden ${cor}`}>
      {pessoa ? (
        <FotoUsuario usuario={pessoa} iconeVazio="person" classeIcone="text-xl" />
      ) : (
        <Icone name={administracao ? "support_agent" : "person"} className="text-xl" />
      )}
    </div>
  );
}

function Vazio({ ehGestao }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Icone name="chat_bubble" className="text-primary text-4xl" />
      </div>
      <div className="max-w-sm">
        <p className="font-headline text-lg font-bold text-on-surface mb-1">
          Escolha uma conversa
        </p>
        <p className="text-sm text-on-surface-variant leading-relaxed">
          {ehGestao
            ? "Os chamados dos moradores chegam aqui sem ninguém precisar encaminhar."
            : "Você fala com a administração, não com uma pessoa — a conversa continua mesmo se o síndico mudar."}
        </p>
      </div>
    </div>
  );
}

/* ── conversa aberta ───────────────────────────────────────────────────── */

function Thread({ conversaId, usuario, ehGestao, aoMudar, aoVoltar }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const fim = useRef(null);

  const carregar = useCallback(async () => {
    try {
      const { data } = await comunicacaoApi.verConversa(conversaId);
      setDados(data);
      setErro("");
      // Abrir a conversa marca como lida no servidor. Avisar aqui, junto da
      // busca, mantém lista e sino em dia sem um efeito extra reagindo ao
      // estado que a própria busca acabou de escrever.
      aoMudar();
    } catch (e) {
      setErro(e.response?.data?.mensagem ?? "Não foi possível abrir a conversa.");
    }
  }, [conversaId, aoMudar]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [dados?.mensagens?.length]);

  async function enviar(e) {
    e.preventDefault();
    const corpo = texto.trim();
    if (!corpo || enviando) return;

    setEnviando(true);
    try {
      await comunicacaoApi.responder(conversaId, corpo);
      setTexto("");
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.mensagem ?? "Não foi possível enviar.");
    } finally {
      setEnviando(false);
    }
  }

  async function encerrar() {
    try {
      await comunicacaoApi.encerrarConversa(conversaId);
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.mensagem ?? "Não foi possível encerrar.");
    }
  }

  if (erro && !dados) {
    return (
      <div className="flex-1 flex items-center justify-center gap-3 text-on-surface-variant p-6">
        <Icone name="error" className="text-error" />
        {erro}
      </div>
    );
  }

  if (!dados) {
    return <p className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">Carregando…</p>;
  }

  const { conversa, mensagens } = dados;
  const encerrada = Boolean(conversa.encerradaEm);
  const blocos = agruparPorDia(mensagens);
  const outro = conversa.contraparte;

  return (
    <>
      <header className="shrink-0 flex items-center gap-3 px-3 lg:px-5 py-3 border-b border-veu/8 bg-surface-container-low/70">
        <button
          onClick={aoVoltar}
          aria-label="Voltar para a lista"
          className="lg:hidden -ml-1 p-1.5 rounded-lg text-on-surface-variant hover:bg-veu/5 cursor-pointer"
        >
          <Icone name="arrow_back" />
        </button>

        <Avatar tipo={conversa.tipo} pessoa={outro} tamanho="w-10 h-10" />

        <div className="min-w-0 flex-1">
          {/* Para a gestão o título é a pessoa, e o assunto vira a linha de
              apoio — é o nome que situa quem está atendendo vários chamados.
              Para o morador não há pessoa: o título continua sendo o assunto. */}
          <h2 className="font-semibold text-on-surface truncate leading-tight">
            {outro ? outro.nome : conversa.assunto}
          </h2>
          <p className="text-[11px] text-on-surface-variant truncate">
            {outro
              ? [outro.unidade, conversa.assunto].filter(Boolean).join(" · ")
              : conversa.tipo === "ADMINISTRACAO"
                ? "Com a administração"
                : "Conversa direta"}
            {encerrada && " · encerrada"}
          </p>
        </div>

        {ehGestao && !encerrada && (
          <button
            onClick={encerrar}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-error hover:bg-error/10 transition cursor-pointer"
          >
            <Icone name="lock" className="text-sm" />
            <span className="hidden sm:inline">Encerrar</span>
          </button>
        )}
      </header>

      {/*
        O fundo escalonado separa a área de leitura dos balões sem precisar de
        borda em cada um. O gradiente é de baixa amplitude de propósito: papel
        de parede com contraste alto atrapalha a leitura do texto por cima.
      */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-3 lg:px-8 py-4 space-y-1"
        style={{
          backgroundImage:
            "radial-gradient(at 20% 0%, color-mix(in srgb, var(--color-primary) 6%, transparent) 0px, transparent 55%), radial-gradient(at 80% 100%, color-mix(in srgb, var(--color-tertiary-container) 6%, transparent) 0px, transparent 55%)",
        }}
      >
        {blocos.map((bloco) => (
          <div key={bloco.rotulo} className="space-y-1">
            <div className="flex justify-center py-3">
              <span className="px-3 py-1 rounded-lg bg-surface-container-high/80 text-[11px] font-semibold text-on-surface-variant">
                {bloco.rotulo}
              </span>
            </div>
            {bloco.itens.map((m, i) => (
              <Balao
                key={m.id}
                mensagem={m}
                meu={m.autorId === usuario?.id}
                // O nome só na primeira de uma sequência do mesmo autor.
                // Repetido em cada balão vira ruído, e quem fala já está claro
                // pelo lado e pela cor.
                mostrarAutor={i === 0 || bloco.itens[i - 1].autorId !== m.autorId}
              />
            ))}
          </div>
        ))}
        <div ref={fim} />
      </div>

      {encerrada ? (
        <p className="shrink-0 px-5 py-4 border-t border-veu/8 text-xs text-on-surface-variant text-center bg-surface-container-low/70 flex items-center justify-center gap-2">
          <Icone name="lock" className="text-sm" />
          Esta conversa foi encerrada pela administração.
        </p>
      ) : (
        <form
          onSubmit={enviar}
          className="shrink-0 flex items-end gap-2 px-3 lg:px-5 py-3 border-t border-veu/8 bg-surface-container-low/70"
        >
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia, Shift+Enter quebra linha — o que se espera de um chat.
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(e); }
            }}
            rows={1}
            maxLength={4000}
            placeholder="Escreva sua mensagem…"
            className="flex-1 resize-none max-h-32 bg-surface-container-highest/50 border-none rounded-2xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button
            type="submit"
            disabled={!texto.trim() || enviando}
            aria-label="Enviar"
            className="shrink-0 w-11 h-11 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-primary/90 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Icone name={enviando ? "progress_activity" : "send"} className={enviando ? "animate-spin" : ""} />
          </button>
        </form>
      )}

      {erro && <p className="shrink-0 px-5 pb-3 text-xs text-error">{erro}</p>}
    </>
  );
}

function Balao({ mensagem, meu, mostrarAutor }) {
  if (mensagem.removida) {
    return (
      <div className={`flex ${meu ? "justify-end" : "justify-start"}`}>
        <p className="flex items-center gap-1.5 text-xs italic text-on-surface-variant/50 px-3 py-1.5">
          <Icone name="block" className="text-sm" />
          mensagem removida
        </p>
      </div>
    );
  }

  const daGestao = PERFIS_GESTAO.includes(mensagem.autorPerfil);

  return (
    <div className={`flex ${meu ? "justify-end" : "justify-start"}`}>
      {/*
        O canto reto de um lado só é o que dá a direção do balão sem precisar de
        rótulo: quem fala fica evidente pela forma, não pela leitura.
      */}
      <div
        className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2 shadow-sm ${
          meu
            ? "bg-primary/20 rounded-2xl rounded-br-md"
            : "bg-surface-container-high rounded-2xl rounded-bl-md"
        }`}
      >
        {!meu && mostrarAutor && (
          <p className={`text-[11px] font-bold mb-0.5 ${daGestao ? "text-primary" : "text-tertiary"}`}>
            {/* O nome só chega para a gestão. Sem ele, o papel gravado na
                mensagem é o que sobra — e ele vale mais que um nome ausente:
                diz em que posição a pessoa falou, mesmo que ela tenha deixado
                a administração depois. */}
            {mensagem.autor?.nome ?? (daGestao ? "Administração" : "Morador")}
          </p>
        )}
        <p className="text-sm text-on-surface leading-relaxed whitespace-pre-wrap break-words">
          {mensagem.corpo}
        </p>
        <p className="text-[10px] text-on-surface-variant/60 mt-1 text-right tabular-nums">
          {apenasHora(mensagem.criadaEm)}
        </p>
      </div>
    </div>
  );
}

/* ── nova conversa ─────────────────────────────────────────────────────── */

function ModalNova({ ehGestao, aoFechar, aoCriar }) {
  const [tipo, setTipo] = useState(ehGestao ? "DIRETA" : "ADMINISTRACAO");
  const [assunto, setAssunto] = useState("");
  const [corpo, setCorpo] = useState("");
  const [destinatarioId, setDestinatarioId] = useState("");
  const [contatos, setContatos] = useState([]);
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    // Só a gestão tem a lista do condomínio. O morador alcança a rota, mas
    // recortada na própria unidade — sem a administração. É por isso que ele
    // conversa com a administração, e não com uma pessoa escolhida numa lista.
    if (!ehGestao) return;
    comunicacaoApi.listarContatos()
      .then(({ data }) => setContatos(data.contatos ?? []))
      .catch(() => setContatos([]));
  }, [ehGestao]);

  async function enviar(e) {
    e.preventDefault();
    setEnviando(true);
    setErro("");
    try {
      const { data } = await comunicacaoApi.abrirConversa({
        tipo,
        assunto: assunto.trim(),
        corpo: corpo.trim(),
        ...(tipo === "DIRETA" ? { destinatarioId: Number(destinatarioId) } : {}),
      });
      aoCriar(data.conversa);
    } catch (err) {
      setErro(err.response?.data?.mensagem ?? "Não foi possível abrir a conversa.");
    } finally {
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
        <h2 className="font-headline text-xl font-bold text-on-surface">Nova conversa</h2>

        {ehGestao && (
          <div className="flex gap-2">
            {[
              { v: "DIRETA", r: "Com uma pessoa" },
              { v: "ADMINISTRACAO", r: "Aberta à administração" },
            ].map((o) => (
              <button
                key={o.v}
                type="button"
                onClick={() => setTipo(o.v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  tipo === o.v ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:bg-veu/5"
                }`}
              >
                {o.r}
              </button>
            ))}
          </div>
        )}

        {tipo === "DIRETA" && (
          <label className="block">
            <span className="text-xs font-semibold text-on-surface-variant">Para</span>
            <select
              required
              value={destinatarioId}
              onChange={(e) => setDestinatarioId(e.target.value)}
              className="mt-1 w-full bg-surface-container-highest/40 border-none rounded-xl px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer"
            >
              <option value="">Escolha o destinatário</option>
              {contatos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} — {c.perfil.replace("_", " ").toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        )}

        {!ehGestao && (
          <p className="text-xs text-on-surface-variant bg-veu/5 rounded-xl px-4 py-3">
            Sua mensagem vai para a administração do condomínio. Quem estiver
            respondendo a atende — e a conversa continua mesmo se o síndico mudar.
          </p>
        )}

        <label className="block">
          <span className="text-xs font-semibold text-on-surface-variant">Assunto</span>
          <input
            required
            maxLength={150}
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Ex.: Infiltração na garagem"
            className="mt-1 w-full bg-surface-container-highest/40 border-none rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-on-surface-variant">Mensagem</span>
          <textarea
            required
            rows={4}
            maxLength={4000}
            value={corpo}
            onChange={(e) => setCorpo(e.target.value)}
            placeholder="Descreva o que está acontecendo…"
            className="mt-1 w-full resize-none bg-surface-container-highest/40 border-none rounded-xl px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
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
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ── datas ─────────────────────────────────────────────────────────────── */

/** Sempre a hora. Usada no balão, onde o dia já vem no separador acima. */
function apenasHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** `14:32` para hoje, `12/09` para os dias anteriores. Usada na lista. */
function horaCurta(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const hoje = new Date();
  const mesmoDia =
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear();

  return mesmoDia
    ? d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Agrupa as mensagens por dia.
 *
 * Sem a separação, uma conversa que atravessa semanas vira um bloco contínuo e
 * a hora em cada balão deixa de situar quem lê.
 */
function agruparPorDia(mensagens) {
  const hoje = new Date();
  const ontem = new Date(hoje);
  ontem.setDate(hoje.getDate() - 1);

  const blocos = [];
  for (const m of mensagens) {
    const d = new Date(m.criadaEm);
    const rotulo = mesmoDia(d, hoje)
      ? "Hoje"
      : mesmoDia(d, ontem)
        ? "Ontem"
        : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

    const ultimo = blocos.at(-1);
    if (ultimo?.rotulo === rotulo) ultimo.itens.push(m);
    else blocos.push({ rotulo, itens: [m] });
  }
  return blocos;
}

function mesmoDia(a, b) {
  return (
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear()
  );
}
