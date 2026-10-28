// src/pages/usuario/MinhasReservas.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { areaComunApi } from "../../services/estruturasApi";
import { reservaApi, funcionamentoApi, apartamentoApi } from "../../services/portariaApi";
import { acessoApi } from "../../services/acessoApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS, podeAprovarReserva } from "../../utils/perfis";
import { AgendaEspacos } from "../../components/agenda/AgendaEspacos";
import { idiomaAtual } from "../../i18n";

// ── helpers ──────────────────────────────────────────────────────────────────

function errMsg(err) {
  const d = err?.response?.data;
  return d?.mensagem ?? d?.message ?? d?.erro ?? null;
}

const TIPO_ICONE = {
  PISCINA: "pool", SALAO_FESTAS: "celebration", ACADEMIA: "fitness_center",
  CHURRASQUEIRA: "outdoor_grill", QUADRA: "sports_tennis", PLAYGROUND: "child_friendly",
  GYM: "fitness_center", OUTRO: "meeting_room",
};

const STATUS_RESERVA = {
  PENDENTE: { rotuloKey: "status.pendente", cor: "bg-secondary/10 text-secondary" },
  APROVADA: { rotuloKey: "status.aprovada", cor: "bg-primary/10 text-primary" },
  RECUSADA: { rotuloKey: "status.recusada", cor: "bg-error/10 text-error" },
  EXPIRADA: { rotuloKey: "status.expirada", cor: "bg-outline-variant/20 text-on-surface-variant" },
  CANCELADA: { rotuloKey: "status.cancelada", cor: "bg-outline-variant/20 text-on-surface-variant" },
  CONCLUIDA: { rotuloKey: "status.concluida", cor: "bg-tertiary/10 text-tertiary" },
};

/** Datetime local no formato que o backend espera, sem passar por UTC. */
function isoLocal(data, hora) {
  return `${data}T${hora.length === 5 ? hora : hora.slice(0, 5)}:00`;
}

/**
 * Prazo para decidir uma pendente — calculado pelo backend (campo
 * prazoDecisao). Refazer a conta aqui faria as duas versoes da regra
 * divergirem; o fallback cobre apenas resposta antiga em cache.
 */
function prazoAprovacao(reserva) {
  return new Date(reserva.prazoDecisao ?? reserva.inicio);
}

function hojeISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")].join("-");
}

const INPUT_FILTRO =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-2 px-3 text-sm text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all";

