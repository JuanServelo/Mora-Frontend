// src/pages/usuario/Notificacoes.jsx
// Central de notificações do usuário: lista paginada + preferências por categoria.
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icone } from "../../components/icones/Icone";
import { notificacaoApi } from "../../services/comunicacaoApi";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { useToast } from "../../contexts/ToastContext";
import {
  TIPOS_NOTIFICACAO,
  destinoNotificacao,
  iconeNotificacao,
  labelNotificacao,
  tempoRelativo,
} from "../../utils/notificacoes";

const TAMANHO_PAGINA = 20;

export function Notificacoes() {
  const [aba, setAba] = useState("lista");

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Comunicação
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Suas{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              notificações
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            Tudo o que aconteceu no condomínio e diz respeito a você.
          </p>
        </header>

        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "lista", label: "Notificações", icon: "notifications" },
            { id: "preferencias", label: "Preferências", icon: "tune" },
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

        {aba === "lista" ? <ListaNotificacoes /> : <PainelPreferencias />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// LISTA
// ════════════════════════════════════════════
function ListaNotificacoes() {
  const [itens, setItens] = useState([]);
  const [pagina, setPagina] = useState(0);
  const [ultimaPagina, setUltimaPagina] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [filtro, setFiltro] = useState("TODAS");
  const navigate = useNavigate();
  const toast = useToast();
  const { recarregar, setNaoLidas } = useNotificacoes();

  const carregar = useCallback(async (numeroPagina) => {
    setCarregando(true);
    try {
      const res = await notificacaoApi.listar({ page: numeroPagina, size: TAMANHO_PAGINA });
      const novos = res.data?.content ?? [];
      // A primeira página substitui; as seguintes acumulam no "Carregar mais".
      setItens((prev) => (numeroPagina === 0 ? novos : [...prev, ...novos]));
      setUltimaPagina(res.data?.last ?? true);
      setPagina(numeroPagina);
    } catch {
      toast.error("Não foi possível carregar suas notificações.");
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregar(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrir(notificacao) {
    if (!notificacao.lida) {
      try {
        await notificacaoApi.marcarLida(notificacao.id);
        setItens((prev) => prev.map((n) => (n.id === notificacao.id ? { ...n, lida: true } : n)));
        setNaoLidas((n) => Math.max(0, n - 1));
      } catch {
        // Segue para o destino mesmo assim: o polling reconcilia o contador.
      }
    }
    const destino = destinoNotificacao(notificacao);
    if (destino) navigate(destino);
  }

  async function marcarTodas() {
    try {
      await notificacaoApi.marcarTodasLidas();
      setItens((prev) => prev.map((n) => ({ ...n, lida: true })));
      setNaoLidas(0);
      recarregar();
      toast.success("Todas as notificações foram marcadas como lidas.");
    } catch {
      toast.error("Não foi possível marcar as notificações.");
    }
  }

  async function excluir(notificacao) {
    try {
      await notificacaoApi.excluir(notificacao.id);
      setItens((prev) => prev.filter((n) => n.id !== notificacao.id));
      if (!notificacao.lida) setNaoLidas((n) => Math.max(0, n - 1));
    } catch {
      toast.error("Não foi possível excluir a notificação.");
    }
  }

  const filtrados = itens.filter((n) => {
    if (filtro === "TODAS") return true;
    if (filtro === "NAO_LIDAS") return !n.lida;
    return n.tipo === filtro;
  });

  const totalNaoLidas = itens.filter((n) => !n.lida).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "TODAS", label: "Todas" },
          { id: "NAO_LIDAS", label: `Não lidas${totalNaoLidas ? ` (${totalNaoLidas})` : ""}` },
          ...TIPOS_NOTIFICACAO.map((t) => ({ id: t.value, label: t.label })),
        ].map((chip) => (
          <button
            key={chip.id}
            onClick={() => setFiltro(chip.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
              filtro === chip.id
                ? "bg-primary text-on-primary"
                : "bg-surface-container-highest/40 text-on-surface-variant hover:bg-white/10"
            }`}
          >
            {chip.label}
          </button>
        ))}
        {totalNaoLidas > 0 && (
          <button
            onClick={marcarTodas}
            className="ml-auto text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="space-y-3">
        {filtrados.map((n) => (
          <div
            key={n.id}
            className={`glass-panel rounded-2xl overflow-hidden transition-all ${
              n.lida ? "" : "border border-primary/20"
            }`}
          >
            <div className="flex items-start gap-3 px-4 sm:px-5 py-4">
              <button
                onClick={() => abrir(n)}
                className="flex items-start gap-3 flex-1 min-w-0 text-left cursor-pointer"
              >
                <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name={iconeNotificacao(n.tipo)} className="text-primary text-xl" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm leading-snug ${n.lida ? "text-on-surface-variant" : "text-on-surface font-semibold"}`}>
                      {n.titulo}
                    </p>
                    {!n.lida && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                  </div>
                  {n.mensagem && (
                    <p className="text-sm text-on-surface-variant mt-1 whitespace-pre-wrap line-clamp-3">
                      {n.mensagem}
                    </p>
                  )}
                  <p className="text-xs text-on-surface-variant/70 mt-2">
                    {labelNotificacao(n.tipo)} · {tempoRelativo(n.criadoEm)}
                  </p>
                </div>
              </button>
              <button
                onClick={() => excluir(n)}
                aria-label="Excluir notificação"
                className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition-all cursor-pointer"
              >
                <Icone name="close" className="text-base" />
              </button>
            </div>
          </div>
        ))}

        {!carregando && filtrados.length === 0 && (
          <div className="glass-panel rounded-2xl py-14 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="notifications_off" className="text-5xl opacity-30" />
            <p className="text-sm">
              {filtro === "TODAS"
                ? "Você ainda não tem notificações."
                : "Nada nesta categoria."}
            </p>
          </div>
        )}

        {carregando && (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        )}
      </div>

      {!ultimaPagina && !carregando && (
        <button
          onClick={() => carregar(pagina + 1)}
          className="w-full py-3 rounded-xl glass-panel text-sm font-semibold text-primary hover:bg-white/5 transition-all cursor-pointer"
        >
          Carregar mais
        </button>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// PREFERÊNCIAS
// ════════════════════════════════════════════
function PainelPreferencias() {
  const [silenciadas, setSilenciadas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const toast = useToast();

  useEffect(() => {
    notificacaoApi
      .preferencias()
      .then((res) => setSilenciadas(res.data?.silenciadas ?? []))
      .catch(() => toast.error("Não foi possível carregar suas preferências."))
      .finally(() => setCarregando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Salva a lista inteira a cada toggle. O endpoint substitui o estado, então
   * enviar o conjunto completo evita divergir do servidor se dois toggles
   * forem clicados em sequência rápida.
   */
  async function alternar(tipo) {
    const proximas = silenciadas.includes(tipo)
      ? silenciadas.filter((t) => t !== tipo)
      : [...silenciadas, tipo];

    const anteriores = silenciadas;
    setSilenciadas(proximas);
    setSalvando(true);
    try {
      const res = await notificacaoApi.salvarPreferencias(proximas);
      setSilenciadas(res.data?.silenciadas ?? proximas);
    } catch {
      setSilenciadas(anteriores);
      toast.error("Não foi possível salvar a preferência.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-on-surface-variant">
        Desligue as categorias que você não quer receber. Isso vale para as notificações
        dentro do app — avisos oficiais continuam aparecendo na tela inicial.
      </p>

      <div className="space-y-3">
        {TIPOS_NOTIFICACAO.map((tipo) => {
          const ativa = !silenciadas.includes(tipo.value);
          return (
            <div key={tipo.value} className="glass-panel rounded-2xl px-4 sm:px-5 py-4 flex items-center gap-4">
              <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${ativa ? "bg-primary/10" : "bg-surface-container-highest/40"}`}>
                <Icone
                  name={tipo.icon}
                  className={`text-xl ${ativa ? "text-primary" : "text-on-surface-variant/50"}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-on-surface">{tipo.label}</p>
                <p className="text-xs text-on-surface-variant">{tipo.descricao}</p>
              </div>
              <button
                role="switch"
                aria-checked={ativa}
                aria-label={`${ativa ? "Desativar" : "Ativar"} ${tipo.label}`}
                disabled={salvando}
                onClick={() => alternar(tipo.value)}
                className={`relative w-12 h-7 shrink-0 rounded-full transition-colors duration-200 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                  ativa ? "bg-primary" : "bg-surface-container-highest"
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 rounded-full bg-surface transition-transform duration-200 ${
                    ativa ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
