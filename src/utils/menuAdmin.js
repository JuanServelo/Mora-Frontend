import i18n from "../i18n";
import { PERFIS } from "./perfis";

/**
 * Fonte única do menu administrativo.
 *
 * Antes esta lista existia em três cópias (Sidebar, Navbar e a tela de Perfis),
 * que divergiam entre si. Sidebar, Navbar e o guard de rota leem daqui.
 *
 * A divisão segue a camada do perfil:
 *   Admin Geral   → opera a PLATAFORMA: clientes, planos, quem acessa
 *   Admin Síndico → opera o CONDOMÍNIO: o dia a dia dos moradores
 *
 * O campo `modulo` (opcional) vincula o item a um módulo do plano. Se o plano
 * contratado não incluir o módulo, o item some do menu e a rota é barrada.
 * Links sem `modulo` são infraestrutura e ficam sempre visíveis.
 */
const PLATAFORMA = [PERFIS.ADMIN_GERAL];
const CONDOMINIO = [PERFIS.ADMIN_SINDICO];
const AMBOS = [PERFIS.ADMIN_GERAL, PERFIS.ADMIN_SINDICO];

/**
 * Rótulo e descrição são getters: o texto sai do i18n na hora em que alguém
 * lê `l.label`, no idioma em uso, e não fica congelado no carregamento do
 * módulo. Quem consome a lista continua lendo `label` e `description`.
 */
function item(chave, def) {
  return {
    ...def,
    labelKey: `layout:menuAdmin.${chave}.rotulo`,
    get label() {
      return i18n.t(`layout:menuAdmin.${chave}.rotulo`);
    },
    get description() {
      return i18n.t(`layout:menuAdmin.${chave}.descricao`);
    },
  };
}

export const ADM_LINKS = [
  // ── Plataforma
  item("painelGeral", {
    to: "/adm/geral",
    icon: "space_dashboard",
    perfis: PLATAFORMA,
  }),
  item("clientes", {
    to: "/adm/condominios",
    icon: "domain",
    perfis: PLATAFORMA,
  }),
  item("planos", {
    to: "/adm/planos",
    icon: "workspace_premium",
    perfis: PLATAFORMA,
  }),

  // ── Compartilhadas: o Admin Geral usa para montar um cliente novo
  // Sem `modulo` — infraestrutura, sempre visível.
  item("usuarios", {
    to: "/adm/usuarios",
    icon: "manage_accounts",
    perfis: AMBOS,
  }),
  item("estruturas", {
    to: "/adm/estruturas",
    icon: "apartment",
    perfis: AMBOS,
  }),
  item("perfis", {
    to: "/adm/perfis",
    icon: "verified_user",
    perfis: AMBOS,
  }),

  // ── Operação do condomínio: não é trabalho de quem opera a plataforma
  // Sem `modulo`: o painel junta vários módulos, e cada bloco já vem vazio
  // quando o dele não está disponível.
  item("painel", {
    to: "/adm/painel",
    icon: "monitoring",
    perfis: CONDOMINIO,
  }),
  // Sem `modulo` — o síndico precisa sempre ver seu plano.
  item("meuPlano", {
    to: "/adm/meu-plano",
    icon: "workspace_premium",
    perfis: CONDOMINIO,
  }),
  item("reservas", {
    // Fora de /adm porque é a mesma tela do morador, com as abas de operação
    // a mais. Sem esta entrada o síndico não tem como chegar à fila de
    // aprovação: a barra lateral dele troca os links de morador pelos
    // administrativos.
    to: "/espacos",
    icon: "event_available",
    perfis: CONDOMINIO,
    modulo: "areas_comuns",
  }),
  item("financeiro", {
    to: "/adm/financeiro",
    modulo: "financeiro",
    icon: "payments",
    perfis: CONDOMINIO,
  }),
  item("funcionarios", {
    to: "/adm/funcionarios",
    icon: "badge",
    perfis: CONDOMINIO,
    modulo: "portaria",
  }),
  item("reunioes", {
    to: "/adm/reunioes",
    icon: "groups",
    perfis: CONDOMINIO,
    modulo: "reunioes",
  }),
  item("votacoes", {
    to: "/adm/votacoes",
    icon: "how_to_vote",
    perfis: CONDOMINIO,
    modulo: "votacoes",
  }),
  item("reclamacoes", {
    to: "/adm/reclamacoes",
    icon: "report",
    perfis: CONDOMINIO,
    modulo: "reclamacoes",
  }),
  item("ordensServico", {
    // Mesmo módulo das reclamações: a OS é o desdobramento da ocorrência.
    to: "/adm/ordens-servico",
    icon: "construction",
    perfis: CONDOMINIO,
    modulo: "reclamacoes",
  }),
  item("conversas", {
    // Nao e rota /adm, e nao precisa ser: a tela e a mesma do morador, e quem
    // decide o que cada perfil enxerga e o servico. Fica aqui so para aparecer
    // na barra lateral de quem usa o layout administrativo.
    to: "/conversas",
    modulo: "comunicacao",
    icon: "forum",
    perfis: CONDOMINIO,
  }),
  item("comunicados", {
    to: "/adm/comunicados",
    modulo: "comunicacao",
    icon: "campaign",
    perfis: CONDOMINIO,
  }),
  item("conhecimento", {
    to: "/adm/conhecimento",
    icon: "library_books",
    perfis: CONDOMINIO,
    modulo: "conhecimento",
  }),
];

/**
 * Links visíveis para um perfil, opcionalmente filtrados pelos módulos do plano.
 *
 * @param {string} perfil       — perfil do usuário logado
 * @param {string[]|null} modulosAtivos — slugs dos módulos habilitados no plano.
 *   Para o ADMIN_GERAL (que não tem plano associado), `null` significa
 *   "sem restrição" e tudo fica visível. Para os demais perfis, `null` ou `[]`
 *   significa carregando ou sem plano — itens com `modulo` ficam ocultos.
 */
export function linksDoPerfil(perfil, modulosAtivos) {
  const isGeral = perfil === PERFIS.ADMIN_GERAL;
  const set = modulosAtivos && modulosAtivos.length > 0 ? new Set(modulosAtivos) : null;
  return ADM_LINKS.filter((l) => {
    if (!l.perfis.includes(perfil)) return false;
    // Sem campo `modulo` → infraestrutura, sempre visível.
    if (!l.modulo) return true;
    // Admin Geral não tem plano → tudo visível.
    if (isGeral) return true;
    // Sem módulos ativos (carregando ou sem plano) → ocultar.
    if (!set) return false;
    return set.has(l.modulo);
  });
}

/**
 * Se o perfil pode abrir a rota. Usado pelo guard: esconder do menu sem barrar
 * a URL deixaria a tela acessível a quem digitasse o endereço.
 *
 * Só decide sobre rotas `/adm`; as demais desta lista passam pelo guard comum.
 *
 * @param {string} perfil
 * @param {string} pathname
 * @param {string[]|null} modulosAtivos
 */
export function podeAcessarRotaAdmin(perfil, pathname, modulosAtivos) {
  const link = ADM_LINKS.find((l) => pathname.startsWith(l.to));
  if (!link) return false;
  if (!link.perfis.includes(perfil)) return false;
  if (!link.modulo) return true;
  // Admin Geral não tem plano → sempre pode.
  if (perfil === PERFIS.ADMIN_GERAL) return true;
  // Sem módulos ativos (carregando ou sem plano) → bloquear.
  if (!modulosAtivos || modulosAtivos.length === 0) return false;
  return modulosAtivos.includes(link.modulo);
}
