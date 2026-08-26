// src/pages/adm/GerenciarReunioes.jsx
import { useState, useEffect } from "react";
import { meetingApi, ataApi, pollApi } from "../../services/meetingApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../services/api";

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

function getWeekRange() {
  const now = new Date();
  
  // Início da semana (domingo)
  const start = new Date(now);
  const day = start.getDay(); // 0 é domingo, 1 é segunda...
  start.setDate(now.getDate() - day);
  start.setHours(0, 0, 0, 0);
  
  // Fim da semana (sábado)
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
}

function filtrarReunioesDaSemana(lista) {
  const { start, end } = getWeekRange();
  return lista.filter((r) => {
    const dataInicio = new Date(r.dataHoraInicio);
    return dataInicio >= start && dataInicio <= end;
  });
}

// ════════════════════════════════════════════
export function GerenciarReunioes() {
  const [aba, setAba] = useState("reunioes");
  const [reuniaoParaVotar, setReuniaoParaVotar] = useState(null);

  const irParaVotacao = (meetingId) => {
    setReuniaoParaVotar(meetingId);
    setAba("votacoes");
  };

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              Gestão de{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Reuniões
              </span>
            </h1>
          </div>
        </header>

        {/* Sub-navbar de abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "reunioes", label: "Reuniões", icon: "groups" },
            { id: "votacoes", label: "Votações", icon: "how_to_vote" },
            { id: "atas", label: "Atas", icon: "description" },
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

        {aba === "reunioes" && <AbaReunioes irParaVotacao={irParaVotacao} />}
        {aba === "votacoes" && <AbaVotacoes reuniaoPreenchida={reuniaoParaVotar} />}
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

function AbaReunioes({ irParaVotacao }) {
  const toast = useToast();
  const confirm = useConfirm();
  const { usuario } = useAuth();
  const [reunioes, setReunioes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(EMPTY_MEETING);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  // busca individual por dia
  const [buscaDia, setBuscaDia] = useState(() => {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  });
  const [resultadosBusca, setResultadosBusca] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  // Modal de confirmação premium
  const [confirmModal, setConfirmModal] = useState({ aberto: false, titulo: "", mensagem: "", onConfirmar: null });

  // avaliação
  const [avalForm, setAvalForm] = useState({ nota: "", comentario: "" });
  const [avalUsuarioId, setAvalUsuarioId] = useState("");
  const [salvandoAval, setSalvandoAval] = useState(false);

  // Ata da Reunião integrada no detalhe
  const [ataReuniao, setAtaReuniao] = useState(null);
  const [carregandoAta, setCarregandoAta] = useState(false);
  const [escrevendoAta, setEscrevendoAta] = useState(false);
  const [ataForm, setAtaForm] = useState({ topicosDiscutidos: "", decisoesTomadas: "", idPresentes: "" });
  const [salvandoAta, setSalvandoAta] = useState(false);

  // Lista de todos os usuários para picker e listagem de reuniões semanais
  const [todosUsuarios, setTodosUsuarios] = useState([]);
  const [buscaUsuario, setBuscaUsuario] = useState("");
  const [reunioesSemana, setReunioesSemana] = useState([]);
  const [carregandoSemana, setCarregandoSemana] = useState(false);

  const [votacoesReuniao, setVotacoesReuniao] = useState([]);

  useEffect(() => {
    if (detalhe?.id) {
      pollApi.listar({ meetingId: detalhe.id })
        .then((res) => setVotacoesReuniao(res.data || []))
        .catch(() => setVotacoesReuniao([]));
    } else {
      setVotacoesReuniao([]);
    }
  }, [detalhe?.id]);

  // Sistema de alertas/notificações flutuantes personalizadas
  const [notificacao, setNotificacao] = useState(null); // { mensagem: "", tipo: "sucesso" | "erro" }
  const [editandoMeetingId, setEditandoMeetingId] = useState(null);

  const mostrarNotificacao = (mensagem, tipo = "sucesso") => {
    setNotificacao({ mensagem, tipo });
    setTimeout(() => {
      setNotificacao(null);
    }, 4000);
  };

  // Carrega moradores do condomínio para seleção
  useEffect(() => {
    api.get("/api/users")
      .then((res) => {
        setTodosUsuarios(res.data.usuarios || []);
      })
      .catch((err) => console.error("Erro ao carregar moradores para picker:", err));
  }, []);

  // Carrega reuniões da semana do usuário logado
  const carregarReunioesSemana = async () => {
    if (!usuario?.id) return;
    setCarregandoSemana(true);
    try {
      const res = await meetingApi.listar(usuario.id);
      const filtradas = filtrarReunioesDaSemana(res.data || []);
      setReunioesSemana(filtradas);
    } catch (err) {
      console.error("Erro ao carregar reuniões da semana:", err);
    } finally {
      setCarregandoSemana(false);
    }
  };

  useEffect(() => {
    carregarReunioesSemana();
  }, [usuario?.id]);

  // Preenche organizador automaticamente quando criando form
  useEffect(() => {
    if (criando && usuario?.id && !editandoMeetingId) {
      setForm((p) => ({ ...p, idOrganizador: String(usuario.id) }));
    }
  }, [criando, usuario?.id, editandoMeetingId]);

  function handleForm(e) {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  }

  // Prepara formulário para Edição
  const iniciarEdicao = (reuniao) => {
    setEditandoMeetingId(reuniao.id);
    setForm({
      titulo: reuniao.titulo || "",
      descricao: reuniao.descricao || "",
      dataHoraInicio: toInputDatetime(reuniao.dataHoraInicio),
      dataHoraFim: toInputDatetime(reuniao.dataHoraFim),
      idOrganizador: String(reuniao.idOrganizador || usuario?.id || ""),
      idConvidados: (reuniao.convidados || []).map((c) => c.usuarioId).join(", "),
    });
    setCriando(true);
    setErro("");
    
    // Rola suavemente até o formulário
    setTimeout(() => {
      const el = document.getElementById("form-meeting-topo");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

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
        idOrganizador: Number(usuario?.id || form.idOrganizador),
        idConvidados: form.idConvidados
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number),
      };

      if (editandoMeetingId) {
        await meetingApi.atualizar(editandoMeetingId, payload);
        mostrarNotificacao("Reunião atualizada com sucesso!", "sucesso");
        setEditandoMeetingId(null);
      } else {
        await meetingApi.criar(payload);
        mostrarNotificacao("Reunião agendada com sucesso!", "sucesso");
      }

      setForm(EMPTY_MEETING);
      setCriando(false);
      carregarReunioesSemana();
      
      if (detalhe && detalhe.id === editandoMeetingId) {
        const res = await meetingApi.buscar(editandoMeetingId);
        setDetalhe(res.data);
        carregarAtaReuniao(editandoMeetingId);
      }
    } catch (e) {
      const msg = e.response?.data?.message || "Erro ao salvar reunião.";
      setErro(msg);
      mostrarNotificacao(msg, "erro");
    } finally {
      setSalvando(false);
    }
  }

  const carregarAtaReuniao = async (meetingId) => {
    setCarregandoAta(true);
    setAtaReuniao(null);
    setEscrevendoAta(false);
    try {
      const res = await ataApi.buscar(meetingId);
      setAtaReuniao(res.data);
      setAtaForm({
        topicosDiscutidos: res.data.topicosDiscutidos || "",
        decisoesTomadas: res.data.decisoesTomadas || "",
        idPresentes: (res.data.idPresentes || []).join(", "),
      });
    } catch {
      setAtaReuniao(null);
      setAtaForm({ topicosDiscutidos: "", decisoesTomadas: "", idPresentes: "" });
    } finally {
      setCarregandoAta(false);
    }
  };

  async function salvarAtaInline(e) {
    e.preventDefault();
    if (!detalhe) return;
    setSalvandoAta(true);
    try {
      const payload = {
        topicosDiscutidos: ataForm.topicosDiscutidos,
        decisoesTomadas: ataForm.decisoesTomadas,
        idPresentes: ataForm.idPresentes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number),
      };
      
      let res;
      if (ataReuniao) {
        res = await ataApi.atualizar(detalhe.id, payload);
        mostrarNotificacao("Ata atualizada com sucesso!", "sucesso");
      } else {
        res = await ataApi.registrar(detalhe.id, payload);
        mostrarNotificacao("Ata criada com sucesso!", "sucesso");
      }
      setAtaReuniao(res.data);
      setEscrevendoAta(false);
    } catch (err) {
      mostrarNotificacao("Erro ao salvar ata: " + (err.response?.data?.message || err.message), "erro");
    } finally {
      setSalvandoAta(false);
    }
  }

  async function buscarReunioesPorDia() {
    if (!buscaDia || !usuario?.id) return;
    setBuscando(true);
    setErroDetalhe("");
    setResultadosBusca([]);
    try {
      const res = await meetingApi.listar(usuario.id);
      const filtradas = (res.data || []).filter((r) => {
        const dataInicioStr = r.dataHoraInicio.split("T")[0];
        return dataInicioStr === buscaDia;
      });
      setResultadosBusca(filtradas);
      if (filtradas.length === 0) {
        setErroDetalhe("Nenhuma reunião encontrada para esta data.");
      }
    } catch {
      setErroDetalhe("Erro ao buscar reuniões.");
    } finally {
      setBuscando(false);
    }
  }

  async function cancelar(id) {
    const ok = await confirm({
      titulo: "Cancelar reunião",
      mensagem: "Deseja cancelar esta reunião?",
      confirmarTexto: "Cancelar reunião",
      variante: "danger",
    });
    if (!ok) return;
    try {
      await meetingApi.cancelar(id);
      setDetalhe((p) => (p ? { ...p, status: "CANCELADA" } : p));
    } catch {
      toast.error("Erro ao cancelar reunião.");
    }
  }

  async function finalizar(id) {
    const ok = await confirm({
      titulo: "Finalizar reunião",
      mensagem: "Deseja finalizar esta reunião?",
      confirmarTexto: "Finalizar",
    });
    if (!ok) return;
    try {
      await meetingApi.finalizar(id);
      setDetalhe((p) => (p ? { ...p, status: "FINALIZADA" } : p));
    } catch {
      toast.error("Erro ao finalizar reunião.");
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
      toast.success("Avaliação registrada!");
    } catch (e) {
      toast.error(e.response?.data?.message || "Erro ao avaliar.");
    } finally {
      setSalvandoAval(false);
    }
  }

  async function responderPresenca(meetingId, status) {
    try {
        await meetingApi.responderPresenca(meetingId, { status });
        toast.success("Resposta registrada!");
        carregarReunioesSemana();
        if (detalhe?.id === meetingId) {
            const res = await meetingApi.buscar(meetingId);
            setDetalhe(res.data);
        }
    } catch (err) {
        toast.error("Erro ao responder presença.");
    }
  }

  return (
    <div className="space-y-6 relative">
      {/* Alerta/Notificação Flutuante Personalizada */}
      {notificacao && (
        <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3.5 rounded-2xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-fade-in ${
          notificacao.tipo === "erro" 
            ? "bg-error/15 border-error/25 text-error shadow-error/5" 
            : "bg-primary/15 border-primary/25 text-primary shadow-primary/5"
        }`}>
          <Icone 
            name={notificacao.tipo === "erro" ? "error_outline" : "check_circle_outline"} 
            className="text-xl shrink-0 animate-pulse" 
          />
          <span className="text-xs font-semibold tracking-wide">{notificacao.mensagem}</span>
          <button 
            type="button" 
            onClick={() => setNotificacao(null)}
            className="ml-3 hover:opacity-85 transition cursor-pointer"
          >
            <Icone name="close" className="text-sm font-bold" />
          </button>
        </div>
      )}


      {/* Minhas Reuniões da Semana */}
      <div className="glass-panel rounded-3xl p-6 space-y-4 border border-white/5">
        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <Icone name="date_range" className="text-xl" />
            </span>
            <div>
              <h2 className="font-headline text-lg font-bold text-on-surface">Minhas Reuniões da Semana</h2>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                Período: {fmt(getWeekRange().start).split(" ")[0]} a {fmt(getWeekRange().end).split(" ")[0]}
              </p>
            </div>
          </div>
          <button
            onClick={carregarReunioesSemana}
            disabled={carregandoSemana}
            className="p-2 rounded-xl hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
            title="Atualizar reuniões"
          >
            <Icone name="refresh" className={`text-lg ${carregandoSemana ? "animate-spin" : ""}`} />
          </button>
        </div>

        {carregandoSemana ? (
          <div className="text-center py-8 text-on-surface-variant text-xs flex flex-col items-center justify-center gap-2">
            <Icone name="sync" className="text-lg animate-spin text-primary" />
            Carregando reuniões...
          </div>
        ) : reunioesSemana.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant text-sm flex flex-col items-center justify-center gap-2 bg-white/2 rounded-2xl border border-white/5">
            <Icone name="event_busy" className="text-3xl text-primary/40" />
            <p className="font-medium text-xs">Você não tem reuniões agendadas para esta semana.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reunioesSemana.map((reuniao) => {
              const isOrganizador = reuniao.idOrganizador === usuario?.id;
              const meuConvidado = reuniao.convidados?.find((c) => c.usuarioId === usuario?.id);
              const meuStatusPresenca = meuConvidado?.status || "PENDENTE";

              return (
                <div key={reuniao.id} className="relative bg-surface-container-highest/20 hover:bg-surface-container-highest/30 rounded-2xl border border-white/5 p-4 flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-sm text-on-surface truncate block" title={reuniao.titulo}>
                          {reuniao.titulo}
                        </span>
                        <span className="text-[10px] text-on-surface-variant/80 block">
                          ID: #{reuniao.id}
                        </span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {isOrganizador && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-tertiary/15 text-tertiary uppercase tracking-wider">
                            Organizador
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_MEETING[reuniao.status]?.cls ?? "bg-white/10 text-white"}`}>
                          {STATUS_MEETING[reuniao.status]?.label ?? reuniao.status}
                        </span>
                      </div>
                    </div>

                    {reuniao.descricao && (
                      <p className="text-on-surface-variant text-xs line-clamp-2" title={reuniao.descricao}>
                        {reuniao.descricao}
                      </p>
                    )}

                    <div className="space-y-1 pt-1 border-t border-white/5">
                      <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                        <Icone name="schedule" className="text-xs text-primary" />
                        Início: {fmt(reuniao.dataHoraInicio)}
                      </p>
                      <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                        <Icone name="event_available" className="text-xs text-primary" />
                        Fim: {fmt(reuniao.dataHoraFim)}
                      </p>
                    </div>

                    {reuniao.googleMeetLink && (
                      <div className="pt-1">
                        <a
                          href={reuniao.googleMeetLink}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                        >
                          <Icone name="videocam" className="text-sm shrink-0" />
                          Entrar no Google Meet
                        </a>
                      </div>
                    )}
                  </div>

                  {!isOrganizador && reuniao.status === "AGENDADA" && (
                    <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-on-surface-variant font-semibold uppercase tracking-wider">Sua Presença</span>
                        <span className={`text-[10px] font-bold ${
                          meuStatusPresenca === 'CONFIRMADO' ? 'text-primary' : meuStatusPresenca === 'RECUSADO' ? 'text-error' : 'text-secondary'
                        }`}>
                          {ATTENDANCE_LABEL[meuStatusPresenca] || meuStatusPresenca}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => responderPresenca(reuniao.id, 'CONFIRMADO')}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                            meuStatusPresenca === 'CONFIRMADO' 
                              ? 'bg-primary/20 text-primary border border-primary/30' 
                              : 'bg-white/5 text-on-surface-variant hover:bg-primary/10 hover:text-primary'
                          }`}
                        >
                          <Icone name="check" className="text-xs" />
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => responderPresenca(reuniao.id, 'RECUSADO')}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                            meuStatusPresenca === 'RECUSADO' 
                              ? 'bg-error/20 text-error border border-error/30' 
                              : 'bg-white/5 text-on-surface-variant hover:bg-error/10 hover:text-error'
                          }`}
                        >
                          <Icone name="close" className="text-xs" />
                          Recusar
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end pt-1 gap-3">
                    {isOrganizador && reuniao.status === "AGENDADA" && (
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(reuniao)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        <Icone name="edit" className="text-xs" />
                        Editar
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await meetingApi.buscar(reuniao.id);
                          setDetalhe(res.data);
                          carregarAtaReuniao(reuniao.id);
                          setTimeout(() => {
                            const el = document.getElementById("meeting-detalhe-container");
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        } catch {
                          mostrarNotificacao("Erro ao carregar detalhes da reunião.", "erro");
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                    >
                      Ver detalhes
                      <Icone name="arrow_forward" className="text-xs" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-headline text-xl font-bold text-on-surface">Reuniões</h2>
          <button
            onClick={() => {
              if (criando) {
                setForm(EMPTY_MEETING);
                setEditandoMeetingId(null);
              }
              setCriando(!criando);
              setErro("");
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
          >
            <Icone name={criando ? "close" : "add"} className="text-base" />
            {criando ? "Cancelar" : "Nova Reunião"}
          </button>
        </div>

        {/* Formulário criação / edição */}
        {criando && (
          <form id="form-meeting-topo" onSubmit={salvarReuniao} className="bg-surface-container-highest/20 rounded-xl p-4 space-y-4 border border-white/10">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <h3 className="font-semibold text-on-surface text-sm">
                {editandoMeetingId ? `Editar Reunião #${editandoMeetingId}` : "Nova Reunião"}
              </h3>
              {editandoMeetingId && (
                <button
                  type="button"
                  onClick={() => {
                    setForm(EMPTY_MEETING);
                    setEditandoMeetingId(null);
                    setCriando(false);
                  }}
                  className="text-primary hover:underline text-xs font-semibold cursor-pointer"
                >
                  Descartar Edição
                </button>
              )}
            </div>
            
            {erro && <p className="text-error text-xs">{erro}</p>}
            
            <Campo label="Título" name="titulo" value={form.titulo} onChange={handleForm} placeholder="Ex: Reunião de Condomínio" required />
            
            <TextArea label="Descrição" name="descricao" value={form.descricao} onChange={handleForm} rows={2} placeholder="Descrição da reunião" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Campo label="Início" id="dataHoraInicio" type="datetime-local" name="dataHoraInicio" value={form.dataHoraInicio} onChange={handleForm} required />
              <Campo label="Fim" id="dataHoraFim" type="datetime-local" name="dataHoraFim" value={form.dataHoraFim} onChange={handleForm} required />
            </div>

            {/* Indicação visual do organizador logado */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Organizador</label>
              <div className="w-full bg-surface-container-highest/40 rounded-xl py-3 px-4 text-on-surface-variant flex items-center gap-2 border border-white/5 backdrop-blur-sm">
                <Icone name="verified_user" className="text-primary text-base shrink-0" />
                <span className="text-xs font-medium">Você ({usuario?.nome || "Carregando..."})</span>
              </div>
            </div>

            {/* Seleção visual de convidados */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                Selecionar Convidados
              </label>
              
              {/* Badges de selecionados */}
              <div className="flex flex-wrap gap-2 mb-2">
                {form.idConvidados.split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((idStr) => {
                    const uId = Number(idStr);
                    const usr = todosUsuarios.find((u) => u.id === uId);
                    if (!usr) return null;
                    return (
                      <span key={uId} className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary rounded-full pl-3 pr-1.5 py-1 text-xs font-semibold backdrop-blur-sm">
                        <Icone name="person" className="text-[10px]" />
                        {usr.nome} (Apt {usr.apartamento || "—"})
                        <button
                          type="button"
                          onClick={() => {
                            const updated = form.idConvidados.split(",")
                              .map((s) => s.trim())
                              .filter((x) => x && x !== idStr)
                              .join(", ");
                            setForm((p) => ({ ...p, idConvidados: updated }));
                          }}
                          className="text-primary hover:text-error transition ml-1"
                        >
                          <Icone name="close" className="text-xs font-bold" />
                        </button>
                      </span>
                    );
                  })}
                {(!form.idConvidados || form.idConvidados.split(",").map((s) => s.trim()).filter(Boolean).length === 0) && (
                  <p className="text-xs text-on-surface-variant italic ml-1">Nenhum convidado selecionado.</p>
                )}
              </div>

              {/* Lista e Busca de Moradores */}
              <div className="bg-surface-container-highest/10 border border-white/5 rounded-2xl p-4 space-y-3">
                <Campo
                  placeholder="Buscar moradores por nome, e-mail, bloco ou apt..."
                  icon="search"
                  value={buscaUsuario}
                  onChange={(e) => setBuscaUsuario(e.target.value)}
                />
                <div className="max-h-48 overflow-y-auto divide-y divide-white/5 pr-1 custom-scrollbar">
                  {todosUsuarios
                    .filter((u) => {
                      if (u.id === usuario?.id) return false;
                      const term = buscaUsuario.toLowerCase();
                      return (
                        u.nome?.toLowerCase().includes(term) ||
                        u.email?.toLowerCase().includes(term) ||
                        u.bloco?.toLowerCase().includes(term) ||
                        u.apartamento?.includes(term)
                      );
                    })
                    .map((u) => {
                      const isSelected = form.idConvidados.split(",")
                        .map((s) => s.trim())
                        .filter(Boolean)
                        .includes(String(u.id));
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            let updated;
                            const currentIds = form.idConvidados.split(",").map((s) => s.trim()).filter(Boolean);
                            if (isSelected) {
                              updated = currentIds.filter((id) => id !== String(u.id)).join(", ");
                            } else {
                              updated = [...currentIds, String(u.id)].join(", ");
                            }
                            setForm((p) => ({ ...p, idConvidados: updated }));
                          }}
                          className={`w-full flex items-center justify-between gap-3 py-2 px-3 rounded-xl transition text-left cursor-pointer ${
                            isSelected ? "bg-primary/10 text-primary" : "hover:bg-white/5 text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Icone name="person" className="text-base shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-xs truncate">{u.nome}</p>
                              <p className="text-[10px] opacity-60 truncate">
                                Bloco {u.bloco || "—"} · Apt {u.apartamento || "—"}
                              </p>
                            </div>
                          </div>
                          <Icone name={isSelected ? "check_box" : "check_box_outline_blank"} className="text-lg shrink-0" />
                        </button>
                      );
                    })}
                  {todosUsuarios.filter((u) => u.id !== usuario?.id).length === 0 && (
                    <p className="text-center text-xs text-on-surface-variant py-4">Nenhum outro morador cadastrado.</p>
                  )}
                </div>
              </div>
            </div>

            <Botao type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : editandoMeetingId ? "Salvar Alterações" : "Criar Reunião"}
            </Botao>
          </form>
        )}

        {/* Busca por Dia */}
        <div className="space-y-4" id="busca-reuniao-dia">
          <div className="flex gap-2">
            <div className="flex-1">
              <Campo 
                label="Buscar reuniões por data" 
                type="date" 
                value={buscaDia} 
                onChange={(e) => setBuscaDia(e.target.value)} 
              />
            </div>
            <button
              onClick={buscarReunioesPorDia}
              disabled={buscando}
              className="self-end mb-0.5 flex items-center gap-2 px-5 py-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
            >
              <Icone name="search" className="text-base" />
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {erroDetalhe && <p className="text-error text-xs">{erroDetalhe}</p>}
        </div>

        {/* Resultados da busca por dia */}
        {resultadosBusca !== null && resultadosBusca.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
              Reuniões encontradas para o dia ({buscaDia.split("-").reverse().join("/")})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resultadosBusca.map((reuniao) => {
                const isOrganizador = reuniao.idOrganizador === usuario?.id;
                const meuConvidado = reuniao.convidados?.find((c) => c.usuarioId === usuario?.id);
                const meuStatusPresenca = meuConvidado?.status || "PENDENTE";

                return (
                  <div key={reuniao.id} className="relative bg-surface-container-highest/20 hover:bg-surface-container-highest/30 rounded-2xl border border-white/5 p-4 flex flex-col justify-between gap-4 transition-all duration-300 hover:scale-[1.01] hover:shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0">
                          <span className="font-semibold text-sm text-on-surface truncate block" title={reuniao.titulo}>
                            {reuniao.titulo}
                          </span>
                          <span className="text-[10px] text-on-surface-variant/80 block">
                            ID: #{reuniao.id}
                          </span>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          {isOrganizador && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-tertiary/15 text-tertiary uppercase tracking-wider">
                              Organizador
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${STATUS_MEETING[reuniao.status]?.cls ?? "bg-white/10 text-white"}`}>
                            {STATUS_MEETING[reuniao.status]?.label ?? reuniao.status}
                          </span>
                        </div>
                      </div>

                      {reuniao.descricao && (
                        <p className="text-on-surface-variant text-xs line-clamp-2" title={reuniao.descricao}>
                          {reuniao.descricao}
                        </p>
                      )}

                      <div className="space-y-1 pt-1 border-t border-white/5">
                        <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                          <Icone name="schedule" className="text-xs text-primary" />
                          Início: {fmt(reuniao.dataHoraInicio)}
                        </p>
                        <p className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                          <Icone name="event_available" className="text-xs text-primary" />
                          Fim: {fmt(reuniao.dataHoraFim)}
                        </p>
                      </div>

                      {reuniao.googleMeetLink && (
                        <div className="pt-1">
                          <a
                            href={reuniao.googleMeetLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline"
                          >
                            <Icone name="videocam" className="text-sm shrink-0" />
                            Entrar no Google Meet
                          </a>
                        </div>
                      )}
                    </div>

                    {!isOrganizador && reuniao.status === "AGENDADA" && (
                      <div className="flex items-center justify-between gap-2 bg-white/5 p-2 rounded-xl border border-white/5">
                        <div className="flex flex-col">
                          <span className="text-[9px] text-on-surface-variant font-semibold uppercase tracking-wider">Sua Presença</span>
                          <span className={`text-[10px] font-bold ${
                            meuStatusPresenca === 'CONFIRMADO' ? 'text-primary' : meuStatusPresenca === 'RECUSADO' ? 'text-error' : 'text-secondary'
                          }`}>
                            {ATTENDANCE_LABEL[meuStatusPresenca] || meuStatusPresenca}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => responderPresenca(reuniao.id, 'CONFIRMADO')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                              meuStatusPresenca === 'CONFIRMADO' 
                                ? 'bg-primary/20 text-primary border border-primary/30' 
                                : 'bg-white/5 text-on-surface-variant hover:bg-primary/10 hover:text-primary'
                            }`}
                          >
                            <Icone name="check" className="text-xs" />
                            Confirmar
                          </button>
                          <button
                            type="button"
                            onClick={() => responderPresenca(reuniao.id, 'RECUSADO')}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                              meuStatusPresenca === 'RECUSADO' 
                                ? 'bg-error/20 text-error border border-error/30' 
                                : 'bg-white/5 text-on-surface-variant hover:bg-error/10 hover:text-error'
                            }`}
                          >
                            <Icone name="close" className="text-xs" />
                            Recusar
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1 gap-3 border-t border-white/5">
                      {isOrganizador && reuniao.status === "AGENDADA" && (
                        <button
                          type="button"
                          onClick={() => iniciarEdicao(reuniao)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                        >
                          <Icone name="edit" className="text-xs" />
                          Editar
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await meetingApi.buscar(reuniao.id);
                            setDetalhe(res.data);
                            carregarAtaReuniao(reuniao.id);
                            setTimeout(() => {
                              const el = document.getElementById("meeting-detalhe-container");
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          } catch {
                            mostrarNotificacao("Erro ao carregar detalhes da reunião.", "erro");
                          }
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline cursor-pointer"
                      >
                        Ver detalhes
                        <Icone name="arrow_forward" className="text-xs" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Detalhe da reunião */}
        {detalhe && (
          <div id="meeting-detalhe-container" className="bg-surface-container-highest/20 rounded-xl border border-white/10 divide-y divide-white/5 overflow-hidden animate-fade-in">
            <div className="p-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-semibold text-on-surface">{detalhe.titulo}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_MEETING[detalhe.status]?.cls ?? ""}`}>
                    {STATUS_MEETING[detalhe.status]?.label ?? detalhe.status}
                  </span>
                </div>
                {detalhe.descricao && (
                  <p className="text-on-surface-variant text-xs">{detalhe.descricao}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-1">
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
              <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
                {detalhe.status === "AGENDADA" && (
                  <>
                    {detalhe.idOrganizador === usuario?.id && (
                      <button
                        onClick={() => iniciarEdicao(detalhe)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition text-xs font-semibold cursor-pointer"
                      >
                        <Icone name="edit" className="text-sm" /> Editar
                      </button>
                    )}
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

            {/* Convidados e Status de Presença */}
            <div className="p-5 space-y-4">
              <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                <Icone name="people" className="text-base text-primary" />
                Convidados e Presenças ({detalhe.convidados?.length || 0})
              </h4>
              
              {(!detalhe.convidados || detalhe.convidados.length === 0) ? (
                <p className="text-xs text-on-surface-variant italic pl-1">Nenhum convidado nesta reunião.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {detalhe.convidados.map((convidado) => {
                    const usr = todosUsuarios.find((u) => u.id === convidado.usuarioId);
                    const nome = usr ? usr.nome : `Usuário ID #${convidado.usuarioId}`;
                    const detalhesResidencia = usr 
                      ? `Bloco ${usr.bloco || "—"} · Apt ${usr.apartamento || "—"}` 
                      : "";
                    
                    return (
                      <div key={convidado.usuarioId} className="flex flex-col justify-between bg-white/5 border border-white/5 rounded-2xl p-4 gap-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-on-surface truncate">{nome}</p>
                            {detalhesResidencia && (
                              <p className="text-[10px] text-on-surface-variant opacity-75 truncate">{detalhesResidencia}</p>
                            )}
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                            convidado.status === "CONFIRMADO"
                              ? "bg-primary/10 text-primary border border-primary/20"
                              : convidado.status === "RECUSADO"
                              ? "bg-error/10 text-error border border-error/20"
                              : "bg-secondary/10 text-secondary border border-secondary/20"
                          }`}>
                            {ATTENDANCE_LABEL[convidado.status] || convidado.status}
                          </span>
                        </div>

                        {/* Avaliação (se houver nota/comentário) */}
                        {convidado.nota !== null && convidado.nota !== undefined && (
                          <div className="mt-1 pt-2 border-t border-white/5 space-y-1">
                            <div className="flex items-center gap-1 text-[10px] text-tertiary">
                              <span className="font-semibold uppercase tracking-wider text-[8px] text-on-surface-variant mr-1">Avaliação:</span>
                              {Array.from({ length: 5 }).map((_, idx) => (
                                <Icone 
                                  key={idx} 
                                  name="star" 
                                  className={`text-xs ${idx < convidado.nota ? "text-amber-400" : "text-white/10"}`} 
                                />
                              ))}
                            </div>
                            {convidado.comentario && (
                              <p className="text-[11px] text-on-surface-variant italic bg-white/2 p-2 rounded-xl border border-white/2 mt-1">
                                "{convidado.comentario}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Avaliação (só para FINALIZADA) */}
            {detalhe.status === "FINALIZADA" && (
              <div className="p-4 space-y-4 border-t border-white/5">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                  <Icone name="rate_review" className="text-base text-primary" />
                  Registrar Avaliação
                </p>
                <form onSubmit={salvarAvaliacao} className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                      Convidado Avaliador
                    </label>
                    <select
                      value={avalUsuarioId}
                      onChange={(e) => setAvalUsuarioId(e.target.value)}
                      required
                      className="w-full bg-surface-container-highest/40 border border-white/5 rounded-xl py-3 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
                    >
                      <option value="" className="bg-surface-container-highest text-on-surface">Selecione um convidado...</option>
                      {detalhe.convidados?.filter(c => c.status === "CONFIRMADO").map((c) => {
                        const usr = todosUsuarios.find((u) => u.id === c.usuarioId);
                        if (!usr) return null;
                        return (
                          <option key={c.usuarioId} value={c.usuarioId} className="bg-surface-container-highest text-on-surface">
                            {usr.nome} (Apt {usr.apartamento || "—"})
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <Campo label="Nota (1 a 5)" type="number" min={1} max={5} value={avalForm.nota} onChange={(e) => setAvalForm((p) => ({ ...p, nota: e.target.value }))} placeholder="1 a 5" required />
                  <TextArea label="Comentário (opcional)" value={avalForm.comentario} rows={2} onChange={(e) => setAvalForm((p) => ({ ...p, comentario: e.target.value }))} placeholder="Comentário opcional" />
                  <Botao type="submit" disabled={salvandoAval}>
                    {salvandoAval ? "Enviando..." : "Enviar Avaliação"}
                  </Botao>
                </form>
              </div>
            )}

            {/* Seção de Votações da Reunião */}
            <div className="p-5 space-y-4 border-t border-white/5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                  <Icone name="how_to_vote" className="text-base text-primary" />
                  Votações da Reunião
                </h4>
                {detalhe.idOrganizador === usuario?.id && (
                  <button
                    onClick={() => irParaVotacao(detalhe.id)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-hover shadow-lg shadow-primary/20 hover:shadow-primary/30 transition text-xs font-semibold cursor-pointer"
                  >
                    <Icone name="add" className="text-sm font-bold" /> Criar Votação
                  </button>
                )}
              </div>
              
              {votacoesReuniao.length > 0 ? (
                <div className="grid gap-2 mt-2">
                  {votacoesReuniao.map((poll) => (
                    <div key={poll.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer" onClick={() => irParaVotacao(detalhe.id)}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-on-surface">{poll.titulo}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${poll.status === 'ABERTA' ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>{poll.status}</span>
                      </div>
                      <Icone name="chevron_right" className="text-sm text-on-surface-variant" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant italic">Nenhuma votação registrada para esta reunião.</p>
              )}
            </div>

            {/* Seção da Ata da Reunião integrada */}
            {carregandoAta ? (
              <div className="p-5 text-center text-xs text-on-surface-variant flex items-center justify-center gap-2 border-t border-white/5">
                <Icone name="sync" className="text-sm animate-spin text-primary" />
                Carregando Ata...
              </div>
            ) : ataReuniao ? (
              /* Visualização e edição da Ata Existente */
              <div className="p-5 space-y-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                    <Icone name="description" className="text-base text-primary" />
                    Ata da Reunião
                  </h4>
                  {detalhe.idOrganizador === usuario?.id && !escrevendoAta && (
                    <button
                      onClick={() => setEscrevendoAta(true)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition text-xs font-semibold cursor-pointer"
                    >
                      <Icone name="edit" className="text-sm" /> Editar Ata
                    </button>
                  )}
                </div>

                {escrevendoAta ? (
                  /* Form de Edição da Ata */
                  <form onSubmit={salvarAtaInline} className="space-y-4 bg-white/5 rounded-2xl p-4 border border-white/5 animate-fade-in">
                    <TextArea
                      label="Tópicos Discutidos"
                      value={ataForm.topicosDiscutidos}
                      onChange={(e) => setAtaForm((p) => ({ ...p, topicosDiscutidos: e.target.value }))}
                      placeholder="Liste os tópicos principais discutidos..."
                      rows={3}
                      required
                    />
                    <TextArea
                      label="Decisões Tomadas"
                      value={ataForm.decisoesTomadas}
                      onChange={(e) => setAtaForm((p) => ({ ...p, decisoesTomadas: e.target.value }))}
                      placeholder="Liste as decisões e resoluções acordadas..."
                      rows={3}
                      required
                    />
                    <Campo
                      label="IDs dos Presentes (separados por vírgula)"
                      value={ataForm.idPresentes}
                      onChange={(e) => setAtaForm((p) => ({ ...p, idPresentes: e.target.value }))}
                      placeholder="ex: 1, 2, 3"
                      required
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEscrevendoAta(false)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <Botao type="submit" disabled={salvandoAta} style={{ width: "auto", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
                        {salvandoAta ? "Salvando..." : "Salvar Ata"}
                      </Botao>
                    </div>
                  </form>
                ) : (
                  /* Detalhes da Ata */
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                    <div>
                      <p className="text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">Tópicos Discutidos</p>
                      <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{ataReuniao.topicosDiscutidos}</p>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">Decisões Tomadas</p>
                      <p className="text-xs text-on-surface leading-relaxed whitespace-pre-wrap">{ataReuniao.decisoesTomadas}</p>
                    </div>
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] text-on-surface-variant uppercase font-semibold tracking-wider">Presentes na Reunião</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {(ataReuniao.idPresentes || []).map((id) => {
                          const usr = todosUsuarios.find((u) => u.id === id);
                          return (
                            <span key={id} className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-medium">
                              {usr ? usr.nome : `ID #${id}`}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                    {ataReuniao.dataPublicacao && (
                      <p className="text-[10px] text-on-surface-variant/60 italic pt-1">
                        Publicada em: {fmt(ataReuniao.dataPublicacao)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              /* Sem Ata - Se for o Organizador, mostra o botão para Criar */
              detalhe.idOrganizador === usuario?.id && (
                <div className="p-5 space-y-4 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
                      <Icone name="description" className="text-base text-primary" />
                      Ata da Reunião
                    </h4>
                    {!escrevendoAta && (
                      <button
                        onClick={() => {
                          setEscrevendoAta(true);
                          // Auto preenche presentes com os que confirmaram presença
                          const presentesIds = (detalhe.convidados || [])
                            .filter(c => c.status === "CONFIRMADO")
                            .map(c => c.usuarioId);
                          // Também inclui o organizador
                          presentesIds.push(detalhe.idOrganizador);
                          setAtaForm({
                            topicosDiscutidos: "",
                            decisoesTomadas: "",
                            idPresentes: presentesIds.join(", "),
                          });
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary hover:bg-primary-hover shadow-lg shadow-primary/20 hover:shadow-primary/30 transition text-xs font-semibold cursor-pointer"
                      >
                        <Icone name="add" className="text-sm font-bold" /> Criar Ata
                      </button>
                    )}
                  </div>

                  {escrevendoAta && (
                    <form onSubmit={salvarAtaInline} className="space-y-4 bg-white/5 rounded-2xl p-4 border border-white/5 animate-fade-in">
                      <TextArea
                        label="Tópicos Discutidos"
                        value={ataForm.topicosDiscutidos}
                        onChange={(e) => setAtaForm((p) => ({ ...p, topicosDiscutidos: e.target.value }))}
                        placeholder="Liste os tópicos principais discutidos..."
                        rows={3}
                        required
                      />
                      <TextArea
                        label="Decisões Tomadas"
                        value={ataForm.decisoesTomadas}
                        onChange={(e) => setAtaForm((p) => ({ ...p, decisoesTomadas: e.target.value }))}
                        placeholder="Liste as decisões e resoluções acordadas..."
                        rows={3}
                        required
                      />
                      <Campo
                        label="IDs dos Presentes (separados por vírgula)"
                        value={ataForm.idPresentes}
                        onChange={(e) => setAtaForm((p) => ({ ...p, idPresentes: e.target.value }))}
                        placeholder="ex: 1, 2, 3"
                        required
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEscrevendoAta(false)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <Botao type="submit" disabled={salvandoAta} style={{ width: "auto", paddingLeft: "1.5rem", paddingRight: "1.5rem" }}>
                          {salvandoAta ? "Salvando..." : "Salvar Ata"}
                        </Botao>
                      </div>
                    </form>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Modal de Confirmação Premium */}
      {confirmModal.aberto && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md transition-all duration-300 animate-fade-in"
            onClick={() => setConfirmModal({ aberto: false })}
          />
          <div className="relative w-full max-w-md glass-panel rounded-3xl p-6 border border-white/10 shadow-2xl bg-surface-container-highest/95 backdrop-blur-xl animate-scale-up space-y-6">
            <div className="flex items-center gap-4">
              <span className="p-3.5 rounded-2xl bg-warning/10 text-warning shrink-0 animate-pulse">
                <Icone name="warning" className="text-2xl" />
              </span>
              <div className="min-w-0">
                <h3 className="font-headline text-lg font-bold text-on-surface">
                  {confirmModal.titulo}
                </h3>
                <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                  {confirmModal.mensagem}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal({ aberto: false })}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-white/5 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirmar}
                className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-primary text-on-primary hover:bg-primary-hover shadow-lg shadow-primary/20 hover:shadow-primary/30 transition cursor-pointer"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: VOTAÇÕES
// ════════════════════════════════════════════
function AbaVotacoes({ reuniaoPreenchida }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [buscaId, setBuscaId] = useState("");
  const [buscaData, setBuscaData] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  const [form, setForm] = useState({ titulo: "", descricao: "", meetingId: reuniaoPreenchida || "", opcoes: "" });
  const [criando, setCriando] = useState(!!reuniaoPreenchida);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (reuniaoPreenchida) {
      setForm(p => ({ ...p, meetingId: reuniaoPreenchida }));
      setCriando(true);
      setDetalhe(null);
    }
  }, [reuniaoPreenchida]);

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
      setForm({ ...form, titulo: "", descricao: "", opcoes: "" });
      setCriando(false);
      toast.success("Votação criada!");
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
    setResultadosBusca([]);
    try {
      const res = await pollApi.buscar(buscaId);
      setDetalhe(res.data);
    } catch {
      setErroDetalhe("Votação não encontrada.");
    } finally {
      setBuscando(false);
    }
  }

  async function buscarPollsPorData() {
    if (!buscaData) return;
    setBuscando(true);
    setErroDetalhe("");
    setDetalhe(null);
    try {
      const res = await pollApi.listar({ date: buscaData });
      setResultadosBusca(res.data || []);
      if (res.data.length === 0) setErroDetalhe("Nenhuma votação encontrada para esta data.");
    } catch (e) {
      setErroDetalhe("Erro ao buscar votações.");
      setResultadosBusca([]);
    } finally {
      setBuscando(false);
    }
  }

  async function encerrarPoll() {
    if (!detalhe) return;
    const ok = await confirm({
      titulo: "Encerrar votação",
      mensagem: "Deseja encerrar esta votação?",
      confirmarTexto: "Encerrar",
      variante: "danger",
    });
    if (!ok) return;
    try {
      await pollApi.encerrar(detalhe.id);
      setDetalhe((p) => (p ? { ...p, status: "ENCERRADA" } : p));
      toast.success("Votação encerrada!");
    } catch {
      toast.error("Erro ao encerrar votação.");
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
      const res = await pollApi.buscar(detalhe.id);
      setDetalhe(res.data);
      toast.success("Voto registrado!");
    } catch (e) {
      toast.error(e.response?.data?.message || "Erro ao registrar voto.");
    } finally {
      setVotando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
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

        {/* Busca por ID ou Data */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <Campo label="Buscar votação por ID" type="number" value={buscaId} onChange={(e) => setBuscaId(e.target.value)} placeholder="Digite o ID da votação" />
              <button
                onClick={buscarPoll}
                disabled={buscando || !buscaId}
                className="w-full flex justify-center items-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
              >
                <Icone name="search" className="text-base" /> Buscar por ID
              </button>
            </div>
            <div className="flex-1 space-y-1">
              <Campo label="Buscar votações por Data" type="date" value={buscaData} onChange={(e) => setBuscaData(e.target.value)} />
              <button
                onClick={buscarPollsPorData}
                disabled={buscando || !buscaData}
                className="w-full flex justify-center items-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
              >
                <Icone name="event" className="text-base" /> Buscar por Data
              </button>
            </div>
          </div>
          {erroDetalhe && <p className="text-error text-xs">{erroDetalhe}</p>}
        </div>

        {/* Lista de Resultados da Busca por Data */}
        {resultadosBusca.length > 0 && !detalhe && (
          <div className="space-y-2">
            <h3 className="font-semibold text-sm text-on-surface">Votações de {buscaData}</h3>
            {resultadosBusca.map(poll => (
              <div key={poll.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition cursor-pointer" onClick={() => setDetalhe(poll)}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-on-surface">{poll.titulo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_POLL[poll.status]?.cls ?? ""}`}>{poll.status}</span>
                  </div>
                  <p className="text-xs text-on-surface-variant">Reunião ID: {poll.meetingId}</p>
                </div>
                <Icone name="chevron_right" className="text-on-surface-variant hidden sm:block" />
              </div>
            ))}
          </div>
        )}

        {/* Detalhe da votação */}
        {detalhe && (
          <div className="bg-surface-container-highest/20 rounded-xl border border-white/10 divide-y divide-white/5">
            <div className="p-4 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
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
      <div className="glass-panel rounded-3xl p-4 sm:p-6 space-y-4">
        <h2 className="font-headline text-xl font-bold text-on-surface">Atas de Reunião</h2>

        {/* Busca */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Campo label="ID da Reunião" type="number" value={meetingId} onChange={(e) => setMeetingId(e.target.value)} placeholder="Digite o ID da reunião" />
          </div>
          <button
            onClick={buscarAta}
            disabled={buscando}
            className="sm:self-end sm:mb-0.5 flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
          >
            <Icone name="search" className="text-base" />
            {buscando ? "..." : "Buscar"}
          </button>
        </div>

        {erroDetalhe && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-highest/20 rounded-xl p-3 border border-white/10">
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
            <div className="flex flex-wrap items-center justify-between gap-2">
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
