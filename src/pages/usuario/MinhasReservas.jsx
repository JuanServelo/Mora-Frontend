// src/pages/usuario/MinhasReservas.jsx
import { useState, useEffect, useCallback } from "react";
import { areaComunApi } from "../../services/estruturasApi";
import { reservaApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";

const TIPO_ICONE = {
  PISCINA: "pool",
  SALAO_FESTAS: "celebration",
  ACADEMIA: "fitness_center",
  CHURRASQUEIRA: "outdoor_grill",
  QUADRA: "sports_tennis",
  PLAYGROUND: "child_friendly",
  GYM: "fitness_center",
  OUTRO: "meeting_room",
};

const STATUS_RESERVA = {
  PENDENTE:  { label: "Pendente",  color: "bg-secondary/10 text-secondary" },
  APROVADA:  { label: "Aprovada",  color: "bg-primary/10 text-primary" },
  RECUSADA:  { label: "Recusada",  color: "bg-error/10 text-error" },
  CANCELADA: { label: "Cancelada", color: "bg-outline-variant/20 text-on-surface-variant" },
  CONCLUIDA: { label: "Concluída", color: "bg-tertiary/10 text-tertiary" },
};

function tipoParaIcone(tipo) {
  return TIPO_ICONE[tipo] || "meeting_room";
}

function mapAreaApi(a) {
  const taxa = Number(a.taxaLocacao);
  const taxaLoc = Number.isFinite(taxa) ? taxa : 0;
  const partesRegras = [a.observacoes, a.politicaCancelamento, a.informacoesLimpeza].filter(Boolean);
  return {
    id: a.id,
    nome: a.nome,
    descricao: a.descricao || "",
    capacidade: a.capacidadeMaxima ?? "—",
    taxaLocacao: taxaLoc,
    regras: partesRegras.length ? partesRegras.join("\n\n") : null,
    status: a.ativo ? "Ativo" : "Inativo",
    icon: tipoParaIcone(a.tipo),
    disponivel: Boolean(a.ativo && a.podeReservar),
    raw: a,
  };
}

function fmtData(iso) {
  if (!iso) return "—";
  const parts = String(iso).split("T")[0].split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

const areaStatusColor = (s) => {
  if (s === "Ativo") return "bg-primary/10 text-primary";
  if (s === "Inativo") return "bg-tertiary/10 text-tertiary";
  return "bg-error/10 text-error";
};

export function MinhasReservas() {
  const [aba, setAba] = useState("areas");

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-8">
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
            Reserve áreas comuns e acompanhe suas solicitações.
          </p>
        </header>

        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "areas", label: "Áreas Disponíveis", icon: "meeting_room" },
            { id: "minhas", label: "Minhas Reservas", icon: "event_available" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
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

        {aba === "areas" && <AbaAreas onSucesso={() => setAba("minhas")} />}
        {aba === "minhas" && <AbaMinhasReservas />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: ÁREAS DISPONÍVEIS
// ════════════════════════════════════════════
const FORM_INICIAL = { dataInicio: "", horaInicio: "", dataFim: "", horaFim: "", observacoes: "" };

function AbaAreas({ onSucesso }) {
  const toast = useToast();
  const [areas, setAreas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [selecionada, setSelecionada] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erroReserva, setErroReserva] = useState(null);

  useEffect(() => {
    let ok = true;
    (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const res = await areaComunApi.listar();
        const lista = Array.isArray(res.data) ? res.data : res.data?.areas || [];
        if (ok) setAreas(lista.map(mapAreaApi));
      } catch {
        if (ok) {
          setErro("Não foi possível carregar as áreas. Verifique se a API de estruturas está disponível.");
          setAreas([]);
        }
      } finally {
        if (ok) setCarregando(false);
      }
    })();
    return () => { ok = false; };
  }, []);

  const area = areas.find((a) => a.id === selecionada);

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  async function confirmarReserva(e) {
    e.preventDefault();
    setErroReserva(null);
    if (form.dataInicio && form.dataFim && form.dataInicio > form.dataFim) {
      setErroReserva("A data de fim não pode ser anterior à data de início.");
      return;
    }
    setSalvando(true);
    try {
      await reservaApi.solicitar({
        areaComunId: selecionada,
        dataInicio: form.dataInicio,
        dataFim: form.dataFim,
        horaInicio: form.horaInicio || null,
        horaFim: form.horaFim || null,
        observacoes: form.observacoes || null,
      });
      toast.success("Reserva solicitada com sucesso! Aguarde aprovação da administração.");
      setSelecionada(null);
      setForm(FORM_INICIAL);
      onSucesso();
    } catch (err) {
      setErroReserva(
        err.response?.data?.mensagem ||
        err.response?.data?.message ||
        "Não foi possível solicitar a reserva. Tente novamente."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="glass-panel rounded-2xl py-20 flex justify-center text-on-surface-variant">
        Carregando áreas…
      </div>
    );
  }

  if (erro) {
    return (
      <div className="glass-panel rounded-2xl p-5 sm:p-8 border border-error/20 text-on-surface-variant text-sm">
        {erro}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {areas.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => a.disponivel && setSelecionada(a.id === selecionada ? null : a.id)}
            disabled={!a.disponivel}
            className={`glass-panel rounded-2xl p-4 sm:p-5 text-left transition-all duration-200 space-y-3
              ${a.disponivel ? "cursor-pointer hover:ring-2 hover:ring-primary/40" : "opacity-50 cursor-not-allowed"}
              ${selecionada === a.id ? "ring-2 ring-primary" : ""}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icone name={a.icon} className="text-primary text-2xl" />
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${areaStatusColor(a.status)}`}>
                {a.status}
              </span>
            </div>
            <div>
              <p className="font-bold text-on-surface">{a.nome}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">{a.descricao}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-on-surface-variant">
              <span className="flex items-center gap-1">
                <Icone name="group" className="text-sm" /> {a.capacidade} pessoas
              </span>
              {a.taxaLocacao > 0 ? (
                <span className="font-semibold text-on-surface">R$ {a.taxaLocacao}</span>
              ) : (
                <span className="text-primary font-semibold">Gratuito</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {areas.length === 0 && (
        <div className="glass-panel rounded-2xl py-12 sm:py-16 px-4 text-center flex flex-col items-center gap-3 text-on-surface-variant">
          <Icone name="meeting_room" className="text-5xl opacity-30" />
          <p className="text-sm text-center max-w-md">
            Nenhuma área comum disponível para reserva no momento.
          </p>
        </div>
      )}

      {selecionada && area && (
        <div className="glass-panel rounded-2xl p-4 sm:p-6 space-y-5">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icone name={area.icon} className="text-primary text-2xl" />
            </div>
            <div className="min-w-0">
              <h2 className="font-headline text-lg sm:text-xl font-bold text-on-surface">Reservar — {area.nome}</h2>
              <p className="text-xs text-on-surface-variant">{area.descricao}</p>
            </div>
          </div>

          {area.regras && (
            <div className="bg-tertiary/5 border border-tertiary/20 rounded-xl p-4 flex gap-3">
              <Icone name="info" className="text-tertiary text-xl shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-tertiary mb-1">Regras e informações</p>
                <p className="text-sm text-on-surface-variant whitespace-pre-line">{area.regras}</p>
              </div>
            </div>
          )}

          {erroReserva && (
            <div className="bg-error/10 border border-error/25 rounded-xl p-4 flex gap-3 text-sm text-error">
              <Icone name="error_outline" className="text-error shrink-0" />
              <p>{erroReserva}</p>
            </div>
          )}

          <form onSubmit={confirmarReserva} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Campo
                label="Data de início"
                name="dataInicio"
                type="date"
                value={form.dataInicio}
                onChange={handleForm}
                required
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                  Horário de início <span className="font-normal text-on-surface-variant/60">(opcional)</span>
                </label>
                <input
                  type="time"
                  name="horaInicio"
                  value={form.horaInicio}
                  onChange={handleForm}
                  className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
                />
              </div>
              <Campo
                label="Data de fim"
                name="dataFim"
                type="date"
                value={form.dataFim}
                onChange={handleForm}
                required
              />
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                  Horário de fim <span className="font-normal text-on-surface-variant/60">(opcional)</span>
                </label>
                <input
                  type="time"
                  name="horaFim"
                  value={form.horaFim}
                  onChange={handleForm}
                  className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Observações <span className="font-normal text-on-surface-variant/60">(opcional)</span>
              </label>
              <textarea
                name="observacoes"
                value={form.observacoes}
                onChange={handleForm}
                rows={3}
                placeholder="Informações adicionais para a administração..."
                className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all resize-none"
              />
            </div>

            {area.taxaLocacao > 0 && (
              <div className="bg-surface-container-highest/30 rounded-xl p-4 flex justify-between text-sm">
                <span className="text-on-surface-variant">Taxa de locação (referência)</span>
                <span className="text-on-surface font-bold">R$ {area.taxaLocacao}</span>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
              <button
                type="button"
                onClick={() => { setSelecionada(null); setErroReserva(null); }}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <Botao type="submit" disabled={salvando}>
                <span className="flex items-center gap-2">
                  <Icone name="event_available" className="text-lg" />
                  {salvando ? "Enviando…" : "Solicitar reserva"}
                </span>
              </Botao>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: MINHAS RESERVAS
// ════════════════════════════════════════════
function AbaMinhasReservas() {
  const toast = useToast();
  const [reservas, setReservas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [cancelando, setCancelando] = useState(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const res = await reservaApi.listarMinhas();
      setReservas(res.data || []);
    } catch {
      // silent — pode não ter reservas ainda
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleCancelar(id) {
    if (!confirm("Tem certeza que deseja cancelar esta reserva?")) return;
    setCancelando(id);
    try {
      const res = await reservaApi.cancelar(id);
      setReservas((prev) => prev.map((r) => r.id === id ? res.data : r));
      toast.success("Reserva cancelada.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao cancelar reserva.");
    } finally {
      setCancelando(null);
    }
  }

  if (carregando) {
    return (
      <div className="glass-panel rounded-2xl py-14 sm:py-20 flex justify-center text-on-surface-variant">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (reservas.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-14 sm:py-20 flex flex-col items-center gap-4 text-on-surface-variant px-4 text-center">
        <Icone name="event_busy" className="text-5xl opacity-30" />
        <p className="text-sm max-w-md">
          Você ainda não fez nenhuma solicitação de reserva. Selecione uma área na aba ao lado para solicitar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-on-surface-variant">
        {reservas.length} reserva{reservas.length !== 1 ? "s" : ""} encontrada{reservas.length !== 1 ? "s" : ""}
      </p>
      {reservas.map((r) => {
        const cfg = STATUS_RESERVA[r.status] ?? STATUS_RESERVA.PENDENTE;
        const podeCancel = r.status === "PENDENTE" || r.status === "APROVADA";
        return (
          <div key={r.id} className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-on-surface">{r.areaComunNome ?? "Área comum"}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {fmtData(r.dataInicio)}
                  {r.dataFim !== r.dataInicio ? ` → ${fmtData(r.dataFim)}` : ""}
                  {r.horaInicio ? ` · ${r.horaInicio.slice(0, 5)}` : ""}
                  {r.horaFim ? ` – ${r.horaFim.slice(0, 5)}` : ""}
                </p>
              </div>
              <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${cfg.color}`}>
                {cfg.label}
              </span>
            </div>

            {r.observacoes && (
              <p className="text-xs text-on-surface-variant bg-surface-container-highest/20 rounded-xl px-3 py-2">
                {r.observacoes}
              </p>
            )}

            {r.motivoRecusa && (
              <div className="flex gap-2 items-start bg-error/10 rounded-xl px-3 py-2">
                <Icone name="info" className="text-error text-sm shrink-0 mt-0.5" />
                <p className="text-xs text-error">{r.motivoRecusa}</p>
              </div>
            )}

            {podeCancel && (
              <button
                type="button"
                onClick={() => handleCancelar(r.id)}
                disabled={cancelando === r.id}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {cancelando === r.id ? "Cancelando…" : "Cancelar reserva"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
