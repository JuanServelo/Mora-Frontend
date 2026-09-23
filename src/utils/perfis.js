/**
 * Perfis de acesso — espelho de services/auth-api/constants/perfis.js.
 * Modelo simplificado: 6 perfis em 3 camadas.
 */
export const PERFIS = {
  ADMIN_GERAL: 'ADMIN_GERAL',
  ADMIN_SINDICO: 'ADMIN_SINDICO',
  PORTEIRO: 'PORTEIRO',
  MORADOR: 'MORADOR',
  DONO_ALUGUEL: 'DONO_ALUGUEL',
  CONVIDADO: 'CONVIDADO',
};

export const TODOS_PERFIS = [
  { value: PERFIS.ADMIN_GERAL, label: 'Admin Geral' },
  { value: PERFIS.ADMIN_SINDICO, label: 'Admin Síndico' },
  { value: PERFIS.PORTEIRO, label: 'Porteiro' },
  { value: PERFIS.MORADOR, label: 'Morador' },
  { value: PERFIS.DONO_ALUGUEL, label: 'Dono Aluguel' },
  { value: PERFIS.CONVIDADO, label: 'Convidado' },
];

/** Perfis oferecidos ao Admin Geral ao montar a gestão de um condomínio. */
export const PERFIS_CADASTRO_PLATAFORMA = [
  { value: PERFIS.ADMIN_SINDICO, label: 'Admin Síndico' },
];

export const PERFIS_CADASTRO_CONDOMINIO = [
  { value: PERFIS.ADMIN_SINDICO, label: 'Admin Síndico' },
  { value: PERFIS.PORTEIRO, label: 'Porteiro' },
  { value: PERFIS.MORADOR, label: 'Morador' },
  { value: PERFIS.DONO_ALUGUEL, label: 'Dono Aluguel' },
];

export const PERFIS_CADASTRO_UNIDADE = [
  { value: PERFIS.MORADOR, label: 'Morador' },
  { value: PERFIS.CONVIDADO, label: 'Convidado' },
];

/** Matriz: perfil do ator → perfis que pode cadastrar via convite. */
export const PERMISSOES_CADASTRO = {
  [PERFIS.ADMIN_GERAL]: [
    PERFIS.ADMIN_GERAL,
    PERFIS.ADMIN_SINDICO,
    PERFIS.PORTEIRO,
    PERFIS.MORADOR,
    PERFIS.DONO_ALUGUEL,
    PERFIS.CONVIDADO,
  ],
  [PERFIS.ADMIN_SINDICO]: [
    PERFIS.PORTEIRO,
    PERFIS.MORADOR,
    PERFIS.DONO_ALUGUEL,
    PERFIS.CONVIDADO,
  ],
  [PERFIS.MORADOR]: [PERFIS.CONVIDADO],
  [PERFIS.DONO_ALUGUEL]: [PERFIS.MORADOR, PERFIS.CONVIDADO],
};

export function podeCadastrarPerfil(perfilAtor, perfilAlvo) {
  return PERMISSOES_CADASTRO[perfilAtor]?.includes(perfilAlvo) ?? false;
}

export function podeGerenciarOcupantes(perfil) {
  return [PERFIS.MORADOR, PERFIS.DONO_ALUGUEL].includes(perfil);
}

/** Perfis que o ator pode cadastrar via convite, com label. */
export function perfisCadastroDisponiveis(perfilAtor) {
  const permitidos = PERMISSOES_CADASTRO[perfilAtor] ?? [];
  return TODOS_PERFIS.filter((p) => permitidos.includes(p.value));
}

export function labelPerfil(perfil) {
  return TODOS_PERFIS.find((p) => p.value === perfil)?.label
    ?? perfil?.replace(/_/g, ' ')
    ?? '—';
}

/** Perfis que atuam no condomínio, não numa unidade específica. */
export const PERFIS_CONDOMINIO = [
  PERFIS.ADMIN_GERAL,
  PERFIS.ADMIN_SINDICO,
  PERFIS.PORTEIRO,
];

export const PERFIS_ACESSO_ADMIN = [
  PERFIS.ADMIN_GERAL,
  PERFIS.ADMIN_SINDICO,
];

/** Operam as telas de portaria. */
export const PERFIS_PORTARIA = [
  PERFIS.ADMIN_GERAL,
  PERFIS.ADMIN_SINDICO,
  PERFIS.PORTEIRO,
];

export function isPerfilCondominio(perfil) {
  return PERFIS_CONDOMINIO.includes(perfil);
}

export function podeAcessarAdmin(perfil) {
  return PERFIS_ACESSO_ADMIN.includes(perfil);
}

export function podeAcessarPortaria(perfil) {
  return PERFIS_PORTARIA.includes(perfil);
}

export function isUsuarioRestrito(usuario) {
  if (!usuario) return false;
  const hasUnitAssociation = Boolean(usuario.unidadeId)
    || (Boolean(usuario.bloco) && Boolean(usuario.apartamento));
  return !isPerfilCondominio(usuario.perfil) && !hasUnitAssociation;
}

/** Espelha services/auth-api/utils/redirectPorPerfil.js. */
const ROTA_POR_PERFIL = {
  [PERFIS.PORTEIRO]: "/portaria",
  // Admin Geral opera a plataforma, não um condomínio: painel próprio.
  [PERFIS.ADMIN_GERAL]: "/adm/geral",
};

export function redirectPorPerfil(perfil) {
  return ROTA_POR_PERFIL[perfil] ?? "/inicio";
}
