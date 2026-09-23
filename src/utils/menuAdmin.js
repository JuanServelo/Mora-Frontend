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

export const ADM_LINKS = [
  // ── Plataforma
  {
    to: "/adm/geral",
    label: "Painel Geral",
    icon: "space_dashboard",
    description: "Indicadores da plataforma",
    perfis: PLATAFORMA,
  },
  {
    to: "/adm/condominios",
    label: "Clientes",
    icon: "domain",
    description: "Gestão de condomínios contratantes",
    perfis: PLATAFORMA,
  },
  {
    to: "/adm/planos",
    label: "Planos",
    icon: "workspace_premium",
    description: "Planos comerciais",
    perfis: PLATAFORMA,
  },

  // ── Compartilhadas: o Admin Geral usa para montar um cliente novo
  // Sem `modulo` — infraestrutura, sempre visível.
  {
    to: "/adm/usuarios",
    label: "Usuários",
    icon: "manage_accounts",
    description: "Cadastro e convites",
    perfis: AMBOS,
  },
  {
    to: "/adm/estruturas",
    label: "Estruturas",
    icon: "apartment",
    description: "Blocos, apartamentos e áreas comuns",
    perfis: AMBOS,
  },
  {
    to: "/adm/perfis",
    label: "Perfis",
    icon: "verified_user",
    description: "Permissões por perfil",
    perfis: AMBOS,
  },

  // ── Operação do condomínio: não é trabalho de quem opera a plataforma
  // Sem `modulo` — o síndico precisa sempre ver seu plano.
  {
    to: "/adm/meu-plano",
    label: "Meu Plano",
    icon: "workspace_premium",
    description: "Plano contratado e módulos disponíveis",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/financeiro",
    label: "Financeiro",
    icon: "payments",
    description: "Taxas, rateio e cobranças",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/funcionarios",
    label: "Funcionários",
    icon: "badge",
    description: "Situação funcional, turnos e liberações",
    perfis: CONDOMINIO,
    modulo: "portaria",
  },
  {
    to: "/adm/reunioes",
    label: "Reuniões",
    icon: "groups",
    description: "Assembleias e votações",
    perfis: CONDOMINIO,
    modulo: "reunioes",
  },
  {
    to: "/adm/reclamacoes",
    label: "Reclamações",
    icon: "report",
    description: "Ocorrências dos moradores",
    perfis: CONDOMINIO,
    modulo: "reclamacoes",
  },
  {
    // Nao e rota /adm, e nao precisa ser: a tela e a mesma do morador, e quem
    // decide o que cada perfil enxerga e o servico. Fica aqui so para aparecer
    // na barra lateral de quem usa o layout administrativo.
    to: "/conversas",
    label: "Conversas",
    icon: "forum",
    description: "Chamados dos moradores",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/comunicados",
    label: "Comunicados",
    icon: "campaign",
    description: "Quem confirmou a leitura dos avisos",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/conhecimento",
    label: "Conhecimento",
    icon: "library_books",
    description: "Base de conhecimento e FAQ",
    perfis: CONDOMINIO,
    modulo: "conhecimento",
  },
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
