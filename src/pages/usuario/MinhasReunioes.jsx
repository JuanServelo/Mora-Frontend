import { useState, useEffect } from "react";
import { meetingApi, ataApi } from "../../services/meetingApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";

const STATUS_MEETING = {
  AGENDADA: { label: "Agendada", cls: "bg-primary/10 text-primary" },
  CANCELADA: { label: "Cancelada", cls: "bg-error/10 text-error" },
  FINALIZADA: { label: "Finalizada", cls: "bg-secondary/10 text-secondary" },
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

export function MinhasReunioes() {
  const toast = useToast();
  const { usuario } = useAuth();
  
  const [reunioes, setReunioes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [ata, setAta] = useState(null);

  useEffect(() => {
    if (usuario?.id) {
      buscarReunioes();
    }
  }, [usuario]);

  async function buscarReunioes() {
    setBuscando(true);
    try {
      const res = await meetingApi.listar(usuario.id);
      setReunioes(res.data || []);
    } catch (e) {
      toast.error("Erro ao carregar suas reuniões.");
    } finally {
      setBuscando(false);
    }
  }

  async function abrirDetalhe(reuniao) {
    setDetalhe(reuniao);
    setAta(null);
    if (reuniao.status === "FINALIZADA") {
      try {
        const res = await ataApi.buscar(reuniao.id);
        setAta(res.data);
      } catch (e) {
        // Sem ata ainda
      }
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
                Reuniões
              </span>
            </h1>
          </div>
        </header>

        <div className="glass-panel rounded-3xl p-6 space-y-4">
          {!detalhe ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-xl font-bold text-on-surface">Próximas Reuniões</h2>
                <button
                  onClick={buscarReunioes}
                  className="p-2 rounded-xl text-on-surface-variant hover:bg-veu/5 hover:text-on-surface transition"
                >
                  <Icone name="refresh" className={`text-xl ${buscando ? "animate-spin" : ""}`} />
                </button>
              </div>

              {reunioes.length === 0 && !buscando ? (
                <div className="text-center py-12">
                  <Icone name="groups" className="text-5xl text-on-surface-variant mb-4" />
                  <p className="text-on-surface-variant">Nenhuma reunião agendada no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {reunioes.map((r) => (
                    <div
                      key={r.id}
                      onClick={() => abrirDetalhe(r)}
                      className="group bg-surface-container-highest/20 rounded-2xl p-4 border border-veu/10 hover:border-primary/30 hover:bg-surface-container-highest/40 transition-all cursor-pointer relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary to-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                          ID: {r.id}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_MEETING[r.status]?.cls || ""}`}>
                          {STATUS_MEETING[r.status]?.label || r.status}
                        </span>
                      </div>
                      <h3 className="font-semibold text-base text-on-surface mb-2">{r.titulo}</h3>
                      <p className="text-sm text-on-surface-variant flex items-center gap-1.5 mt-2">
                        <Icone name="event" className="text-base" /> {fmt(r.dataHoraInicio)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <button
                  onClick={() => setDetalhe(null)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-surface-container-highest/50 text-on-surface hover:bg-surface-container-highest transition text-xs font-semibold cursor-pointer"
                >
                  <Icone name="arrow_back" className="text-sm" /> Voltar
                </button>
              </div>

              <div className="bg-surface-container-highest/20 rounded-xl border border-veu/10 p-5 space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-on-surface mb-1">{detalhe.titulo}</h2>
                    <p className="text-sm text-on-surface-variant">{detalhe.descricao || "Sem descrição."}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_MEETING[detalhe.status]?.cls || ""}`}>
                    {STATUS_MEETING[detalhe.status]?.label || detalhe.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-veu/10">
                  <div>
                    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Início</p>
                    <p className="text-sm text-on-surface flex items-center gap-1.5">
                      <Icone name="event" className="text-base text-primary" />
                      {fmt(detalhe.dataHoraInicio)}
                    </p>
                  </div>
                  {detalhe.dataHoraFim && (
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Fim Estimado</p>
                      <p className="text-sm text-on-surface flex items-center gap-1.5">
                        <Icone name="event" className="text-base text-tertiary" />
                        {fmt(detalhe.dataHoraFim)}
                      </p>
                    </div>
                  )}
                  {detalhe.googleMeetLink && (
                    <div className="col-span-1 md:col-span-2">
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Link da Reunião</p>
                      <a href={detalhe.googleMeetLink} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline flex items-center gap-1.5">
                        <Icone name="link" className="text-base" /> {detalhe.googleMeetLink}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {ata && (
                <div className="bg-surface-container-highest/20 rounded-xl border border-veu/10 p-5 space-y-4 mt-4">
                  <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                    <Icone name="description" className="text-primary" /> Ata da Reunião
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Tópicos Discutidos</p>
                      <p className="text-sm text-on-surface whitespace-pre-wrap">{ata.topicosDiscutidos}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">Decisões Tomadas</p>
                      <p className="text-sm text-on-surface whitespace-pre-wrap">{ata.decisoesTomadas}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
