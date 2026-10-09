import { useState, useEffect } from "react";
import { pollApi } from "../../services/meetingApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../contexts/AuthContext";

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

const STATUS_POLL = {
  ABERTA: { label: "Aberta", cls: "bg-primary/10 text-primary" },
  ENCERRADA: { label: "Encerrada", cls: "bg-secondary/10 text-secondary" },
  CANCELADA: { label: "Cancelada", cls: "bg-error/10 text-error" },
};

export function GerenciarVotacoes() {
  const toast = useToast();
  const confirm = useConfirm();
  const { usuario } = useAuth();
  
  const [buscaTitulo, setBuscaTitulo] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  const [form, setForm] = useState({ titulo: "", descricao: "", opcoes: "", dataHoraFim: "" });
  const [criando, setCriando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const [voteForm, setVoteForm] = useState({ pollOptionId: "" });
  const [votando, setVotando] = useState(false);

  // Busca inicial das votações do condomínio
  useEffect(() => {
    if (usuario?.condominioId) {
      buscarPollsDoCondominio();
    }
  }, [usuario]);

  async function buscarPollsDoCondominio() {
    setBuscando(true);
    setErroDetalhe("");
    setDetalhe(null);
    try {
      const res = await pollApi.listar({ condominioId: usuario.condominioId });
      setResultadosBusca(res.data || []);
      if (res.data.length === 0) setErroDetalhe("Nenhuma votação encontrada no condomínio.");
    } catch (e) {
      setErroDetalhe("Erro ao buscar votações.");
      setResultadosBusca([]);
    } finally {
      setBuscando(false);
    }
  }

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
        condominioId: usuario.condominioId,
        dataHoraFim: form.dataHoraFim || null,
        opcoes: form.opcoes
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      await pollApi.criar(payload);
      setForm({ titulo: "", descricao: "", opcoes: "", dataHoraFim: "" });
      setCriando(false);
      toast.success("Votação criada!");
      buscarPollsDoCondominio();
    } catch (e) {
      setErro(e.response?.data?.message || "Erro ao criar votação.");
    } finally {
      setSalvando(false);
    }
  }

  // A busca por título será feita filtrando a lista localmente na renderização

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
      buscarPollsDoCondominio();
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
        usuarioId: usuario.id,
      });
      setVoteForm({ pollOptionId: "" });
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
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Gestão de{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Votações
              </span>
            </h1>
          </div>
        </header>

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
            <form onSubmit={salvarPoll} className="bg-surface-container-highest/20 rounded-xl p-4 space-y-3 border border-veu/10">
              <h3 className="font-semibold text-on-surface text-sm">Nova Votação</h3>
              {erro && <p className="text-error text-xs">{erro}</p>}
              <Campo label="Título" name="titulo" value={form.titulo} onChange={handleForm} placeholder="Ex: Aprovação do orçamento" required />
              <TextArea label="Descrição" name="descricao" value={form.descricao} onChange={handleForm} rows={2} placeholder="Descrição da votação" />
              <Campo label="Data de Encerramento (opcional)" name="dataHoraFim" type="datetime-local" value={form.dataHoraFim} onChange={handleForm} />
              <Campo label="Opções (separadas por vírgula)" name="opcoes" value={form.opcoes} onChange={handleForm} placeholder="ex: Sim, Não, Abstenção" required />
              <Botao type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : "Criar Votação"}
              </Botao>
            </form>
          )}

          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 space-y-1">
                <Campo label="Buscar votação por Título" type="text" value={buscaTitulo} onChange={(e) => setBuscaTitulo(e.target.value)} placeholder="Digite o título da votação" />
              </div>
            </div>
            {erroDetalhe && <p className="text-error text-xs">{erroDetalhe}</p>}
          </div>

          {resultadosBusca.length > 0 && !detalhe && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-on-surface">Votações do Condomínio</h3>
              {resultadosBusca
                .filter(p => p.titulo.toLowerCase().includes(buscaTitulo.toLowerCase()))
                .map(poll => (
                <div key={poll.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-veu/5 border border-veu/10 hover:bg-veu/10 transition cursor-pointer" onClick={() => setDetalhe(poll)}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-on-surface">{poll.titulo}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_POLL[poll.status]?.cls ?? ""}`}>{poll.status}</span>
                    </div>
                  </div>
                  <Icone name="chevron_right" className="text-on-surface-variant hidden sm:block" />
                </div>
              ))}
            </div>
          )}

          {detalhe && (
            <div className="bg-surface-container-highest/20 rounded-xl border border-veu/10 divide-y divide-veu/5">
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-on-surface">{detalhe.titulo}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_POLL[detalhe.status]?.cls ?? ""}`}>
                      {STATUS_POLL[detalhe.status]?.label ?? detalhe.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setDetalhe(null)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-highest/50 text-on-surface hover:bg-surface-container-highest transition text-xs font-semibold cursor-pointer"
                    >
                      <Icone name="arrow_back" className="text-sm" /> Voltar
                    </button>
                    {detalhe.status === "ABERTA" && (
                      <button
                        onClick={encerrarPoll}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition text-xs font-semibold cursor-pointer"
                      >
                        <Icone name="lock" className="text-sm" /> Encerrar
                      </button>
                    )}
                  </div>
                </div>
                {detalhe.descricao && (
                  <p className="text-on-surface-variant text-xs">{detalhe.descricao}</p>
                )}
                {detalhe.dataHoraFim && (
                  <p className="text-on-surface-variant text-xs mt-1">
                    <span className="font-semibold">Encerramento:</span> {new Date(detalhe.dataHoraFim).toLocaleString("pt-BR")}
                  </p>
                )}

                {detalhe.opcoes?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Opções</p>
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const totalVotos = detalhe.opcoes.reduce((acc, op) => acc + (op.quantidadeVotos || 0), 0);
                        const mostraResultados = detalhe.status !== "ABERTA" || detalhe.usuariosQueVotaram?.includes(usuario.id);
                        
                        return detalhe.opcoes.map((op) => {
                          const votos = op.quantidadeVotos || 0;
                          const pct = totalVotos > 0 ? Math.round((votos / totalVotos) * 100) : 0;
                          
                          return (
                            <button
                              key={op.id}
                              onClick={() => !mostraResultados && setVoteForm({ pollOptionId: op.id })}
                              disabled={mostraResultados}
                              className={`relative overflow-hidden flex items-center justify-between gap-3 p-3 rounded-xl border transition-all text-left w-full sm:w-2/3 ${
                                voteForm.pollOptionId === op.id && !mostraResultados
                                  ? "bg-primary/10 border-primary text-primary"
                                  : "bg-surface-container-highest border-veu/10 text-on-surface hover:bg-surface-container-highest/80"
                              } ${mostraResultados && "cursor-default hover:bg-surface-container-highest"}`}
                            >
                              {mostraResultados && (
                                <div className="absolute top-0 left-0 h-full bg-primary/20 transition-all duration-1000" style={{ width: `${pct}%` }} />
                              )}
                              <div className="relative flex items-center gap-3 z-10">
                                {!mostraResultados && (
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                    voteForm.pollOptionId === op.id ? "border-primary" : "border-on-surface-variant"
                                  }`}>
                                    {voteForm.pollOptionId === op.id && <div className="w-2.5 h-2.5 bg-primary rounded-full" />}
                                  </div>
                                )}
                                <span className="text-sm font-medium">{op.descricao}</span>
                              </div>
                              {mostraResultados && (
                                <span className="relative z-10 text-xs font-bold text-on-surface-variant">{pct}% ({votos} votos)</span>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {detalhe.status === "ABERTA" && (
                <div className="p-4 space-y-3">
                  {detalhe.usuariosQueVotaram?.includes(usuario.id) ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-success/10 text-success text-sm font-semibold">
                      <Icone name="check_circle" className="text-base" /> Você já registrou o seu voto nesta votação!
                    </div>
                  ) : (
                    <form onSubmit={registrarVoto} className="space-y-3">
                      <Botao type="submit" disabled={votando || !voteForm.pollOptionId}>
                        {votando ? "Registrando..." : "Confirmar Voto"}
                      </Botao>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