function fmtDataHora(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString(idiomaAtual(), {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Página ───────────────────────────────────────────────────────────────────

export function MinhasReservas() {
  const { t } = useTranslation("reservas");
  const { usuario } = useAuth();
  const toast = useToast();

  const ehOperador = [PERFIS.PORTEIRO, PERFIS.ADMIN_SINDICO, PERFIS.ADMIN_GERAL]
    .includes(usuario?.perfil);

  const [areas, setAreas] = useState([]);
  const [carregandoAreas, setCarregandoAreas] = useState(true);
  const [erroAreas, setErroAreas] = useState(null);

  const [selecionada, setSelecionada] = useState(null);
  const [funcionamento, setFuncionamento] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [erroAgenda, setErroAgenda] = useState(null);

  // Persistem ao navegar entre períodos e ao trocar de espaço (critério 6).
  const [visualizacao, setVisualizacao] = useState("mes");
  const [referencia, setReferencia] = useState(new Date());

  // A notificação de reserva pendente aponta para ?aba=aprovacoes. Sem ler o
  // parâmetro, o síndico cairia na agenda e teria de achar a fila sozinho.
  const [searchParams] = useSearchParams();
  const [aba, setAba] = useState(
    () => (searchParams.get("aba") === "aprovacoes" ? "aprovacoes" : "agenda"));
  const [novaReserva, setNovaReserva] = useState(false);
  const [detalhe, setDetalhe] = useState(null);

  // Quem aprova precisa ver que ha fila antes de abrir a aba, senao uma
  // solicitacao fica parada ate expirar sem ninguem saber que existia.
  const podeAprovar = podeAprovarReserva(usuario?.perfil);
  const [pendentes, setPendentes] = useState([]);

  const carregarPendentes = useCallback(() => {
    if (!podeAprovar) return Promise.resolve();
    return reservaApi.pendentes()
      .then((res) => setPendentes(Array.isArray(res.data) ? res.data : []))
      .catch(() => setPendentes([]));
  }, [podeAprovar]);

  useEffect(() => { carregarPendentes(); }, [carregarPendentes]);

  useEffect(() => {
    let ok = true;
    (async () => {
      setCarregandoAreas(true);
      setErroAreas(null);
      try {
        const res = await areaComunApi.listar();
        const lista = Array.isArray(res.data) ? res.data : res.data?.areas || [];
        if (ok) setAreas(lista.filter((a) => a.ativo && a.podeReservar));
      } catch {
        if (ok) setErroAreas(t("erros.carregarAreas"));
      } finally {
        if (ok) setCarregandoAreas(false);
      }
    })();
    return () => { ok = false; };
  }, [t]);

  // Período coberto pela consulta: a grade do mês chega a mostrar 6 semanas,
  // então a margem evita buracos nas bordas.
  const periodo = useMemo(() => {
    const ini = new Date(referencia);
    const fim = new Date(referencia);
    if (visualizacao === "mes") {
      ini.setDate(1); ini.setDate(ini.getDate() - 7);
      fim.setMonth(fim.getMonth() + 1); fim.setDate(7);
    } else {
      ini.setDate(ini.getDate() - ini.getDay() - 1);
      fim.setDate(fim.getDate() - fim.getDay() + 8);
    }
    ini.setHours(0, 0, 0, 0); fim.setHours(23, 59, 59, 0);
    const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:00`;
    return { inicio: fmt(ini), fim: fmt(fim) };
  }, [referencia, visualizacao]);

  const carregarAgenda = useCallback(async () => {
    if (!selecionada) return;
    setCarregandoAgenda(true);
    setErroAgenda(null);
    try {
      const [ag, fn] = await Promise.all([
        reservaApi.agenda(selecionada.id, periodo.inicio, periodo.fim),
        funcionamentoApi.consultar(selecionada.id).catch(() => ({ data: null })),
      ]);
      setReservas(Array.isArray(ag.data) ? ag.data : []);
      setFuncionamento(fn.data ?? null);
    } catch (err) {
      setErroAgenda(errMsg(err) || t("erros.carregarAgenda"));
      setReservas([]);
    } finally {
      setCarregandoAgenda(false);
    }
  }, [selecionada, periodo.inicio, periodo.fim, t]);

  useEffect(() => { carregarAgenda(); }, [carregarAgenda]);

  async function cancelar(r) {
    // Período completo: numa reserva corrida, cancelar a partir de qualquer
    // segmento cancela tudo, e a confirmação precisa deixar isso claro.
    const periodo = t("periodo", { inicio: fmtDataHora(r.inicio), fim: fmtDataHora(r.fim) });
    if (!window.confirm(t("cancelamento.confirmar", { periodo }))) return;
    try {
      await reservaApi.cancelar(r.id);
      toast.success(t("cancelamento.sucesso"));
      setDetalhe(null);
      await carregarAgenda();
    } catch (err) {
      toast.error(errMsg(err) || t("erros.cancelar"));
    }
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            {t("cabecalho.sobretitulo")}
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            {t("cabecalho.titulo")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("cabecalho.tituloDestaque")}
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {selecionada
              ? t("cabecalho.subtituloSelecionado")
              : t("cabecalho.subtituloEscolha")}
          </p>
        </header>

        {/* Agenda todo mundo vê. "Minhas reservas" é de quem reserva, e
            Aprovações e Histórico são da operação. */}
        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "agenda", label: t("abas.agenda"), icon: "calendar_month" },
            { id: "minhas", label: t("abas.minhas"), icon: "event_available" },
            ...(podeAprovar
              ? [{ id: "aprovacoes", label: t("abas.aprovacoes"), icon: "fact_check", badge: pendentes.length }]
              : []),
            ...(ehOperador
              ? [{ id: "historico", label: t("abas.historico"), icon: "history" }]
              : []),
          ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setAba(item.id)}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  aba === item.id
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-veu/5"
                }`}
              >
                <Icone name={item.icon} className="text-lg" />
                {item.label}
                {item.badge > 0 && (
                  <span className="min-w-5 px-1.5 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold leading-none flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
            </button>
          ))}
        </div>

        {aba === "minhas" ? (
          <AbaMinhasReservas onAbrirReserva={setDetalhe} />
        ) : aba === "aprovacoes" && podeAprovar ? (
          <AbaAprovacoes
            pendentes={pendentes}
            onAbrirReserva={setDetalhe}
            onRecarregar={async () => { await carregarPendentes(); await carregarAgenda(); }}
          />
        ) : aba === "historico" && ehOperador ? (
          <AbaHistoricoReservas areas={areas} onAbrirReserva={setDetalhe} />
        ) : !selecionada ? (
          <SelecaoEspaco
            areas={areas} carregando={carregandoAreas} erro={erroAreas}
            onSelecionar={setSelecionada}
          />
        ) : (
          <AgendaEspacos
            area={selecionada}
            funcionamento={funcionamento}
            reservas={reservas}
            carregando={carregandoAgenda}
            erro={erroAgenda}
            visualizacao={visualizacao}
            onVisualizacao={setVisualizacao}
            referencia={referencia}
            onReferencia={setReferencia}
            onNovaReserva={() => setNovaReserva(true)}
            onAbrirReserva={setDetalhe}
            onTrocarEspaco={() => setSelecionada(null)}
          />
        )}

        {novaReserva && selecionada && (
          <ModalNovaReserva
            area={selecionada}
            funcionamento={funcionamento}
            ehOperador={ehOperador}
            usuario={usuario}
            onFechar={() => setNovaReserva(false)}
            onCriada={async () => { setNovaReserva(false); await carregarAgenda(); }}
          />
        )}

        {detalhe && (
          <ModalDetalhe
            reserva={detalhe}
            ehOperador={ehOperador}
            usuario={usuario}
            onFechar={() => setDetalhe(null)}
            onCancelar={() => cancelar(detalhe)}
            onDecidida={async () => {
              setDetalhe(null);
              await Promise.all([carregarPendentes(), carregarAgenda()]);
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Aba: fila de aprovações (síndico) ────────────────────────────────────────
//
// Ordenada pelo backend da mais proxima do prazo para a mais distante: a que
// expira primeiro e a que precisa de decisao primeiro.

/**
 * As reservas de quem está olhando.
 *
 * A versão de origem não tinha esta lista: mostrava a agenda do espaço e, para
 * a operação, o histórico do condomínio inteiro — mas o morador não tinha onde
 * ver o que ele mesmo reservou. `reservaApi.listarMinhas` já existia no client,
 * sem nenhum consumidor.
 */
function AbaMinhasReservas({ onAbrirReserva }) {
  const { t } = useTranslation("reservas");
  const [reservas, setReservas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    reservaApi
      .listarMinhas()
      .then((r) => { if (vivo) setReservas(r.data ?? []); })
      .catch((e) => { if (vivo) setErro(errMsg(e) || t("erros.carregarMinhas")); })
      .finally(() => { if (vivo) setCarregando(false); });
    return () => { vivo = false; };
  }, [t]);

  if (carregando) {
    return <p className="text-sm text-on-surface-variant">{t("comum:estado.carregando")}</p>;
  }

  if (erro) {
    return (
      <div className="glass-panel rounded-2xl p-4 flex items-center gap-3 text-on-surface-variant">
        <Icone name="error" className="text-error" />
        {erro}
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="glass-panel rounded-3xl py-16 flex flex-col items-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icone name="event_available" className="text-primary text-3xl" />
        </div>
        <div>
          <p className="font-semibold text-on-surface mb-1">{t("minhas.vazioTitulo")}</p>
          <p className="text-xs text-on-surface-variant">
            {t("minhas.vazioDescricao")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {reservas.map((r) => {
        const st = STATUS_RESERVA[r.status] ?? STATUS_RESERVA.PENDENTE;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => onAbrirReserva?.(r)}
            className="w-full text-left glass-panel rounded-2xl p-4 flex items-center gap-4 hover:bg-veu/5 transition cursor-pointer"
          >
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icone name="deck" className="text-primary text-xl" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-on-surface truncate">
                {r.areaNome || r.area?.nome || t("minhas.espacoPadrao")}
              </p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {t("periodo", { inicio: fmtDataHora(r.inicio), fim: fmtDataHora(r.fim) })}
              </p>
            </div>
            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${st.cor}`}>
              {t(st.rotuloKey)}
            </span>
          </button>
        );
      })}
    </div>
  );
}


function AbaAprovacoes({ pendentes, onAbrirReserva, onRecarregar }) {
  const { t } = useTranslation("reservas");
  const toast = useToast();
  const [marcadas, setMarcadas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  function alternar(id) {
    setMarcadas((m) => (m.includes(id) ? m.filter((x) => x !== id) : [...m, id]));
  }

  async function aprovarLote() {
    setSalvando(true);
    try {
      const { data } = await reservaApi.aprovarLote(marcadas);
      const ok = data?.aprovadas?.length ?? 0;
      const falhas = data?.falhas ?? [];
      if (ok > 0) toast.success(t("aprovacoes.aprovadas", { count: ok }));
      // Uma falha no meio do lote nao invalida as outras: cada recusa do
      // backend tem motivo proprio e precisa chegar a quem decidiu.
      falhas.forEach((f) => toast.error(f.motivo));
      setMarcadas([]);
      await onRecarregar();
    } catch (err) {
      toast.error(errMsg(err) || t("erros.aprovarLote"));
    } finally {
      setSalvando(false);
    }
  }

  if (pendentes.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
        <Icone name="task_alt" className="text-5xl opacity-30" />
        <p className="text-sm max-w-md">{t("aprovacoes.vazio")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-on-surface-variant">
          {t("aprovacoes.aguardando", { count: pendentes.length })}
        </p>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setMarcadas(marcadas.length === pendentes.length ? [] : pendentes.map((r) => r.id))}
            className="text-xs text-primary font-semibold hover:underline cursor-pointer">
            {marcadas.length === pendentes.length ? t("aprovacoes.desmarcarTodas") : t("aprovacoes.selecionarTodas")}
          </button>
          <Botao onClick={aprovarLote} disabled={marcadas.length === 0 || salvando}>
            {marcadas.length > 0 ? t("aprovacoes.aprovarQtd", { n: marcadas.length }) : t("aprovacoes.aprovar")}
          </Botao>
        </div>
      </div>

      <div className="space-y-3">
        {pendentes.map((r) => {
          const prazo = prazoAprovacao(r);
          // Um terco do prazo restante: destaca o que esta perto de expirar
          // sem pintar a fila inteira de vermelho.
          const vencendo = prazo.getTime() - Date.now() < 8 * 60 * 60 * 1000;
          return (
            <div key={r.id}
              className="glass-panel rounded-2xl p-4 border border-outline-variant/15 flex items-start gap-3">
              <input
                type="checkbox" checked={marcadas.includes(r.id)}
                onChange={() => alternar(r.id)}
                aria-label={t("aprovacoes.selecionarReserva", { nome: r.responsavelNome || t("aprovacoes.responsavelPadrao") })}
                className="accent-primary w-4 h-4 mt-1 shrink-0 cursor-pointer"
              />
              <button type="button" onClick={() => onAbrirReserva(r)}
                className="flex-1 min-w-0 text-left cursor-pointer">
                <p className="font-semibold text-on-surface text-sm truncate">
                  {r.areaComumNome}
                  <span className="font-normal text-on-surface-variant"> · {r.responsavelNome || "—"}</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {t("periodo", { inicio: fmtDataHora(r.inicio), fim: fmtDataHora(r.fim) })}
                </p>
                {r.descricaoEvento && (
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">{r.descricaoEvento}</p>
                )}
                <p className={`text-xs mt-1 inline-flex items-center gap-1 ${vencendo ? "text-error" : "text-on-surface-variant"}`}>
                  <Icone name="schedule" className="text-sm" />
                  {t("aprovacoes.decidirAte", { prazo: fmtDataHora(prazo) })}
                </p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Aba: histórico de áreas reservadas (porteiro) ────────────────────────────
//
// Consulta as reservas do condomínio e filtra no cliente: o volume é o de um
// condomínio e a tela precisa cruzar espaço, período e situação livremente.

const FILTROS_HIST = { areaComumId: "", dataInicio: "", dataFim: "", status: "", responsavel: "" };

function AbaHistoricoReservas({ areas, onAbrirReserva }) {
  const { t } = useTranslation("reservas");
  const [reservas, setReservas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtros, setFiltros] = useState(FILTROS_HIST);
  // Passadas por padrão: é o que "histórico" quer dizer para quem opera.
  const [incluirFuturas, setIncluirFuturas] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const res = await reservaApi.listar();
      setReservas(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setErro(errMsg(err) || t("erros.carregarHistorico"));
      setReservas([]);
    } finally {
      setCarregando(false);
    }
  }, [t]);

  useEffect(() => { carregar(); }, [carregar]);

  function setF(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  const agora = new Date();
  const termo = filtros.responsavel.trim().toLowerCase();

  const filtradas = useMemo(() => reservas
    .filter((r) => {
      if (!incluirFuturas && new Date(r.fim) >= agora) return false;
      if (filtros.areaComumId && r.areaComumId !== filtros.areaComumId) return false;
      if (filtros.status && r.status !== filtros.status) return false;
      // Compara como YYYY-MM-DD: evita o Date() deslocar o dia em UTC-3.
      const dia = String(r.inicio).slice(0, 10);
      if (filtros.dataInicio && dia < filtros.dataInicio) return false;
      if (filtros.dataFim && dia > filtros.dataFim) return false;
      if (termo && !(r.responsavelNome || "").toLowerCase().includes(termo)) return false;
      return true;
    })
    .sort((a, b) => new Date(b.inicio) - new Date(a.inicio)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reservas, filtros, incluirFuturas, termo]
  );

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t("historico.filtros")}</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
              <input
                type="checkbox" checked={incluirFuturas}
                onChange={(e) => setIncluirFuturas(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              {t("historico.incluirFuturas")}
            </label>
            <button
              type="button"
              onClick={() => { setFiltros(FILTROS_HIST); setIncluirFuturas(false); }}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              {t("historico.limparFiltros")}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5 col-span-2 lg:col-span-1">
            <label className="text-xs text-on-surface-variant ml-1">{t("historico.campos.espaco")}</label>
            <select value={filtros.areaComumId} onChange={(e) => setF("areaComumId", e.target.value)}
              className={INPUT_FILTRO}>
              <option value="">{t("comum:estado.todos")}</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">{t("historico.campos.de")}</label>
            <input type="date" value={filtros.dataInicio}
              onChange={(e) => setF("dataInicio", e.target.value)} className={INPUT_FILTRO} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">{t("historico.campos.ate")}</label>
            <input type="date" value={filtros.dataFim}
              onChange={(e) => setF("dataFim", e.target.value)} className={INPUT_FILTRO} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">{t("historico.campos.situacao")}</label>
            <select value={filtros.status} onChange={(e) => setF("status", e.target.value)}
              className={INPUT_FILTRO}>
              <option value="">{t("comum:estado.todas")}</option>
              {Object.entries(STATUS_RESERVA).map(([v, c]) => (
                <option key={v} value={v}>{t(c.rotuloKey)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">{t("historico.campos.responsavel")}</label>
            <input type="text" value={filtros.responsavel} placeholder={t("historico.placeholderNome")}
              onChange={(e) => setF("responsavel", e.target.value)} className={INPUT_FILTRO} />
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="glass-panel rounded-2xl py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : erro ? (
        <div className="glass-panel rounded-2xl p-8 text-center border border-error/20 space-y-3">
          <Icone name="error_outline" className="text-error text-4xl" />
          <p className="text-sm text-on-surface-variant">{erro}</p>
          <button onClick={carregar}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold cursor-pointer">
            <Icone name="refresh" className="text-base" />{t("comum:acoes.tentarNovamente")}
          </button>
        </div>
      ) : reservas.length === 0 ? (
        <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
          <Icone name="history" className="text-5xl opacity-30" />
          <p className="text-sm max-w-md">{t("historico.vazio")}</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="glass-panel rounded-2xl py-12 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
          <Icone name="search_off" className="text-5xl opacity-30" />
          <p className="text-sm max-w-md">{t("historico.semResultado")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-on-surface-variant">
            {t("historico.encontradas", { count: filtradas.length })}
          </p>
          <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                    {["espaco", "responsavel", "tipo", "inicio", "fim", "situacao", "decididoPor"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {t(`historico.colunas.${h}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((r) => {
                    const cfg = STATUS_RESERVA[r.status] ?? STATUS_RESERVA.PENDENTE;
                    const evento = r.tipoReserva === "EVENTO_CONDOMINIO";
                    return (
                      <tr key={r.id} onClick={() => onAbrirReserva(r)}
                        className="border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors cursor-pointer">
                        <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">
                          {r.areaComumNome || "—"}
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                          {r.responsavelNome || "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            evento ? "bg-tertiary/15 text-tertiary" : "bg-primary/15 text-primary"
                          }`}>
                            {evento ? t("historico.tipoEvento") : t("historico.tipoMorador")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtDataHora(r.inicio)}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtDataHora(r.fim)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.cor}`}>{t(cfg.rotuloKey)}</span>
                        </td>
                        {/* Quem confirmou, ou quem encerrou — o que for o caso. */}
                        <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                          {r.canceladoPorNome ? (
                            <>
                              <span className="text-error font-semibold">{r.canceladoPorNome}</span>
                              <span className="block opacity-70">{fmtDataHora(r.canceladoEm)}</span>
                            </>
                          ) : r.aprovadoEm ? (
                            <>
                              {/* Sem nome: o espaco nao exige aprovacao, entao
                                  nao houve decisao de ninguem a registrar. */}
                              <span className="text-primary font-semibold">
                                {r.aprovadoPorNome || t("historico.automatica")}
                              </span>
                              <span className="block opacity-70">{fmtDataHora(r.aprovadoEm)}</span>
                            </>
                          ) : r.status === "EXPIRADA" ? (
                            <span className="opacity-70">{t("historico.prazoExpirado")}</span>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Etapa 1: seleção do espaço (RN-01) ───────────────────────────────────────

function SelecaoEspaco({ areas, carregando, erro, onSelecionar }) {
  const { t } = useTranslation("reservas");
  if (carregando) {
    return (
      <div className="glass-panel rounded-2xl py-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (erro) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-error/20 space-y-2">
        <Icone name="error_outline" className="text-error text-4xl" />
        <p className="text-sm text-on-surface-variant">{erro}</p>
      </div>
    );
  }
  if (areas.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
        <Icone name="meeting_room" className="text-5xl opacity-30" />
        <p className="text-sm max-w-md">{t("selecao.vazio")}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {areas.map((a) => (
        <button key={a.id} type="button" onClick={() => onSelecionar(a)}
          className="glass-panel rounded-2xl p-5 text-left space-y-3 border border-outline-variant/15 hover:border-primary/35 hover:bg-white/[0.03] transition-all cursor-pointer group">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Icone name={TIPO_ICONE[a.tipo] || "meeting_room"} className="text-primary text-2xl" />
          </div>
          <div>
            <p className="font-bold text-on-surface">{a.nome}</p>
            {a.descricao && <p className="text-xs text-on-surface-variant mt-0.5">{a.descricao}</p>}
          </div>
          <div className="space-y-1 text-xs text-on-surface-variant">
            <p className="flex items-center gap-1.5">
              <Icone name="group" className="text-sm" />
              {a.capacidadeMaxima ? t("selecao.pessoas", { count: a.capacidadeMaxima }) : t("selecao.capacidadeNaoInformada")}
            </p>
            <p className="flex items-center gap-1.5">
              <Icone name="place" className="text-sm" />
              {a.localizacao || t("selecao.localizacaoNaoInformada")}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            {t("selecao.verAgenda")}<Icone name="chevron_right" className="text-lg" />
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Modal: nova reserva (RN-04, RN-05) ───────────────────────────────────────

const FORM_INICIAL = {
  tipoReserva: "MORADOR", unidadeId: "", responsavelId: "",
  data: hojeISO(), horaInicio: "", dataFim: hojeISO(), horaFim: "",
  descricaoEvento: "", observacoes: "",
};

function ModalNovaReserva({ area, funcionamento, ehOperador, usuario, onFechar, onCriada }) {
  const { t } = useTranslation("reservas");
  const toast = useToast();
  const [form, setForm] = useState({
    ...FORM_INICIAL,
    unidadeId: ehOperador ? "" : (usuario?.unidadeId || ""),
  });
  const [apartamentos, setApartamentos] = useState([]);
  const [residentes, setResidentes] = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  const ehEvento = form.tipoReserva === "EVENTO_CONDOMINIO";

  useEffect(() => {
    if (!ehOperador) return;
    apartamentoApi.listar().then((r) => setApartamentos(r.data || [])).catch(() => {});
    acessoApi.listarResidentes()
      .then((r) => setResidentes(r.data?.residentes || []))
      .catch(() => setResidentes([]));
    reservaApi.funcionarios().then((r) => setFuncionarios(r.data || [])).catch(() => {});
  }, [ehOperador]);

  // Moradores ativos por unidade — base do seletor e do motivo de desabilitar.
  const moradoresPorUnidade = useMemo(() => {
    const mapa = new Map();
    for (const r of residentes) {
      if (!r.unidadeId) continue;
      if (!["MORADOR", "DONO_ALUGUEL"].includes(r.perfil)) continue;
      if (!mapa.has(r.unidadeId)) mapa.set(r.unidadeId, []);
      mapa.get(r.unidadeId).push(r);
    }
    return mapa;
  }, [residentes]);

  // Trocar a unidade recarrega a lista e zera o responsável (critério 14).
  const moradoresDaUnidade = moradoresPorUnidade.get(form.unidadeId) || [];

  function set(campo, valor) {
    setForm((f) => {
      const novo = { ...f, [campo]: valor };
      if (campo === "unidadeId") novo.responsavelId = "";
      if (campo === "tipoReserva") { novo.responsavelId = ""; novo.unidadeId = valor === "EVENTO_CONDOMINIO" ? "" : f.unidadeId; }
      if (campo === "data" && f.dataFim < valor) novo.dataFim = valor;
      return novo;
    });
    setErro(null);
  }

  async function submeter(e) {
    e.preventDefault();
    setErro(null);

    if (!form.horaInicio || !form.horaFim) {
      setErro(t("nova.erros.horario")); return;
    }
    const inicio = isoLocal(form.data, form.horaInicio);
    const fim = isoLocal(form.dataFim, form.horaFim);
    if (new Date(fim) <= new Date(inicio)) {
      setErro(t("nova.erros.fimAntesInicio")); return;
    }
    if (new Date(inicio) < new Date()) {
      setErro(t("nova.erros.passado")); return;
    }
    if (ehEvento && !form.descricaoEvento.trim()) {
      setErro(t("nova.erros.descricaoEvento")); return;
    }
    if (!ehEvento && ehOperador && !form.unidadeId) {
      setErro(t("nova.erros.unidade")); return;
    }
    if (ehOperador && !form.responsavelId) {
      setErro(ehEvento ? t("nova.erros.funcionario") : t("nova.erros.morador")); return;
    }

    setSalvando(true);
    try {
      const { data } = await reservaApi.solicitar({
        areaComumId: area.id,
        inicio, fim,
        tipoReserva: ehOperador ? form.tipoReserva : "MORADOR",
        unidadeId: ehEvento ? null : (form.unidadeId || null),
        responsavelId: form.responsavelId || null,
        descricaoEvento: ehEvento ? form.descricaoEvento.trim() : null,
        observacoes: form.observacoes || null,
      });
      // Quem solicita precisa saber se ja pode contar com o espaco: "Reserva
      // criada" numa pendente faria o morador aparecer no dia sem direito a ele.
      if (data?.status === "PENDENTE") {
        toast.success(t("nova.toast.pendente"));
      } else {
        toast.success(t("nova.toast.criada"));
      }
      onCriada();
    } catch (err) {
      setErro(errMsg(err) || t("erros.criar"));
    } finally {
      setSalvando(false);
    }
  }

  const atravessaDia = form.dataFim !== form.data;
  const unidadeDoMorador = apartamentos.find((a) => a.id === (usuario?.unidadeId));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-lg border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">{t("nova.titulo")}</h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">{area.nome}</p>

        <form onSubmit={submeter} className="space-y-4">
          {ehOperador && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {t("nova.tipoReserva")} <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[
                  { v: "MORADOR", l: t("nova.tipos.morador") },
                  { v: "EVENTO_CONDOMINIO", l: t("nova.tipos.evento") },
                ].map((tipo) => (
                  <button key={tipo.v} type="button" onClick={() => set("tipoReserva", tipo.v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                      form.tipoReserva === tipo.v
                        ? "bg-primary text-on-primary border-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:bg-veu/5"
                    }`}>
                    {tipo.l}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unidade: seletor para operador, somente leitura para morador (RN-05) */}
          {!ehEvento && (
            ehOperador ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                  {t("nova.unidade")} <span className="text-red-500">*</span>
                </label>
                <select value={form.unidadeId} onChange={(e) => set("unidadeId", e.target.value)}
                  className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all">
                  <option value="">{t("nova.selecioneUnidade")}</option>
                  {apartamentos.map((a) => {
                    const temMorador = (moradoresPorUnidade.get(a.id) || []).length > 0;
                    const rotulo = `${a.blocoNome ? `${a.blocoNome} — ` : ""}${t("nova.apto", { numero: a.numero })}`;
                    return (
                      <option key={a.id} value={a.id} disabled={!temMorador}>
                        {rotulo}{temMorador ? "" : t("nova.semMoradorAtivo")}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                  {t("nova.suaUnidade")}
                </label>
                <div className="w-full bg-surface-container-highest/20 rounded-xl py-3 px-4 text-on-surface-variant text-sm flex items-center gap-2">
                  <Icone name="lock" className="text-base" />
                  {unidadeDoMorador
                    ? `${unidadeDoMorador.blocoNome ? `${unidadeDoMorador.blocoNome} — ` : ""}${t("nova.apto", { numero: unidadeDoMorador.numero })}`
                    : (usuario?.bloco && usuario?.apartamento
                        ? `${usuario.bloco} — ${t("nova.apto", { numero: usuario.apartamento })}`
                        : t("nova.vinculadaCadastro"))}
                </div>
              </div>
            )
          )}

          {/* Responsável */}
          {ehOperador && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {ehEvento ? t("nova.funcionarioResponsavel") : t("nova.moradorResponsavel")} <span className="text-red-500">*</span>
              </label>
              <select value={form.responsavelId} onChange={(e) => set("responsavelId", e.target.value)}
                disabled={!ehEvento && !form.unidadeId}
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all disabled:opacity-50">
                <option value="">{t("nova.selecione")}</option>
                {(ehEvento
                  ? funcionarios.map((f) => ({ id: f.pessoaId, nome: f.nome }))
                  : moradoresDaUnidade.map((m) => ({ id: String(m.id), nome: m.nome }))
                ).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              {!ehEvento && form.unidadeId && moradoresDaUnidade.length === 0 && (
                <p className="text-xs text-error ml-1">
                  {t("nova.unidadeSemMorador")}
                </p>
              )}
            </div>
          )}

          {ehEvento && (
            <Campo id="descricaoEvento" label={t("nova.descricaoEvento")} required
              value={form.descricaoEvento} onChange={(e) => set("descricaoEvento", e.target.value)} />
          )}

          {/* Data e horário */}
          <div className="grid grid-cols-2 gap-4">
            <Campo id="data" label={t("nova.dataInicio")} type="date" value={form.data}
              min={hojeISO()} onChange={(e) => set("data", e.target.value)} required />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {t("nova.horaInicio")} <span className="text-red-500">*</span>
              </label>
              <input type="time" value={form.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} required
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all" />
            </div>
            <Campo id="dataFim" label={t("nova.dataFim")} type="date" value={form.dataFim}
              min={form.data} onChange={(e) => set("dataFim", e.target.value)} required />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {t("nova.horaFim")} <span className="text-red-500">*</span>
              </label>
              <input type="time" value={form.horaFim} onChange={(e) => set("horaFim", e.target.value)} required
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all" />
            </div>
          </div>

          {atravessaDia && form.horaInicio && form.horaFim && (
            <p className="text-xs text-secondary flex items-center gap-1.5 ml-1">
              <Icone name="info" className="text-sm" />
              {t("nova.terminaDiaSeguinte", {
                inicio: `${form.data.split("-").reverse().join("/")} ${form.horaInicio}`,
                fim: `${form.dataFim.split("-").reverse().join("/")} ${form.horaFim}`,
              })}
            </p>
          )}

          {funcionamento?.modo === "HORARIOS_DEFINIDOS" && (
            <p className="text-xs text-on-surface-variant ml-1">
              {t("nova.avisoFuncionamento")}
            </p>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("nova.observacoes")} <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">{t("nova.opcional")}</span>
            </label>
            <textarea value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} rows={2}
              className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all resize-none" />
          </div>

          {erro && (
            <div className="bg-error/10 border border-error/25 rounded-xl p-3 flex gap-2 text-sm text-error">
              <Icone name="error_outline" className="shrink-0" />
              <p className="whitespace-pre-line">{erro}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-1">
            <button type="button" onClick={onFechar}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
              {t("comum:acoes.cancelar")}
            </button>
            <Botao type="submit" disabled={salvando}>
              {salvando ? t("nova.criando") : t("nova.criar")}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: detalhe da reserva ────────────────────────────────────────────────

function ModalDetalhe({ reserva: r, ehOperador, usuario, onFechar, onCancelar, onDecidida }) {
  const { t } = useTranslation("reservas");
  const toast = useToast();
  const cfg = STATUS_RESERVA[r.status] ?? STATUS_RESERVA.PENDENTE;
  const minha = String(usuario?.id) === String(r.solicitanteId)
    || String(usuario?.id) === String(r.responsavelId);
  const encerrada = ["CANCELADA", "CONCLUIDA", "RECUSADA", "EXPIRADA"].includes(r.status);
  const passada = new Date(r.fim) < new Date();
  const podeCancelar = (ehOperador || minha) && !encerrada && !passada;
  const podeDecidir = r.status === "PENDENTE" && podeAprovarReserva(usuario?.perfil) && !passada;

  const [recusando, setRecusando] = useState(false);
  const [justificativa, setJustificativa] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [auditoria, setAuditoria] = useState([]);

  // A trilha explica o estado atual: sem ela, "Recusada" nao diz por quem nem
  // quando, e e exatamente o que se pergunta ao abrir uma reserva encerrada.
  useEffect(() => {
    let ok = true;
    reservaApi.auditoria(r.id)
      .then((res) => { if (ok) setAuditoria(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (ok) setAuditoria([]); });
    return () => { ok = false; };
  }, [r.id]);

  async function aprovar() {
    setSalvando(true);
    try {
      await reservaApi.aprovar(r.id);
      toast.success(t("detalhe.toast.aprovada"));
      onDecidida?.();
    } catch (err) {
      toast.error(errMsg(err) || t("erros.aprovar"));
    } finally {
      setSalvando(false);
    }
  }

  async function recusar() {
    const motivo = justificativa.trim();
    if (!motivo) {
      toast.error(t("detalhe.toast.motivoObrigatorio"));
      return;
    }
    setSalvando(true);
    try {
      await reservaApi.recusar(r.id, motivo);
      toast.success(t("detalhe.toast.recusada"));
      onDecidida?.();
    } catch (err) {
      toast.error(errMsg(err) || t("erros.recusar"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-md border border-outline-variant/20 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">
              {r.tipoReserva === "EVENTO_CONDOMINIO" ? t("detalhe.tituloEvento") : t("detalhe.tituloMorador")}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{r.areaComumNome}</p>
          </div>
          <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${cfg.cor}`}>{t(cfg.rotuloKey)}</span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-on-surface">
            <span className="text-on-surface-variant">{t("detalhe.inicio")}</span> {fmtDataHora(r.inicio)}
          </p>
          <p className="text-on-surface">
            <span className="text-on-surface-variant">{t("detalhe.fim")}</span> {fmtDataHora(r.fim)}
          </p>
          <p className="text-on-surface">
            <span className="text-on-surface-variant">{t("detalhe.responsavel")}</span> {r.responsavelNome || "—"}
          </p>
          {r.descricaoEvento && (
            <p className="text-on-surface">
              <span className="text-on-surface-variant">{t("detalhe.evento")}</span> {r.descricaoEvento}
            </p>
          )}
          {r.aprovadoEm && (
            <p className="text-on-surface">
              <span className="text-on-surface-variant">{t("detalhe.confirmadaPor")}</span>{" "}
              {/* Sem nome = o espaco nao exige aprovacao: ninguem decidiu. */}
              {r.aprovadoPorNome || t("detalhe.confirmacaoAutomatica")}
              <span className="text-xs text-on-surface-variant"> · {fmtDataHora(r.aprovadoEm)}</span>
            </p>
          )}
          {r.status === "PENDENTE" && (
            <div className="flex gap-2 items-start bg-secondary/10 rounded-xl px-3 py-2">
              <Icone name="hourglass_top" className="text-secondary text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-on-surface-variant">
                {t("detalhe.aguardandoAntes")}{" "}
                <strong className="text-on-surface">{fmtDataHora(prazoAprovacao(r))}</strong>
                {t("detalhe.aguardandoDepois")}
              </p>
            </div>
          )}
          {r.canceladoPorNome && (
            <p className="text-on-surface">
              <span className="text-on-surface-variant">
                {r.status === "RECUSADA" ? t("detalhe.recusadaPor") : t("detalhe.canceladaPor")}
              </span>{" "}
              {r.canceladoPorNome}
              <span className="text-xs text-on-surface-variant"> · {fmtDataHora(r.canceladoEm)}</span>
            </p>
          )}
          {r.observacoes && (
            <p className="text-xs text-on-surface-variant bg-surface-container-highest/20 rounded-xl px-3 py-2 mt-2">
              {r.observacoes}
            </p>
          )}
          {r.motivoRecusa && (
            <div className="flex gap-2 items-start bg-error/10 rounded-xl px-3 py-2">
              <Icone name="info" className="text-error text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-error">{r.motivoRecusa}</p>
            </div>
          )}
        </div>

        {auditoria.length > 0 && (
          <div className="mt-4 pt-4 border-t border-outline-variant/15 space-y-1.5">
            <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              {t("detalhe.historicoDecisoes")}
            </p>
            {auditoria.map((a) => (
              <div key={a.id} className="text-xs text-on-surface-variant">
                <span className="text-on-surface font-medium">
                  {STATUS_RESERVA[a.statusNovo] ? t(STATUS_RESERVA[a.statusNovo].rotuloKey) : a.statusNovo}
                </span>
                {" · "}{a.autorNome || t("detalhe.sistema")}{" · "}{fmtDataHora(a.criadoEm)}
                {a.motivo && <span className="block ml-1 italic">{a.motivo}</span>}
              </div>
            ))}
          </div>
        )}

        {recusando && (
          <div className="mt-4 space-y-2">
            <label className="text-xs text-on-surface-variant ml-1">
              {t("detalhe.motivoRecusa")} <span className="text-error">*</span>
            </label>
            <textarea
              value={justificativa} rows={3} autoFocus
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder={t("detalhe.motivoPlaceholder")}
              className={`${INPUT_FILTRO} resize-none`}
            />
            <p className="text-xs text-on-surface-variant ml-1">
              {t("detalhe.motivoVisivel")}
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-5 flex-wrap">
          <button type="button" onClick={recusando ? () => setRecusando(false) : onFechar}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
            {recusando ? t("comum:acoes.voltar") : t("comum:acoes.fechar")}
          </button>
          {podeCancelar && !recusando && (
            <button type="button" onClick={onCancelar}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer">
              {t("detalhe.cancelarReserva")}
            </button>
          )}
          {podeDecidir && (
            <>
              <button type="button" disabled={salvando}
                onClick={recusando ? recusar : () => setRecusando(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-50">
                {recusando ? t("detalhe.confirmarRecusa") : t("detalhe.recusar")}
              </button>
              {!recusando && (
                <button type="button" onClick={aprovar} disabled={salvando}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:brightness-110 transition-all cursor-pointer disabled:opacity-50">
                  {t("detalhe.aprovar")}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
