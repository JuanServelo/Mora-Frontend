// src/pages/usuario/MinhasReservas.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
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
  PENDENTE: { label: "Pendente", cor: "bg-secondary/10 text-secondary" },
  APROVADA: { label: "Aprovada", cor: "bg-primary/10 text-primary" },
  RECUSADA: { label: "Recusada", cor: "bg-error/10 text-error" },
  EXPIRADA: { label: "Expirada", cor: "bg-outline-variant/20 text-on-surface-variant" },
  CANCELADA: { label: "Cancelada", cor: "bg-outline-variant/20 text-on-surface-variant" },
  CONCLUIDA: { label: "Concluída", cor: "bg-tertiary/10 text-tertiary" },
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
  return d.toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Página ───────────────────────────────────────────────────────────────────

export function MinhasReservas() {
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

  const [aba, setAba] = useState("agenda");
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
        if (ok) setErroAreas("Não foi possível carregar as áreas comuns.");
      } finally {
        if (ok) setCarregandoAreas(false);
      }
    })();
    return () => { ok = false; };
  }, []);

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
      setErroAgenda(errMsg(err) || "Não foi possível carregar a agenda deste espaço.");
      setReservas([]);
    } finally {
      setCarregandoAgenda(false);
    }
  }, [selecionada, periodo.inicio, periodo.fim]);

  useEffect(() => { carregarAgenda(); }, [carregarAgenda]);

  async function cancelar(r) {
    // Período completo: numa reserva corrida, cancelar a partir de qualquer
    // segmento cancela tudo, e a confirmação precisa deixar isso claro.
    const periodo = `${fmtDataHora(r.inicio)} até ${fmtDataHora(r.fim)}`;
    if (!window.confirm(`Cancelar a reserva de ${periodo}?\n\nA reserva inteira será cancelada.`)) return;
    try {
      await reservaApi.cancelar(r.id);
      toast.success("Reserva cancelada.");
      setDetalhe(null);
      await carregarAgenda();
    } catch (err) {
      toast.error(errMsg(err) || "Não foi possível cancelar a reserva.");
    }
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Reservas
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            Áreas{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              & Reservas
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {selecionada
              ? "Agenda do espaço selecionado."
              : "Escolha um espaço para ver a agenda e reservar."}
          </p>
        </header>

        {/* Histórico é da operação: só porteiro e síndico enxergam. */}
        {ehOperador && (
          <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
            {[
              { id: "agenda", label: "Agenda", icon: "calendar_month" },
              ...(podeAprovar
                ? [{ id: "aprovacoes", label: "Aprovações", icon: "fact_check", badge: pendentes.length }]
                : []),
              { id: "historico", label: "Histórico", icon: "history" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAba(t.id)}
                className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  aba === t.id
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
                }`}
              >
                <Icone name={t.icon} className="text-lg" />
                {t.label}
                {t.badge > 0 && (
                  <span className="min-w-5 px-1.5 py-0.5 rounded-full bg-secondary text-on-secondary text-[10px] font-bold leading-none flex items-center justify-center">
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {aba === "aprovacoes" && podeAprovar ? (
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

function AbaAprovacoes({ pendentes, onAbrirReserva, onRecarregar }) {
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
      if (ok > 0) toast.success(`${ok} reserva${ok !== 1 ? "s" : ""} aprovada${ok !== 1 ? "s" : ""}.`);
      // Uma falha no meio do lote nao invalida as outras: cada recusa do
      // backend tem motivo proprio e precisa chegar a quem decidiu.
      falhas.forEach((f) => toast.error(f.motivo));
      setMarcadas([]);
      await onRecarregar();
    } catch (err) {
      toast.error(errMsg(err) || "Nao foi possivel aprovar as reservas selecionadas.");
    } finally {
      setSalvando(false);
    }
  }

  if (pendentes.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
        <Icone name="task_alt" className="text-5xl opacity-30" />
        <p className="text-sm max-w-md">Nenhuma solicitação aguardando aprovação.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-on-surface-variant">
          {pendentes.length} solicitação{pendentes.length !== 1 ? "ões" : ""} aguardando decisão
        </p>
        <div className="flex items-center gap-2">
          <button type="button"
            onClick={() => setMarcadas(marcadas.length === pendentes.length ? [] : pendentes.map((r) => r.id))}
            className="text-xs text-primary font-semibold hover:underline cursor-pointer">
            {marcadas.length === pendentes.length ? "Desmarcar todas" : "Selecionar todas"}
          </button>
          <Botao onClick={aprovarLote} disabled={marcadas.length === 0 || salvando}>
            Aprovar {marcadas.length > 0 ? `(${marcadas.length})` : ""}
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
                aria-label={`Selecionar reserva de ${r.responsavelNome || "responsável"}`}
                className="accent-primary w-4 h-4 mt-1 shrink-0 cursor-pointer"
              />
              <button type="button" onClick={() => onAbrirReserva(r)}
                className="flex-1 min-w-0 text-left cursor-pointer">
                <p className="font-semibold text-on-surface text-sm truncate">
                  {r.areaComumNome}
                  <span className="font-normal text-on-surface-variant"> · {r.responsavelNome || "—"}</span>
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {fmtDataHora(r.inicio)} até {fmtDataHora(r.fim)}
                </p>
                {r.descricaoEvento && (
                  <p className="text-xs text-on-surface-variant mt-0.5 truncate">{r.descricaoEvento}</p>
                )}
                <p className={`text-xs mt-1 inline-flex items-center gap-1 ${vencendo ? "text-error" : "text-on-surface-variant"}`}>
                  <Icone name="schedule" className="text-sm" />
                  Decidir até {fmtDataHora(prazo)}
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
      setErro(errMsg(err) || "Não foi possível carregar o histórico de reservas.");
      setReservas([]);
    } finally {
      setCarregando(false);
    }
  }, []);

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
          <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Filtros</h3>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
              <input
                type="checkbox" checked={incluirFuturas}
                onChange={(e) => setIncluirFuturas(e.target.checked)}
                className="accent-primary w-4 h-4"
              />
              Incluir reservas futuras
            </label>
            <button
              type="button"
              onClick={() => { setFiltros(FILTROS_HIST); setIncluirFuturas(false); }}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              Limpar filtros
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1.5 col-span-2 lg:col-span-1">
            <label className="text-xs text-on-surface-variant ml-1">Espaço</label>
            <select value={filtros.areaComumId} onChange={(e) => setF("areaComumId", e.target.value)}
              className={INPUT_FILTRO}>
              <option value="">Todos</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">De</label>
            <input type="date" value={filtros.dataInicio}
              onChange={(e) => setF("dataInicio", e.target.value)} className={INPUT_FILTRO} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">Até</label>
            <input type="date" value={filtros.dataFim}
              onChange={(e) => setF("dataFim", e.target.value)} className={INPUT_FILTRO} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">Situação</label>
            <select value={filtros.status} onChange={(e) => setF("status", e.target.value)}
              className={INPUT_FILTRO}>
              <option value="">Todas</option>
              {Object.entries(STATUS_RESERVA).map(([v, c]) => (
                <option key={v} value={v}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-on-surface-variant ml-1">Responsável</label>
            <input type="text" value={filtros.responsavel} placeholder="Nome…"
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
            <Icone name="refresh" className="text-base" />Tentar novamente
          </button>
        </div>
      ) : reservas.length === 0 ? (
        <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
          <Icone name="history" className="text-5xl opacity-30" />
          <p className="text-sm max-w-md">Nenhuma reserva registrada neste condomínio até o momento.</p>
        </div>
      ) : filtradas.length === 0 ? (
        <div className="glass-panel rounded-2xl py-12 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
          <Icone name="search_off" className="text-5xl opacity-30" />
          <p className="text-sm max-w-md">Nenhuma reserva encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-on-surface-variant">
            {filtradas.length} reserva{filtradas.length !== 1 ? "s" : ""} encontrada{filtradas.length !== 1 ? "s" : ""}
          </p>
          <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                    {["Espaço", "Responsável", "Tipo", "Início", "Fim", "Situação", "Decidido por"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {h}
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
                            {evento ? "Evento" : "Morador"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtDataHora(r.inicio)}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtDataHora(r.fim)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${cfg.cor}`}>{cfg.label}</span>
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
                                {r.aprovadoPorNome || "Automática"}
                              </span>
                              <span className="block opacity-70">{fmtDataHora(r.aprovadoEm)}</span>
                            </>
                          ) : r.status === "EXPIRADA" ? (
                            <span className="opacity-70">Prazo expirado</span>
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
        <p className="text-sm max-w-md">Nenhuma área comum disponível para reserva no momento.</p>
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
              {a.capacidadeMaxima ? `${a.capacidadeMaxima} pessoas` : "Capacidade não informada"}
            </p>
            <p className="flex items-center gap-1.5">
              <Icone name="place" className="text-sm" />
              {a.localizacao || "Localização não informada"}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            Ver agenda<Icone name="chevron_right" className="text-lg" />
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
      setErro("Informe o horário de início e de fim."); return;
    }
    const inicio = isoLocal(form.data, form.horaInicio);
    const fim = isoLocal(form.dataFim, form.horaFim);
    if (new Date(fim) <= new Date(inicio)) {
      setErro("O fim da reserva deve ser posterior ao início."); return;
    }
    if (new Date(inicio) < new Date()) {
      setErro("Não é possível reservar em data ou horário passado."); return;
    }
    if (ehEvento && !form.descricaoEvento.trim()) {
      setErro("Informe a descrição do evento."); return;
    }
    if (!ehEvento && ehOperador && !form.unidadeId) {
      setErro("Selecione a unidade responsável."); return;
    }
    if (ehOperador && !form.responsavelId) {
      setErro(ehEvento ? "Selecione o funcionário responsável." : "Selecione o morador responsável."); return;
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
        toast.success("Solicitação enviada. A reserva será confirmada após aprovação do síndico.");
      } else {
        toast.success("Reserva criada.");
      }
      onCriada();
    } catch (err) {
      setErro(errMsg(err) || "Não foi possível criar a reserva.");
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
          <h2 className="font-headline text-lg font-bold text-on-surface">Nova reserva</h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">{area.nome}</p>

        <form onSubmit={submeter} className="space-y-4">
          {ehOperador && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Tipo de reserva <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                {[
                  { v: "MORADOR", l: "Morador" },
                  { v: "EVENTO_CONDOMINIO", l: "Evento do condomínio" },
                ].map((t) => (
                  <button key={t.v} type="button" onClick={() => set("tipoReserva", t.v)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                      form.tipoReserva === t.v
                        ? "bg-primary text-on-primary border-primary"
                        : "border-outline-variant/30 text-on-surface-variant hover:bg-white/5"
                    }`}>
                    {t.l}
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
                  Bloco / Apartamento <span className="text-red-500">*</span>
                </label>
                <select value={form.unidadeId} onChange={(e) => set("unidadeId", e.target.value)}
                  className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all">
                  <option value="">Selecione a unidade…</option>
                  {apartamentos.map((a) => {
                    const temMorador = (moradoresPorUnidade.get(a.id) || []).length > 0;
                    const rotulo = `${a.blocoNome ? `${a.blocoNome} — ` : ""}Apto ${a.numero}`;
                    return (
                      <option key={a.id} value={a.id} disabled={!temMorador}>
                        {rotulo}{temMorador ? "" : " — sem morador ativo"}
                      </option>
                    );
                  })}
                </select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                  Sua unidade
                </label>
                <div className="w-full bg-surface-container-highest/20 rounded-xl py-3 px-4 text-on-surface-variant text-sm flex items-center gap-2">
                  <Icone name="lock" className="text-base" />
                  {unidadeDoMorador
                    ? `${unidadeDoMorador.blocoNome ? `${unidadeDoMorador.blocoNome} — ` : ""}Apto ${unidadeDoMorador.numero}`
                    : (usuario?.bloco && usuario?.apartamento
                        ? `${usuario.bloco} — Apto ${usuario.apartamento}`
                        : "Vinculada ao seu cadastro")}
                </div>
              </div>
            )
          )}

          {/* Responsável */}
          {ehOperador && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {ehEvento ? "Funcionário responsável" : "Morador responsável"} <span className="text-red-500">*</span>
              </label>
              <select value={form.responsavelId} onChange={(e) => set("responsavelId", e.target.value)}
                disabled={!ehEvento && !form.unidadeId}
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all disabled:opacity-50">
                <option value="">Selecione…</option>
                {(ehEvento
                  ? funcionarios.map((f) => ({ id: f.pessoaId, nome: f.nome }))
                  : moradoresDaUnidade.map((m) => ({ id: String(m.id), nome: m.nome }))
                ).map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
              </select>
              {!ehEvento && form.unidadeId && moradoresDaUnidade.length === 0 && (
                <p className="text-xs text-error ml-1">
                  Esta unidade não possui morador ativo e não pode receber reserva.
                </p>
              )}
            </div>
          )}

          {ehEvento && (
            <Campo id="descricaoEvento" label="Descrição do evento" required
              value={form.descricaoEvento} onChange={(e) => set("descricaoEvento", e.target.value)} />
          )}

          {/* Data e horário */}
          <div className="grid grid-cols-2 gap-4">
            <Campo id="data" label="Data de início" type="date" value={form.data}
              min={hojeISO()} onChange={(e) => set("data", e.target.value)} required />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Hora de início <span className="text-red-500">*</span>
              </label>
              <input type="time" value={form.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} required
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all" />
            </div>
            <Campo id="dataFim" label="Data de fim" type="date" value={form.dataFim}
              min={form.data} onChange={(e) => set("dataFim", e.target.value)} required />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Hora de fim <span className="text-red-500">*</span>
              </label>
              <input type="time" value={form.horaFim} onChange={(e) => set("horaFim", e.target.value)} required
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all" />
            </div>
          </div>

          {atravessaDia && form.horaInicio && form.horaFim && (
            <p className="text-xs text-secondary flex items-center gap-1.5 ml-1">
              <Icone name="info" className="text-sm" />
              Esta reserva termina no dia seguinte: {form.data.split("-").reverse().join("/")} {form.horaInicio} → {form.dataFim.split("-").reverse().join("/")} {form.horaFim}
            </p>
          )}

          {funcionamento?.modo === "HORARIOS_DEFINIDOS" && (
            <p className="text-xs text-on-surface-variant ml-1">
              Este espaço tem horário de funcionamento. Fora da janela, a reserva é recusada.
            </p>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Observações <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">(opcional)</span>
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
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer">
              Cancelar
            </button>
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Criando…" : "Criar reserva"}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Modal: detalhe da reserva ────────────────────────────────────────────────

function ModalDetalhe({ reserva: r, ehOperador, usuario, onFechar, onCancelar, onDecidida }) {
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
      toast.success("Reserva aprovada.");
      onDecidida?.();
    } catch (err) {
      toast.error(errMsg(err) || "Nao foi possivel aprovar a reserva.");
    } finally {
      setSalvando(false);
    }
  }

  async function recusar() {
    const motivo = justificativa.trim();
    if (!motivo) {
      toast.error("Informe o motivo da recusa - ele fica visivel para quem solicitou.");
      return;
    }
    setSalvando(true);
    try {
      await reservaApi.recusar(r.id, motivo);
      toast.success("Reserva recusada.");
      onDecidida?.();
    } catch (err) {
      toast.error(errMsg(err) || "Nao foi possivel recusar a reserva.");
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
              {r.tipoReserva === "EVENTO_CONDOMINIO" ? "Evento do condomínio" : "Reserva de morador"}
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">{r.areaComumNome}</p>
          </div>
          <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${cfg.cor}`}>{cfg.label}</span>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-on-surface">
            <span className="text-on-surface-variant">Início:</span> {fmtDataHora(r.inicio)}
          </p>
          <p className="text-on-surface">
            <span className="text-on-surface-variant">Fim:</span> {fmtDataHora(r.fim)}
          </p>
          <p className="text-on-surface">
            <span className="text-on-surface-variant">Responsável:</span> {r.responsavelNome || "—"}
          </p>
          {r.descricaoEvento && (
            <p className="text-on-surface">
              <span className="text-on-surface-variant">Evento:</span> {r.descricaoEvento}
            </p>
          )}
          {r.aprovadoEm && (
            <p className="text-on-surface">
              <span className="text-on-surface-variant">Confirmada por:</span>{" "}
              {/* Sem nome = o espaco nao exige aprovacao: ninguem decidiu. */}
              {r.aprovadoPorNome || "confirmação automática"}
              <span className="text-xs text-on-surface-variant"> · {fmtDataHora(r.aprovadoEm)}</span>
            </p>
          )}
          {r.status === "PENDENTE" && (
            <div className="flex gap-2 items-start bg-secondary/10 rounded-xl px-3 py-2">
              <Icone name="hourglass_top" className="text-secondary text-sm shrink-0 mt-0.5" />
              <p className="text-xs text-on-surface-variant">
                Aguardando aprovação do síndico. Sem decisão até{" "}
                <strong className="text-on-surface">{fmtDataHora(prazoAprovacao(r))}</strong>, a
                solicitação expira e o horário volta a ficar livre.
              </p>
            </div>
          )}
          {r.canceladoPorNome && (
            <p className="text-on-surface">
              <span className="text-on-surface-variant">
                {r.status === "RECUSADA" ? "Recusada por:" : "Cancelada por:"}
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
              Histórico de decisões
            </p>
            {auditoria.map((a) => (
              <div key={a.id} className="text-xs text-on-surface-variant">
                <span className="text-on-surface font-medium">
                  {STATUS_RESERVA[a.statusNovo]?.label ?? a.statusNovo}
                </span>
                {" · "}{a.autorNome || "sistema"}{" · "}{fmtDataHora(a.criadoEm)}
                {a.motivo && <span className="block ml-1 italic">{a.motivo}</span>}
              </div>
            ))}
          </div>
        )}

        {recusando && (
          <div className="mt-4 space-y-2">
            <label className="text-xs text-on-surface-variant ml-1">
              Motivo da recusa <span className="text-error">*</span>
            </label>
            <textarea
              value={justificativa} rows={3} autoFocus
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex.: espaço em manutenção nessa data."
              className={`${INPUT_FILTRO} resize-none`}
            />
            <p className="text-xs text-on-surface-variant ml-1">
              O motivo fica visível para quem solicitou.
            </p>
          </div>
        )}

        <div className="flex gap-3 justify-end pt-5 flex-wrap">
          <button type="button" onClick={recusando ? () => setRecusando(false) : onFechar}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer">
            {recusando ? "Voltar" : "Fechar"}
          </button>
          {podeCancelar && !recusando && (
            <button type="button" onClick={onCancelar}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer">
              Cancelar reserva
            </button>
          )}
          {podeDecidir && (
            <>
              <button type="button" disabled={salvando}
                onClick={recusando ? recusar : () => setRecusando(true)}
                className="px-4 py-2 rounded-xl text-sm font-semibold bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-50">
                {recusando ? "Confirmar recusa" : "Recusar"}
              </button>
              {!recusando && (
                <button type="button" onClick={aprovar} disabled={salvando}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-on-primary hover:brightness-110 transition-all cursor-pointer disabled:opacity-50">
                  Aprovar
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
