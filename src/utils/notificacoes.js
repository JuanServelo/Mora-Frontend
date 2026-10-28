import i18n, { idiomaAtual } from "../i18n";

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

  // ── portaria ────────────────────────────────────────────
  // Publicadas pelo portaria-service. Sem entrada aqui elas caem no PADRÃO,
  // que não leva a lugar nenhum — a pessoa é avisada e fica sem o que fazer.
  ENTREGA: {
    icone: "inventory_2",
    cor: "bg-secondary/15 text-secondary",
    destino: () => "/entregas",
  },
  RESERVA: {
    icone: "event_available",
    cor: "bg-primary/15 text-primary",
    // O síndico recebe com `acao: "aprovar"` e precisa cair na fila de
    // decisão; o morador cai na agenda, que é onde a reserva dele aparece.
    destino: (n) =>
      n?.dados?.acao === "aprovar" ? "/espacos?aba=aprovacoes" : "/espacos",
  },
  PRE_AUTORIZACAO: {
    icone: "how_to_reg",
    cor: "bg-tertiary/15 text-tertiary",
    destino: () => "/meus-convidados",
  },
  ALUGUEL_VAGA: {
    icone: "local_parking",
    cor: "bg-secondary/15 text-secondary",
    destino: () => "/meus-veiculos",
  },

  // ── ocorrencias ─────────────────────────────────────────
  // Chegam pela fila: o ocorrencias-service publica, o comunicacao grava.
  OCORRENCIA_RESPONDIDA: {
    icone: "report",
    cor: "bg-primary/15 text-primary",
    destino: () => "/reclamacoes",
  },
  ORDEM_SERVICO_ABERTA: {
    icone: "construction",
    cor: "bg-tertiary/15 text-tertiary",
    destino: () => "/reclamacoes",
  },
  // Esta vai para o síndico que abriu a OS.
  ORDEM_SERVICO_ATRASADA: {
    icone: "alarm",
    cor: "bg-error/15 text-error",
    destino: (n) => (n?.referenciaId ? `/adm/ordens-servico?os=${n.referenciaId}` : "/adm/ordens-servico"),
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
  if (min < 1) return i18n.t("comum:tempo.agora");
  if (min < 60) return i18n.t("comum:tempo.minutosAtras", { n: min });
  const h = Math.floor(min / 60);
  if (h < 24) return i18n.t("comum:tempo.horasAtras", { n: h });
  const d = Math.floor(h / 24);
  if (d < 7) return i18n.t("comum:tempo.diasAtras", { n: d });
  return new Date(iso).toLocaleDateString(idiomaAtual());
}

/** Rótulo do serviço que publicou, para a tela agrupar ou etiquetar. */
export const ROTULO_ORIGEM = Object.defineProperties(
  {},
  Object.fromEntries(
    ["financeiro", "comunicacao", "portaria", "gestao", "ocorrencias", "plataforma"].map((origem) => [
      origem,
      // Getter: o rótulo sai no idioma em uso na hora da leitura.
      { enumerable: true, get: () => i18n.t(`layout:origemNotificacao.${origem}`) },
    ]),
  ),
);
