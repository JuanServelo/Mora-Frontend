/**
 * Apresentação das notificações — espelho de
 * comunicacao-service/model/enums/TipoNotificacao.java.
 */
export const TIPOS_NOTIFICACAO = [
  { value: "AVISO", label: "Avisos e comunicados", icon: "campaign", descricao: "Comunicados oficiais do síndico" },
  { value: "ENTREGA", label: "Encomendas", icon: "inventory_2", descricao: "Chegada de encomendas na portaria" },
  { value: "RESERVA", label: "Reservas", icon: "event_available", descricao: "Reservas de áreas comuns" },
  { value: "ALUGUEL_VAGA", label: "Vagas de garagem", icon: "local_parking", descricao: "Pedidos e respostas de aluguel de vaga" },
  { value: "PRE_AUTORIZACAO", label: "Visitantes", icon: "how_to_reg", descricao: "Autorizações de entrada" },
  { value: "CHAT", label: "Mensagens", icon: "chat", descricao: "Novas mensagens no chat" },
  { value: "SISTEMA", label: "Sistema", icon: "info", descricao: "Avisos operacionais da plataforma" },
];

const POR_TIPO = Object.fromEntries(TIPOS_NOTIFICACAO.map((t) => [t.value, t]));

export function iconeNotificacao(tipo) {
  return POR_TIPO[tipo]?.icon ?? "notifications";
}

export function labelNotificacao(tipo) {
  return POR_TIPO[tipo]?.label ?? "Notificação";
}

/**
 * Para onde o clique leva.
 *
 * `referenciaId` é o id do que originou a notificação: sem uma rota conhecida
 * para o tipo, o clique apenas marca como lida e fica onde está.
 */
export function destinoNotificacao(notificacao) {
  switch (notificacao.tipo) {
    case "AVISO":
      return "/inicio";
    case "CHAT":
      return notificacao.referenciaId ? `/mensagens?com=${notificacao.referenciaId}` : "/mensagens";
    case "ENTREGA":
      return "/entregas";
    case "RESERVA":
      return "/espacos";
    case "PRE_AUTORIZACAO":
      return "/meus-convidados";
    default:
      return null;
  }
}

/** "agora", "há 5 min", "há 3 h", "12/03" — o suficiente para uma lista. */
export function tempoRelativo(iso) {
  if (!iso) return "";
  const data = new Date(iso);
  const segundos = Math.floor((Date.now() - data.getTime()) / 1000);
  if (Number.isNaN(segundos)) return "";
  if (segundos < 60) return "agora";
  if (segundos < 3600) return `há ${Math.floor(segundos / 60)} min`;
  if (segundos < 86400) return `há ${Math.floor(segundos / 3600)} h`;
  if (segundos < 604800) return `há ${Math.floor(segundos / 86400)} d`;
  return data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
