const normalizar = (valor = "") => valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export function filtrarReunioes(reunioes, { nome = "", data = "", futuras = false, agora = Date.now() } = {}) {
  const termo = normalizar(nome);
  return reunioes.filter((reuniao) => {
    if (termo && !normalizar(reuniao.titulo || "").includes(termo)) return false;
    if (data && reuniao.dataHoraInicio?.slice(0, 10) !== data) return false;
    if (futuras && (reuniao.status !== "AGENDADA" || new Date(reuniao.dataHoraFim).getTime() <= agora
        || !Number.isFinite(new Date(reuniao.dataHoraFim).getTime()))) return false;
    return true;
  }).sort((a, b) => new Date(a.dataHoraInicio) - new Date(b.dataHoraInicio));
}

export function confirmarPresencaLocal(reuniao, usuarioId) {
  return { ...reuniao, convidados: (reuniao.convidados || []).map((convidado) =>
    String(convidado.usuarioId) === String(usuarioId) ? { ...convidado, status: "CONFIRMADO" } : convidado) };
}
