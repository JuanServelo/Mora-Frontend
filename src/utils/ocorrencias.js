/**
 * Rótulos, cores e cálculos das telas de ocorrências e ordens de serviço.
 *
 * As listas estavam copiadas em MinhasReclamacoes e GerenciarReclamacoes; com
 * a tela de ordens de serviço seriam três cópias.
 */

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

/** `SUGESTAO_MELHORIA` → `Sugestao Melhoria` */
export const rotuloCategoria = (c) =>
  String(c ?? "")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());

// ── Ocorrência ──────────────────────────────────────────────────────────────

export const STATUS_RECLAMACAO = {
  PENDENTE: { rotulo: "Pendente", cor: "bg-tertiary/10 text-tertiary", icone: "schedule" },
  EM_ANALISE: { rotulo: "Em análise", cor: "bg-primary/10 text-primary", icone: "manage_search" },
  RESOLVIDO: { rotulo: "Resolvida", cor: "bg-green-500/10 text-green-400", icone: "check_circle" },
};

export const statusReclamacao = (s) => STATUS_RECLAMACAO[s] ?? STATUS_RECLAMACAO.PENDENTE;

// ── Ordem de serviço ────────────────────────────────────────────────────────

export const STATUS_OS = {
  ABERTA: { rotulo: "Aberta", cor: "bg-tertiary/10 text-tertiary", icone: "assignment" },
  EM_EXECUCAO: { rotulo: "Em execução", cor: "bg-primary/10 text-primary", icone: "construction" },
  ATRASADA: { rotulo: "Atrasada", cor: "bg-error/10 text-error", icone: "alarm" },
  CONCLUIDA: { rotulo: "Concluída", cor: "bg-green-500/10 text-green-400", icone: "task_alt" },
};

export const statusOs = (s) => STATUS_OS[s] ?? STATUS_OS.ABERTA;

export const PRIORIDADES = {
  BAIXA: { rotulo: "Baixa", cor: "bg-veu/10 text-on-surface-variant" },
  MEDIA: { rotulo: "Média", cor: "bg-primary/10 text-primary" },
  ALTA: { rotulo: "Alta", cor: "bg-secondary/10 text-secondary" },
  CRITICA: { rotulo: "Crítica", cor: "bg-error/10 text-error" },
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
  if (horas < 1) return "menos de 1 hora";
  if (horas < 24) return `${horas} hora${horas > 1 ? "s" : ""}`;
  const dias = Math.floor(horas / 24);
  return `${dias} dia${dias > 1 ? "s" : ""}`;
}

/**
 * O tempo da ocorrência como a tela mostra: aberta há quanto tempo ou, se
 * resolvida, em quanto tempo foi resolvida.
 */
export function tempoDaOcorrencia(rec) {
  if (rec?.status === "RESOLVIDO" && rec.resolvidoEm) {
    return `Resolvida em ${duracao(rec.criadoEm, rec.resolvidoEm)}`;
  }
  return `Aberta há ${duracao(rec?.criadoEm)}`;
}

/** `2026-10-20T14:30:00` → `20/10/2026 14:30` */
export function dataHora(iso) {
  if (!iso) return "—";
  const [data, hora = ""] = String(iso).split("T");
  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}${hora ? ` ${hora.slice(0, 5)}` : ""}`;
}

/** Reais (o custo da OS vem em reais, não em centavos). */
export const reais = (valor) =>
  valor === null || valor === undefined
    ? "—"
    : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
