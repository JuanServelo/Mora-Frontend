import { useState, useEffect } from "react";
import { pollApi } from "../../services/meetingApi";
import { Icone } from "../../components/icones/Icone";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_POLL = {
  ABERTA: { label: "Aberta", cls: "bg-primary/10 text-primary" },
  ENCERRADA: { label: "Encerrada", cls: "bg-secondary/10 text-secondary" },
  CANCELADA: { label: "Cancelada", cls: "bg-error/10 text-error" },
};

export function MinhasVotacoes() {
  const toast = useToast();
  const { usuario } = useAuth();
  
  const [detalhe, setDetalhe] = useState(null);
  const [resultadosBusca, setResultadosBusca] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");

  const [voteForm, setVoteForm] = useState({ pollOptionId: "" });
  const [votando, setVotando] = useState(false);

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
              Condomínio
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Minhas{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Votações
              </span>
            </h1>
          </div>
        </header>

        <div className="glass-panel rounded-3xl p-6 space-y-4">
          {buscando && <p className="text-sm text-on-surface-variant">Buscando votações...</p>}
          {erroDetalhe && <p className="text-error text-sm">{erroDetalhe}</p>}

          {resultadosBusca.length > 0 && !detalhe && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-on-surface">Votações Disponíveis</h3>
              {resultadosBusca.map(poll => (
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
                  <button
                    onClick={() => setDetalhe(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-highest/50 text-on-surface hover:bg-surface-container-highest transition text-xs font-semibold cursor-pointer"
                  >
                    <Icone name="arrow_back" className="text-sm" /> Voltar
                  </button>
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
