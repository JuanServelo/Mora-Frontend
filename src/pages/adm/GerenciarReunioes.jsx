// src/pages/adm/GerenciarReunioes.jsx
import { useState } from "react";
import { meetingApi, ataApi, pollApi } from "../../services/meetingApi";
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

// ─── helpers ────────────────────────────────
const STATUS_MEETING = {
  AGENDADA: { label: "Agendada", cls: "bg-primary/10 text-primary" },
  CANCELADA: { label: "Cancelada", cls: "bg-error/10 text-error" },
  FINALIZADA: { label: "Finalizada", cls: "bg-secondary/10 text-secondary" },
};

const STATUS_POLL = {
  ABERTA: { label: "Aberta", cls: "bg-primary/10 text-primary" },
  ENCERRADA: { label: "Encerrada", cls: "bg-secondary/10 text-secondary" },
  CANCELADA: { label: "Cancelada", cls: "bg-error/10 text-error" },
};

const ATTENDANCE_LABEL = {
  PENDENTE: "Pendente",
  CONFIRMADO: "Confirmado",
  RECUSADO: "Recusado",
};

function fmt(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toInputDatetime(dt) {
  if (!dt) return "";
  const d = new Date(dt);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ════════════════════════════════════════════
export function GerenciarReunioes() {
  const [aba, setAba] = useState("reunioes");

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Gestão de{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Reuniões
              </span>
            </h1>
          </div>
        </header>

        {/* Sub-navbar de abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit flex-wrap">
          {[
            { id: "reunioes", label: "Reuniões", icon: "groups" },
            { id: "votacoes", label: "Votações", icon: "how_to_vote" },
            { id: "atas", label: "Atas", icon: "description" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
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

        {aba === "reunioes" && <AbaReunioes />}
        {aba === "votacoes" && <AbaVotacoes />}
        {aba === "atas" && <AbaAtas />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: REUNIÕES
// ════════════════════════════════════════════
const EMPTY_MEETING = {
  titulo: "",
  descricao: "",
  dataHoraInicio: "",
  dataHoraFim: "",
  idOrganizador: "",
  idConvidados: "",
};

function AbaReunioes() {
  const [reunioes, setReunioes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(EMPTY_MEETING);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // busca individual por ID
  const [buscaId, setBuscaId] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  // avaliação
  const [avalForm, setAvalForm] = useState({ nota: "", comentario: "" });
  const [avalUsuarioId, setAvalUsuarioId] = useState("");
  const [salvandoAval, setSalvandoAval] = useState(false);

  function handleForm(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function salvarReuniao(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        dataHoraInicio: form.dataHoraInicio,
        dataHoraFim: form.dataHoraFim,
        idOrganizador: Number(form.idOrganizador),
        idConvidados: form.idConvidados
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number),
      };
      await meetingApi.criar(payload);
      setForm(EMPTY_MEETING);
      setCriando(false);
    } catch (e) {
      setErro(e.response?.data?.message || "Erro ao criar reunião.");
    } finally {
      setSalvando(false);
    }
  }

  async function buscarReuniao() {
    if (!buscaId) return;
    setBuscando(true);
    setErroDetalhe("");
    setDetalhe(null);
    try {
      const res = await meetingApi.buscar(buscaId);
      setDetalhe(res.data);
    } catch {
      setErroDetalhe("Reunião não encontrada.");
    } finally {
      setBuscando(false);
    }
  }

  async function cancelar(id) {
    if (!window.confirm("Cancelar esta reunião?")) return;
    try {
      await meetingApi.cancelar(id);
      setDetalhe((p) => (p ? { ...p, status: "CANCELADA" } : p));
    } catch {
      alert("Erro ao cancelar.");
    }
  }

  async function finalizar(id) {
    if (!window.confirm("Finalizar esta reunião?")) return;
    try {
      await meetingApi.finalizar(id);
      setDetalhe((p) => (p ? { ...p, status: "FINALIZADA" } : p));
    } catch {
      alert("Erro ao finalizar.");
    }
  }

  async function salvarAvaliacao(e) {
    e.preventDefault();
    if (!detalhe) return;
    setSalvandoAval(true);
    try {
      await meetingApi.avaliar(detalhe.id, Number(avalUsuarioId), {
        nota: Number(avalForm.nota),
        comentario: avalForm.comentario,
      });
      setAvalForm({ nota: "", comentario: "" });
      setAvalUsuarioId("");
      alert("Avaliação registrada!");
    } catch (e) {
      alert(e.response?.data?.message || "Erro ao avaliar.");
    } finally {
      setSalvandoAval(false);
    }
  }

  const stats = { total: reunioes.length };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <span className="p-3 rounded-xl bg-primary/10 text-primary">
            <Icone name="groups" className="text-2xl" />
          </span>
          <div>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total buscado</p>
            <p className="font-headline text-2xl font-bold">{detalhe ? 1 : 0}</p>
          </div>
        </div>
        <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
          <span className="p-3 rounded-xl bg-tertiary/10 text-tertiary">
            <Icone name="event" className="text-2xl" />
          </span>
          <div>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Status</p>
            <p className="font-headline text-2xl font-bold">
              {detalhe ? STATUS_MEETING[detalhe.status]?.label ?? detalhe.status : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-xl font-bold text-on-surface">Reuniões</h2>
          <button
            onClick={() => { setCriando(!criando); setErro(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
          >
            <Icone name={criando ? "close" : "add"} className="text-base" />
            {criando ? "Cancelar" : "Nova Reunião"}
          </button>
        </div>

        {/* Formulário criação */}
        {criando && (
          <form onSubmit={salvarReuniao} className="bg-surface-container-highest/20 rounded-xl p-4 space-y-3 border border-white/10">
            <h3 className="font-semibold text-on-surface text-sm">Nova Reunião</h3>
            {erro && <p className="text-error text-xs">{erro}</p>}
            <Campo label="Título" name="titulo" value={form.titulo} onChange={handleForm} placeholder="Ex: Reunião de Condomínio" required />
            <TextArea label="Descrição" name="descricao" value={form.descricao} onChange={handleForm} rows={2} placeholder="Descrição da reunião" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Início" id="dataHoraInicio" type="datetime-local" name="dataHoraInicio" value={form.dataHoraInicio} onChange={handleForm} required />
              <Campo label="Fim" id="dataHoraFim" type="datetime-local" name="dataHoraFim" value={form.dataHoraFim} onChange={handleForm} required />
            </div>
            <Campo label="ID do Organizador" type="number" name="idOrganizador" value={form.idOrganizador} onChange={handleForm} placeholder="Ex: 1" required />
            <Campo label="IDs dos Convidados (separados por vírgula)" name="idConvidados" value={form.idConvidados} onChange={handleForm} placeholder="ex: 1, 2, 3" />
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar Reunião"}
            </Botao>
          </form>
        )}

        {/* Busca por ID */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Campo label="Buscar reunião por ID" type="number" value={buscaId} onChange={(e) => setBuscaId(e.target.value)} placeholder="Digite o ID da reunião" />
            </div>
            <button
              onClick={buscarReuniao}
              disabled={buscando}
              className="self-end mb-0.5 flex items-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
            >
              <Icone name="search" className="text-base" />
              {buscando ? "..." : "Buscar"}
            </button>
          </div>
          {erroDetalhe && <p className="text-error text-xs">{erroDetalhe}</p>}
        </div>

        {/* Detalhe da reunião */}
        {detalhe && (
          <div className="bg-surface-container-highest/20 rounded-xl border border-white/10 divide-y divide-white/5">
            <div className="p-4 flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-on-surface">{detalhe.titulo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_MEETING[detalhe.status]?.cls ?? ""}`}>
                    {STATUS_MEETING[detalhe.status]?.label ?? detalhe.status}
                  </span>
                </div>
                {detalhe.descricao && (
                  <p className="text-on-surface-variant text-xs">{detalhe.descricao}</p>
                )}
                <div className="flex flex-wrap gap-4 text-xs text-on-surface-variant mt-1">
                  <span className="flex items-center gap-1">
                    <Icone name="schedule" className="text-sm" /> Início: {fmt(detalhe.dataHoraInicio)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icone name="event_available" className="text-sm" /> Fim: {fmt(detalhe.dataHoraFim)}
                  </span>
                  {detalhe.googleMeetLink && (
                    <a href={detalhe.googleMeetLink} target="_blank" rel="noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline">
                      <Icone name="videocam" className="text-sm" /> Google Meet
                    </a>
                  )}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {detalhe.status === "AGENDADA" && (
                  <>
                    <button
                      onClick={() => finalizar(detalhe.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary/10 text-secondary hover:bg-secondary/20 transition text-xs font-semibold cursor-pointer"
                    >
                      <Icone name="check_circle" className="text-sm" /> Finalizar
                    </button>
                    <button
                      onClick={() => cancelar(detalhe.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-xs font-semibold cursor-pointer"
                    >
                      <Icone name="cancel" className="text-sm" /> Cancelar
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Avaliação (só para FINALIZADA) */}
            {detalhe.status === "FINALIZADA" && (
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                  Registrar Avaliação
                </p>
                <form onSubmit={salvarAvaliacao} className="space-y-3">
                  <Campo label="ID do Usuário" type="number" value={avalUsuarioId} onChange={(e) => setAvalUsuarioId(e.target.value)} placeholder="Ex: 1" required />
                  <Campo label="Nota (1 a 5)" type="number" min={1} max={5} value={avalForm.nota} onChange={(e) => setAvalForm((p) => ({ ...p, nota: e.target.value }))} placeholder="1 a 5" required />
                  <TextArea label="Comentário (opcional)" value={avalForm.comentario} rows={2} onChange={(e) => setAvalForm((p) => ({ ...p, comentario: e.target.value }))} placeholder="Comentário opcional" />
                  <Botao type="submit" disabled={salvandoAval}>
                    {salvandoAval ? "Enviando..." : "Enviar Avaliação"}
                  </Botao>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: VOTAÇÕES
// ════════════════════════════════════════════
const EMPTY_POLL = { titulo: "", descricao: "", meetingId: "", opcoes: "" };

function AbaVotacoes() {
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(EMPTY_POLL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [buscaId, setBuscaId] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  // voto
  const [voteForm, setVoteForm] = useState({ pollOptionId: "", usuarioId: "" });
  const [votando, setVotando] = useState(false);

  function handleForm(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function salvarPoll(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao,
        meetingId: Number(form.meetingId),
        opcoes: form.opcoes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await pollApi.criar(payload);
      setForm(EMPTY_POLL);
      setCriando(false);
    } catch (e) {
      setErro(e.response?.data?.message || "Erro ao criar votação.");
    } finally {
      setSalvando(false);
    }
  }

  async function buscarPoll() {
    if (!buscaId) return;
    setBuscando(true);
    setErroDetalhe("");
    setDetalhe(null);
    try {
      const res = await pollApi.buscar(buscaId);
      setDetalhe(res.data);
    } catch {
      setErroDetalhe("Votação não encontrada.");
    } finally {
      setBuscando(false);
    }
  }

  async function encerrarPoll() {
    if (!detalhe) return;
    if (!window.confirm("Encerrar esta votação?")) return;
    try {
      await pollApi.encerrar(detalhe.id);
      setDetalhe((p) => (p ? { ...p, status: "ENCERRADA" } : p));
    } catch {
      alert("Erro ao encerrar votação.");
    }
  }

  async function registrarVoto(e) {
    e.preventDefault();
    if (!detalhe) return;
    setVotando(true);
    try {
      await pollApi.votar(detalhe.id, {
        pollOptionId: Number(voteForm.pollOptionId),
        usuarioId: Number(voteForm.usuarioId),
      });
      setVoteForm({ pollOptionId: "", usuarioId: "" });
      // reload poll to see updated state
      const res = await pollApi.buscar(detalhe.id);
      setDetalhe(res.data);
    } catch (e) {
      alert(e.response?.data?.message || "Erro ao registrar voto.");
    } finally {
      setVotando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-xl font-bold text-on-surface">Votações</h2>
          <button
            onClick={() => { setCriando(!criando); setErro(""); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
          >
            <Icone name={criando ? "close" : "add"} className="text-base" />
            {criando ? "Cancelar" : "Nova Votação"}
          </button>
        </div>

        {criando && (
          <form onSubmit={salvarPoll} className="bg-surface-container-highest/20 rounded-xl p-4 space-y-3 border border-white/10">
            <h3 className="font-semibold text-on-surface text-sm">Nova Votação</h3>
            {erro && <p className="text-error text-xs">{erro}</p>}
            <Campo label="Título" name="titulo" value={form.titulo} onChange={handleForm} placeholder="Ex: Aprovação do orçamento" required />
            <TextArea label="Descrição" name="descricao" value={form.descricao} onChange={handleForm} rows={2} placeholder="Descrição da votação" />
            <Campo label="ID da Reunião" type="number" name="meetingId" value={form.meetingId} onChange={handleForm} placeholder="Ex: 1" required />
            <Campo label="Opções (separadas por vírgula)" name="opcoes" value={form.opcoes} onChange={handleForm} placeholder="ex: Sim, Não, Abstenção" />
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Criar Votação"}
            </Botao>
          </form>
        )}

        {/* Busca por ID */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <div className="flex-1">
              <Campo label="Buscar votação por ID" type="number" value={buscaId} onChange={(e) => setBuscaId(e.target.value)} placeholder="Digite o ID da votação" />
            </div>
            <button
              onClick={buscarPoll}
              disabled={buscando}
              className="self-end mb-0.5 flex items-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
            >
              <Icone name="search" className="text-base" />
              {buscando ? "..." : "Buscar"}
            </button>
          </div>
          {erroDetalhe && <p className="text-error text-xs">{erroDetalhe}</p>}
        </div>

        {/* Detalhe da votação */}
        {detalhe && (
          <div className="bg-surface-container-highest/20 rounded-xl border border-white/10 divide-y divide-white/5">
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-on-surface">{detalhe.titulo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_POLL[detalhe.status]?.cls ?? ""}`}>
                    {STATUS_POLL[detalhe.status]?.label ?? detalhe.status}
                  </span>
                </div>
                {detalhe.status === "ABERTA" && (
                  <button
                    onClick={encerrarPoll}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-xs font-semibold cursor-pointer"
                  >
                    <Icone name="lock" className="text-sm" /> Encerrar
                  </button>
                )}
              </div>
              {detalhe.descricao && (
                <p className="text-on-surface-variant text-xs">{detalhe.descricao}</p>
              )}
              <p className="text-on-surface-variant text-xs">Reunião ID: {detalhe.meetingId}</p>

              {/* Opções */}
              {detalhe.opcoes?.length > 0 && (
                <div className="space-y-1 pt-2">
                  <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Opções</p>
                  <div className="flex flex-wrap gap-2">
                    {detalhe.opcoes.map((op) => (
                      <span key={op.id} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                        #{op.id} {op.descricao}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Formulário voto */}
            {detalhe.status === "ABERTA" && (
              <div className="p-4 space-y-3">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Registrar Voto</p>
                <form onSubmit={registrarVoto} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Campo label="ID do Usuário" type="number" value={voteForm.usuarioId} onChange={(e) => setVoteForm((p) => ({ ...p, usuarioId: e.target.value }))} placeholder="Ex: 1" required />
                    <Campo label="ID da Opção" type="number" value={voteForm.pollOptionId} onChange={(e) => setVoteForm((p) => ({ ...p, pollOptionId: e.target.value }))} placeholder="Ex: 1" required />
                  </div>
                  <Botao type="submit" disabled={votando}>
                    {votando ? "Registrando..." : "Votar"}
                  </Botao>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: ATAS
// ════════════════════════════════════════════
const EMPTY_ATA = { topicosDiscutidos: "", decisoesTomadas: "", idPresentes: "" };

function AbaAtas() {
  const [meetingId, setMeetingId] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  const [form, setForm] = useState(EMPTY_ATA);
  const [modo, setModo] = useState(""); // "criar" | "editar"
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function handleForm(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  async function buscarAta() {
    if (!meetingId) return;
    setBuscando(true);
    setErroDetalhe("");
    setDetalhe(null);
    setModo("");
    try {
      const res = await ataApi.buscar(meetingId);
      setDetalhe(res.data);
      setForm({
        topicosDiscutidos: res.data.topicosDiscutidos || "",
        decisoesTomadas: res.data.decisoesTomadas || "",
        idPresentes: (res.data.idPresentes || []).join(", "),
      });
    } catch {
      setErroDetalhe("Ata não encontrada para esta reunião. Você pode criar uma.");
    } finally {
      setBuscando(false);
    }
  }

  async function salvarAta(e) {
    e.preventDefault();
    setSalvando(true);
    setErro("");
    try {
      const payload = {
        topicosDiscutidos: form.topicosDiscutidos,
        decisoesTomadas: form.decisoesTomadas,
        idPresentes: form.idPresentes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number),
      };
      let res;
      if (modo === "criar") {
        res = await ataApi.registrar(meetingId, payload);
      } else {
        res = await ataApi.atualizar(meetingId, payload);
      }
      setDetalhe(res.data);
      setModo("");
    } catch (e) {
      setErro(e.response?.data?.message || "Erro ao salvar ata.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <h2 className="font-headline text-xl font-bold text-on-surface">Atas de Reunião</h2>

        {/* Busca */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Campo label="ID da Reunião" type="number" value={meetingId} onChange={(e) => setMeetingId(e.target.value)} placeholder="Digite o ID da reunião" />
          </div>
          <button
            onClick={buscarAta}
            disabled={buscando}
            className="self-end mb-0.5 flex items-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
          >
            <Icone name="search" className="text-base" />
            {buscando ? "..." : "Buscar"}
          </button>
        </div>

        {erroDetalhe && (
          <div className="flex items-center justify-between bg-surface-container-highest/20 rounded-xl p-3 border border-white/10">
            <p className="text-on-surface-variant text-sm">{erroDetalhe}</p>
            <button
              onClick={() => { setModo("criar"); setErroDetalhe(""); setForm(EMPTY_ATA); }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition text-xs font-semibold cursor-pointer"
            >
              <Icone name="add" className="text-sm" /> Criar Ata
            </button>
          </div>
        )}

        {/* Detalhe da ata */}
        {detalhe && modo === "" && (
          <div className="bg-surface-container-highest/20 rounded-xl border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                Ata da Reunião #{detalhe.meetingId}
              </p>
              <button
                onClick={() => setModo("editar")}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition text-xs font-semibold cursor-pointer"
              >
                <Icone name="edit" className="text-sm" /> Editar
              </button>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Tópicos Discutidos</p>
                <p className="text-sm text-on-surface">{detalhe.topicosDiscutidos}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Decisões Tomadas</p>
                <p className="text-sm text-on-surface">{detalhe.decisoesTomadas}</p>
              </div>
              <div>
                <p className="text-xs text-on-surface-variant mb-0.5">Presentes (IDs)</p>
                <div className="flex flex-wrap gap-1">
                  {(detalhe.idPresentes || []).map((id) => (
                    <span key={id} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
              {detalhe.dataPublicacao && (
                <p className="text-xs text-on-surface-variant">
                  Publicada em: {fmt(detalhe.dataPublicacao)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Formulário criar/editar ata */}
        {(modo === "criar" || modo === "editar") && (
          <form onSubmit={salvarAta} className="bg-surface-container-highest/20 rounded-xl p-4 space-y-3 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-on-surface text-sm">
                {modo === "criar" ? "Nova Ata" : "Editar Ata"}
              </h3>
              <button type="button" onClick={() => setModo("")}
                className="text-on-surface-variant hover:text-on-surface">
                <Icone name="close" className="text-base" />
              </button>
            </div>
            {erro && <p className="text-error text-xs">{erro}</p>}
            <TextArea label="Tópicos Discutidos" name="topicosDiscutidos" value={form.topicosDiscutidos} onChange={handleForm} rows={3} placeholder="Liste os tópicos discutidos" required />
            <TextArea label="Decisões Tomadas" name="decisoesTomadas" value={form.decisoesTomadas} onChange={handleForm} rows={3} placeholder="Liste as decisões tomadas" required />
            <Campo label="IDs dos Presentes (separados por vírgula)" name="idPresentes" value={form.idPresentes} onChange={handleForm} placeholder="ex: 1, 2, 3" required />
            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : modo === "criar" ? "Registrar Ata" : "Salvar Alterações"}
            </Botao>
          </form>
        )}
      </div>
    </div>
  );
}
