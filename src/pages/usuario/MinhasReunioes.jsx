import { useState, useEffect, useRef } from "react";
import { meetingApi } from "../../services/meetingApi";
import { Icone } from "../../components/icones/Icone";
import { MeetingFilters } from "../../components/meetings/MeetingFilters";
import { JoinMeetingButton } from "../../components/meetings/JoinMeetingButton";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { confirmarPresencaLocal, filtrarReunioes } from "../../utils/meetings";

const fmt = (data) => new Date(data).toLocaleString(idiomaAtual(), { dateStyle: "short", timeStyle: "short" });
import { useTranslation } from "react-i18next";
import { idiomaAtual } from "../../i18n";

export function MinhasReunioes() {
  const { t } = useTranslation("reunioes");
  const toast = useToast();
  const { usuario } = useAuth();
  const [reunioes, setReunioes] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [detalhe, setDetalhe] = useState(null);
  const [nome, setNome] = useState("");
  const [data, setData] = useState("");
  const [agora, setAgora] = useState(Date.now());
  const buscaAtual = useRef(0);
  const visiveis = filtrarReunioes(reunioes, { nome, data, futuras: true, agora });
  const detalheVisivel = detalhe && filtrarReunioes([detalhe], { futuras: true, agora }).length > 0;

  async function buscarReunioes() {
    if (!usuario?.id) return;
    const pedido = ++buscaAtual.current;
    setBuscando(true);
    try {
      const { data: lista } = await meetingApi.listar();
      if (pedido !== buscaAtual.current) return;
      setReunioes(lista || []);
      setDetalhe((anterior) => anterior ? (lista || []).find((r) => r.id === anterior.id) || null : null);
      setAgora(Date.now());
    } catch { if (pedido === buscaAtual.current) toast.error("Erro ao carregar suas reuniões."); }
    finally { if (pedido === buscaAtual.current) setBuscando(false); }
  }

  useEffect(() => {
    setDetalhe(null);
    setReunioes([]);
    buscarReunioes();
    const timer = window.setInterval(() => setAgora(Date.now()), 30000);
    window.addEventListener("focus", buscarReunioes);
    return () => { ++buscaAtual.current; window.clearInterval(timer); window.removeEventListener("focus", buscarReunioes); };
  }, [usuario?.id, usuario?.condominioId]);

  function presencaAtualizada(id, usuarioId) {
    setReunioes((lista) => lista.map((r) => r.id === id ? confirmarPresencaLocal(r, usuarioId) : r));
    setDetalhe((r) => r?.id === id ? confirmarPresencaLocal(r, usuarioId) : r);
  }

  const minhaPresenca = detalhe?.convidados?.find((c) => String(c.usuarioId) === String(usuario?.id))?.status;

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">Condomínio</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">Minhas Reuniões</h1>
          <p className="text-sm text-on-surface-variant mt-2">Acompanhe suas próximas reuniões e as que estão em andamento.</p>
        </header>
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          {!detalheVisivel ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-headline text-xl font-bold text-on-surface">Próximas reuniões</h2>
                <button type="button" onClick={buscarReunioes} disabled={buscando} aria-label="Atualizar reuniões"
                  className="p-2 rounded-xl text-on-surface-variant hover:bg-veu/5 cursor-pointer">
                  <Icone name="refresh" className={`text-xl ${buscando ? "animate-spin" : ""}`} />
                </button>
              </div>
              <MeetingFilters nome={nome} data={data} onNomeChange={setNome} onDataChange={setData} />
              {buscando && <p role="status" className="text-sm text-on-surface-variant">Carregando reuniões...</p>}
              {!buscando && visiveis.length === 0 && (
                <p className="text-center py-12 text-on-surface-variant">
                  {nome || data ? "Nenhuma reunião encontrada. Tente outro nome ou limpe a data." : "Nenhuma reunião agendada no momento."}
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visiveis.map((r) => (
                  <button type="button" key={r.id} onClick={() => setDetalhe(r)}
                    className="text-left bg-surface-container-highest/20 rounded-2xl p-4 border border-veu/10 hover:border-primary/30 transition cursor-pointer">
                    <span className="text-xs font-semibold text-primary">{new Date(r.dataHoraInicio).getTime() <= agora ? "Em andamento" : "Agendada"}</span>
                    <h3 className="font-semibold text-base text-on-surface my-2">{r.titulo}</h3>
                    <p className="text-sm text-on-surface-variant">{fmt(r.dataHoraInicio)}</p>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setDetalhe(null)} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-surface-container-highest/50 text-sm text-on-surface cursor-pointer">
                <Icone name="arrow_back" className="text-sm" /> Voltar
              </button>
              <div className="bg-surface-container-highest/20 rounded-xl border border-veu/10 p-5 space-y-4">
                <h2 className="text-xl font-bold text-on-surface">{detalhe.titulo}</h2>
                <p className="text-sm text-on-surface-variant">{detalhe.descricao || "Sem descrição."}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-on-surface">
                  <p>Início: {fmt(detalhe.dataHoraInicio)}</p>
                  <p>Fim estimado: {fmt(detalhe.dataHoraFim)}</p>
                </div>
                <p className="text-sm text-on-surface-variant">Sua presença: {minhaPresenca === "CONFIRMADO" ? "Confirmada" : minhaPresenca === "RECUSADO" ? "Recusada" : "Pendente"}</p>
                <JoinMeetingButton reuniao={detalhe} usuarioId={usuario?.id} onPresencaAtualizada={presencaAtualizada} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
