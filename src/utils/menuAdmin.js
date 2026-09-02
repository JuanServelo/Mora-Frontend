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
  {
    to: "/adm/financeiro",
    label: "Financeiro",
    icon: "payments",
    description: "Taxas, rateio e cobranças",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/reunioes",
    label: "Reuniões",
    icon: "groups",
    description: "Assembleias e votações",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/reclamacoes",
    label: "Reclamações",
    icon: "report",
    description: "Ocorrências dos moradores",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/entregas",
    label: "Entregas",
    icon: "inventory_2",
    description: "Encomendas na portaria",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/vagas",
    label: "Vagas",
    icon: "local_parking",
    description: "Vagas de garagem",
    perfis: CONDOMINIO,
  },
  {
    to: "/adm/conhecimento",
    label: "Conhecimento",
    icon: "library_books",
    description: "Base de conhecimento e FAQ",
    perfis: CONDOMINIO,
  },
];

/** Links visíveis para um perfil. */
export function linksDoPerfil(perfil) {
  return ADM_LINKS.filter((l) => l.perfis.includes(perfil));
}

/**
 * Se o perfil pode abrir a rota. Usado pelo guard: esconder do menu sem barrar
 * a URL deixaria a tela acessível a quem digitasse o endereço.
 */
export function podeAcessarRotaAdmin(perfil, pathname) {
  const link = ADM_LINKS.find((l) => pathname.startsWith(l.to));
  return link ? link.perfis.includes(perfil) : false;
}
