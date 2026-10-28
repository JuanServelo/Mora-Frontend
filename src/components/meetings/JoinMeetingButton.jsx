import { useState } from "react";
import { meetingApi } from "../../services/meetingApi";
import { Icone } from "../icones/Icone";

export function JoinMeetingButton({ reuniao, usuarioId, onPresencaAtualizada, liberarAntecipado = false }) {
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");
  if (!reuniao.googleMeetLink || reuniao.status !== "AGENDADA") return null;
  const agora = Date.now();
  const encerrada = agora >= new Date(reuniao.dataHoraFim).getTime();
  const liberado = !encerrada && (liberarAntecipado || agora >= new Date(reuniao.dataHoraInicio).getTime() - 15 * 60 * 1000);

  async function entrar() {
    if (entrando || !liberado) return;
    setErro("");
    // Reserve the tab during the click so the browser does not block it after the API request.
    const aba = window.open("about:blank", "_blank");
    if (!aba) { setErro("Permita a abertura de uma nova aba para entrar na reunião."); return; }
    aba.opener = null;
    setEntrando(true);
    try {
      const convidado = reuniao.convidados?.some((c) => String(c.usuarioId) === String(usuarioId));
      if (convidado) {
        await meetingApi.atualizarPresenca(reuniao.id, usuarioId, "CONFIRMADO");
        onPresencaAtualizada?.(reuniao.id, usuarioId);
      }
      aba.location.replace(reuniao.googleMeetLink);
    } catch (e) {
      aba.close();
      setErro(e.response?.data?.message || "Não foi possível registrar sua presença. Tente entrar novamente.");
    } finally { setEntrando(false); }
  }

  return (
    <div className="space-y-2">
      <button type="button" onClick={entrar} disabled={entrando || !liberado}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer">
        <span aria-hidden="true"><Icone name="videocam" className="text-base" /></span>
        {entrando ? "Registrando presença..." : encerrada ? "Reunião encerrada" : liberado ? "Entrar no Google Meet" : "Disponível 15 minutos antes do início"}
      </button>
      {erro && <p role="alert" className="text-sm text-error">{erro}</p>}
    </div>
  );
}
