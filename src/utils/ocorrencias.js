/**
 * Rótulos, cores e cálculos das telas de ocorrências e ordens de serviço.
 *
 * As listas estavam copiadas em MinhasReclamacoes e GerenciarReclamacoes; com
 * a tela de ordens de serviço seriam três cópias.
 *
 * Os rótulos são lidos na hora (getters com `i18n.t`), para acompanhar o idioma.
 */
import i18n from "../i18n";
import { formatarReais } from "./dinheiro";
import { formatarDataHora } from "./datas";

/** As mesmas do `CategoriaReclamacao` do ocorrencias-service. */
export const CATEGORIAS = [
  "BARULHO",
  "INFRAESTRUTURA",
  "LIMPEZA",
  "GARAGEM",
  "ANIMAIS",
  "ELEVADORES",
  "ILUMINACAO",
  "ELETRICA",
  "HIDRAULICA",
  "PINTURA",
  "JARDINAGEM",
  "SUGESTAO_MELHORIA",
  "OUTROS",
];

/**
 * `SUGESTAO_MELHORIA` → `Sugestao Melhoria`. Categoria que não está na
 * tradução sai do próprio código: `NOVA_CATEGORIA` → `Nova Categoria`.
 */
export const rotuloCategoria = (c) => {
  const texto = String(c ?? "");
  if (!texto) return "";
  const chave = texto.toLowerCase().replace(/_(\w)/g, (_, l) => l.toUpperCase());
  return i18n.t(`ocorrencias:categorias.${chave}`, {
    defaultValue: texto
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase()),
  });
};

/** Acrescenta ao objeto um `rotulo` traduzido na hora em que é lido. */
const comRotulo = (chave, resto) =>
  Object.defineProperty(resto, "rotulo", {
    get: () => i18n.t(`ocorrencias:${chave}`),
    enumerable: true,
  });

// ── Ocorrência ──────────────────────────────────────────────────────────────

export const STATUS_RECLAMACAO = {
  PENDENTE: comRotulo("status.reclamacao.pendente", { cor: "bg-tertiary/10 text-tertiary", icone: "schedule" }),
  EM_ANALISE: comRotulo("status.reclamacao.emAnalise", { cor: "bg-primary/10 text-primary", icone: "manage_search" }),
  RESOLVIDO: comRotulo("status.reclamacao.resolvido", { cor: "bg-green-500/10 text-green-400", icone: "check_circle" }),
};

export const statusReclamacao = (s) => STATUS_RECLAMACAO[s] ?? STATUS_RECLAMACAO.PENDENTE;

// ── Ordem de serviço ────────────────────────────────────────────────────────

export const STATUS_OS = {
  ABERTA: comRotulo("status.os.aberta", { cor: "bg-tertiary/10 text-tertiary", icone: "assignment" }),
  EM_EXECUCAO: comRotulo("status.os.emExecucao", { cor: "bg-primary/10 text-primary", icone: "construction" }),
  ATRASADA: comRotulo("status.os.atrasada", { cor: "bg-error/10 text-error", icone: "alarm" }),
  CONCLUIDA: comRotulo("status.os.concluida", { cor: "bg-green-500/10 text-green-400", icone: "task_alt" }),
};

export const statusOs = (s) => STATUS_OS[s] ?? STATUS_OS.ABERTA;

export const PRIORIDADES = {
  BAIXA: comRotulo("prioridades.baixa", { cor: "bg-veu/10 text-on-surface-variant" }),
  MEDIA: comRotulo("prioridades.media", { cor: "bg-primary/10 text-primary" }),
  ALTA: comRotulo("prioridades.alta", { cor: "bg-secondary/10 text-secondary" }),
  CRITICA: comRotulo("prioridades.critica", { cor: "bg-error/10 text-error" }),
};

export const prioridade = (p) => PRIORIDADES[p] ?? PRIORIDADES.MEDIA;

// ── Tempo ───────────────────────────────────────────────────────────────────

/**
 * Tempo decorrido entre duas datas, em palavras: "2 dias", "5 horas",
 * "menos de 1 hora".
 *
 * As datas do serviço vêm sem fuso (`2026-10-20T14:30:00`), no horário do
 * condomínio — o mesmo do navegador de quem usa o sistema.
 */
export function duracao(inicio, fim = new Date()) {
  if (!inicio) return "—";
  const ms = new Date(fim).getTime() - new Date(inicio).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const horas = Math.floor(ms / 3600000);
  if (horas < 1) return i18n.t("ocorrencias:tempo.menosDeUmaHora");
  if (horas < 24) return i18n.t("ocorrencias:tempo.horas", { count: horas });
  const dias = Math.floor(horas / 24);
  return i18n.t("ocorrencias:tempo.dias", { count: dias });
}

/**
 * O tempo da ocorrência como a tela mostra: aberta há quanto tempo ou, se
 * resolvida, em quanto tempo foi resolvida.
 */
export function tempoDaOcorrencia(rec) {
  if (rec?.status === "RESOLVIDO" && rec.resolvidoEm) {
    return i18n.t("ocorrencias:tempo.resolvidaEm", { duracao: duracao(rec.criadoEm, rec.resolvidoEm) });
  }
  return i18n.t("ocorrencias:tempo.abertaHa", { duracao: duracao(rec?.criadoEm) });
}

/** `2026-10-20T14:30:00` → `20/10/2026 14:30` (pt-BR) ou `10/20/2026 14:30` (en) */
export function dataHora(iso) {
  return formatarDataHora(iso);
}

/** Reais (o custo da OS vem em reais, não em centavos). */
export const reais = formatarReais;
