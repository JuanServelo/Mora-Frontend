// src/utils/modulosPlano.js
//
// Mapeamento centralizado: slug de módulo → rotas que ele habilita.
// Usado pelo ModulesContext, Navbar, Sidebar e guards de rota para
// esconder funcionalidades não contratadas pelo condomínio.

/**
 * Cada slug de módulo lista as rotas (pathnames) que ele libera.
 * Uma rota pode aparecer em mais de um módulo — basta que QUALQUER
 * módulo contratado cubra a rota para ela ser acessível.
 */
export const MAPA_MODULOS = {
  portaria: ["/portaria", "/entradas-e-saidas", "/atendimento"],
  reunioes: ["/adm/reunioes"],
  vagas: ["/adm/vagas"],
  entregas: ["/adm/entregas", "/entregas"],
  areas_comuns: ["/espacos"],
  reclamacoes: ["/adm/reclamacoes", "/reclamacoes"],
  conhecimento: ["/adm/conhecimento", "/faq"],
  votacoes: [],
  veiculos: ["/adm/veiculos", "/veiculos"],
  chaves: ["/chaves"],
  comunicacao: [],
  financeiro: ["/adm/financeiro"],
};

/**
 * Rotas que nunca são filtradas — sempre acessíveis independente do plano.
 * Inclui páginas estruturais do app, não vinculadas a módulos.
 */
const ROTAS_LIVRES = [
  "/inicio",
  "/perfil",
  "/acesso-pendente",
  "/servicos",
  "/comodidades",
  "/meus-convidados",
  "/adm/geral",
  "/adm/condominios",
  "/adm/planos",
  "/adm/usuarios",
  "/adm/estruturas",
  "/adm/perfis",
  "/usuarios",
];

/**
 * Verifica se uma rota está liberada pelos módulos ativos.
 *
 * @param {string[]|null} activeModules — null = tudo liberado (ADMIN_GERAL)
 * @param {string} pathname — rota atual
 * @returns {boolean}
 */
export function rotaLiberada(activeModules, pathname) {
  // null = sem filtragem (ADMIN_GERAL ou sem condominioId)
  if (activeModules === null) return true;

  // Rotas estruturais sempre passam
  if (ROTAS_LIVRES.some((r) => pathname.startsWith(r))) return true;

  // Verifica se algum módulo contratado cobre esta rota
  for (const slug of activeModules) {
    const rotas = MAPA_MODULOS[slug] || [];
    if (rotas.some((r) => pathname.startsWith(r))) return true;
  }

  return false;
}

/**
 * Verifica se um link de menu (com prop `modulo`) deve ser exibido.
 *
 * @param {string[]|null} activeModules — null = tudo liberado
 * @param {object} link — objeto do menu com campo `modulo` (opcional)
 * @returns {boolean}
 */
export function linkLiberado(activeModules, link) {
  // Sem filtragem ativa
  if (activeModules === null) return true;
  // Link sem módulo associado — sempre visível
  if (!link.modulo) return true;
  // Verifica se o módulo está contratado
  return activeModules.includes(link.modulo);
}
