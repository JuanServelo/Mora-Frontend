/**
 * Aparência e destino de cada tipo de notificação.
 *
 * Estava duplicado entre a Navbar e a tela de Notificações, com ícones e cores
 * que já divergiam. Como as origens agora são várias — financeiro, comunicacao,
 * e o que vier — manter duas cópias garantiria que uma esquecesse um tipo.
 */

const TIPOS = {
  // ── financeiro ──────────────────────────────────────────
  NOVA_FATURA: {
    icone: "receipt_long",
    cor: "bg-primary/15 text-primary",
    destino: () => "/financeiro",
  },
  PAGAMENTO_CONFIRMADO: {
    icone: "check_circle",
    cor: "bg-green-500/15 text-green-400",
    destino: () => "/financeiro",
  },
  FATURA_VENCIDA: {
    icone: "warning",
    cor: "bg-error/15 text-error",
    destino: () => "/financeiro",
  },
  MULTA_APLICADA: {
    icone: "gavel",
    cor: "bg-error/15 text-error",
    destino: () => "/financeiro?aba=multas",
  },
  // A decisão sobre o recurso: deferido ou indeferido, o morador confere na aba.
  MULTA_JULGADA: {
    icone: "balance",
    cor: "bg-primary/15 text-primary",
    destino: () => "/financeiro?aba=multas",
  },

  // ── comunicacao ─────────────────────────────────────────
  // Os nomes são os do enum `TipoNotificacao` do comunicacao-service.
  CHAT: {
    icone: "forum",
    cor: "bg-tertiary/15 text-tertiary",
    // O destino sai da notificação, não do tipo: ela leva de volta à conversa
    // que a originou, cujo id o serviço grava em `referenciaId`.
    destino: (n) => (n?.referenciaId ? `/conversas/${n.referenciaId}` : "/conversas"),
  },
  AVISO: {
    icone: "campaign",
    cor: "bg-primary/15 text-primary",
    destino: () => "/avisos",
  },
};

const PADRAO = {
  icone: "info",
  cor: "bg-veu/10 text-on-surface-variant",
  destino: () => null,
};

/** Configuração de exibição de uma notificação, com destino já resolvido. */
export function configDaNotificacao(n) {
  const cfg = TIPOS[n?.tipo] ?? PADRAO;
  return {
    icone: cfg.icone,
    cor: cfg.cor,
    destino: cfg.destino(n),
  };
}

/** "agora mesmo", "3 min atrás", "2d atrás" — ou a data, se for antigo. */
export function tempoRelativo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora mesmo";
  if (min < 60) return `${min} min atrás`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d atrás`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/** Rótulo do serviço que publicou, para a tela agrupar ou etiquetar. */
export const ROTULO_ORIGEM = {
  financeiro: "Financeiro",
  comunicacao: "Mensagens",
  portaria: "Portaria",
  gestao: "Gestão",
  plataforma: "Mora",
};
