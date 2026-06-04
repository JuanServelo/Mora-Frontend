export const PERFIS = {
  CONTRACTING_PROPERTY_MANAGER: 'CONTRACTING_PROPERTY_MANAGER',
  CONTRACTING_SYNDIC: 'CONTRACTING_SYNDIC',
  OPERATIONAL_SYNDIC: 'OPERATIONAL_SYNDIC',
  ADMINISTRATOR: 'ADMINISTRATOR',
  DOORMAN: 'DOORMAN',
  REAL_ESTATE_AGENCY: 'REAL_ESTATE_AGENCY',
  RESIDENT_OWNER: 'RESIDENT_OWNER',
  ABSENT_OWNER: 'ABSENT_OWNER',
  LESSEE: 'LESSEE',
  OCCUPANT: 'OCCUPANT',
  GUEST: 'GUEST',
};

// Perfis que podem ser cadastrados via convite pelo painel admin
export const PERFIS_CADASTRO_PLATAFORMA = [
  { value: PERFIS.CONTRACTING_SYNDIC, label: 'Síndico Contratante' },
];

export const PERFIS_CADASTRO_CONDOMINIO = [
  { value: PERFIS.OPERATIONAL_SYNDIC, label: 'Síndico Operacional' },
  { value: PERFIS.ADMINISTRATOR, label: 'Administrador' },
  { value: PERFIS.DOORMAN, label: 'Porteiro' },
  { value: PERFIS.REAL_ESTATE_AGENCY, label: 'Imobiliária' },
  { value: PERFIS.RESIDENT_OWNER, label: 'Proprietário Residente' },
];

export const PERFIS_CADASTRO_UNIDADE = [
  { value: PERFIS.LESSEE, label: 'Locatário' },
  { value: PERFIS.OCCUPANT, label: 'Ocupante' },
  { value: PERFIS.GUEST, label: 'Convidado' },
];

// Todos os perfis com label (usado para exibição e lookup)
export const TODOS_PERFIS = [
  { value: PERFIS.CONTRACTING_PROPERTY_MANAGER, label: 'Administradora Contratante' },
  { value: PERFIS.CONTRACTING_SYNDIC,           label: 'Síndico Contratante' },
  { value: PERFIS.OPERATIONAL_SYNDIC,           label: 'Síndico Operacional' },
  { value: PERFIS.ADMINISTRATOR,                label: 'Administrador' },
  { value: PERFIS.DOORMAN,                      label: 'Porteiro' },
  { value: PERFIS.REAL_ESTATE_AGENCY,           label: 'Imobiliária' },
  { value: PERFIS.RESIDENT_OWNER,               label: 'Proprietário Residente' },
  { value: PERFIS.ABSENT_OWNER,                 label: 'Proprietário Ausente' },
  { value: PERFIS.LESSEE,                       label: 'Locatário' },
  { value: PERFIS.OCCUPANT,                     label: 'Ocupante' },
  { value: PERFIS.GUEST,                        label: 'Convidado' },
];

/** Matriz: perfil do ator → perfis que pode cadastrar via convite */
export const PERMISSOES_CADASTRO = {
  [PERFIS.CONTRACTING_PROPERTY_MANAGER]: [
    PERFIS.CONTRACTING_SYNDIC,
    PERFIS.OPERATIONAL_SYNDIC,
    PERFIS.ADMINISTRATOR,
    PERFIS.DOORMAN,
    PERFIS.REAL_ESTATE_AGENCY,
    PERFIS.RESIDENT_OWNER,
    PERFIS.ABSENT_OWNER,
    PERFIS.LESSEE,
    PERFIS.OCCUPANT,
  ],
  [PERFIS.CONTRACTING_SYNDIC]: [
    PERFIS.OPERATIONAL_SYNDIC,
    PERFIS.ADMINISTRATOR,
    PERFIS.DOORMAN,
    PERFIS.REAL_ESTATE_AGENCY,
    PERFIS.RESIDENT_OWNER,
    PERFIS.ABSENT_OWNER,
    PERFIS.LESSEE,
    PERFIS.OCCUPANT,
  ],
  [PERFIS.OPERATIONAL_SYNDIC]: [
    PERFIS.ADMINISTRATOR,
    PERFIS.DOORMAN,
    PERFIS.REAL_ESTATE_AGENCY,
    PERFIS.RESIDENT_OWNER,
  ],
  [PERFIS.ADMINISTRATOR]: [
    PERFIS.DOORMAN,
    PERFIS.REAL_ESTATE_AGENCY,
    PERFIS.RESIDENT_OWNER,
  ],
  [PERFIS.RESIDENT_OWNER]:  [PERFIS.LESSEE, PERFIS.OCCUPANT, PERFIS.GUEST],
  [PERFIS.ABSENT_OWNER]:    [PERFIS.LESSEE],
  [PERFIS.LESSEE]:          [PERFIS.OCCUPANT, PERFIS.GUEST],
};

export function podeCadastrarPerfil(perfilAtor, perfilAlvo) {
  return PERMISSOES_CADASTRO[perfilAtor]?.includes(perfilAlvo) ?? false;
}

export function podeGerenciarOcupantes(perfil) {
  return [PERFIS.RESIDENT_OWNER, PERFIS.ABSENT_OWNER, PERFIS.LESSEE].includes(perfil);
}

/** Retorna os perfis que o ator pode cadastrar via convite, com label e agrupamento */
export function perfisCadastroDisponiveis(perfilAtor) {
  const permitidos = PERMISSOES_CADASTRO[perfilAtor] ?? [];
  return TODOS_PERFIS.filter((p) => permitidos.includes(p.value));
}

export function labelPerfil(perfil) {
  return TODOS_PERFIS.find((p) => p.value === perfil)?.label
    ?? perfil?.replace(/_/g, ' ')
    ?? '—';
}

export const PERFIS_CONDOMINIO = [
  PERFIS.CONTRACTING_PROPERTY_MANAGER,
  PERFIS.CONTRACTING_SYNDIC,
  PERFIS.OPERATIONAL_SYNDIC,
  PERFIS.ADMINISTRATOR,
  PERFIS.DOORMAN,
  PERFIS.REAL_ESTATE_AGENCY,
];

export const PERFIS_ACESSO_ADMIN = [
  PERFIS.CONTRACTING_PROPERTY_MANAGER,
  PERFIS.CONTRACTING_SYNDIC,
  PERFIS.OPERATIONAL_SYNDIC,
  PERFIS.ADMINISTRATOR,
];

export function isPerfilCondominio(perfil) {
  return PERFIS_CONDOMINIO.includes(perfil);
}

export function podeAcessarAdmin(perfil) {
  return PERFIS_ACESSO_ADMIN.includes(perfil);
}

export function isUsuarioRestrito(usuario) {
  if (!usuario) return false;
  const hasUnitAssociation =
    Boolean(usuario.unidadeId) ||
    (Boolean(usuario.bloco) && Boolean(usuario.apartamento));
  return !isPerfilCondominio(usuario.perfil) && !hasUnitAssociation;
}

export function redirectPorPerfil(perfil) {
  const map = {
    [PERFIS.DOORMAN]:                          '/portaria',
    [PERFIS.CONTRACTING_PROPERTY_MANAGER]:     '/inicio',
    [PERFIS.CONTRACTING_SYNDIC]:               '/inicio',
    [PERFIS.OPERATIONAL_SYNDIC]:               '/inicio',
    [PERFIS.ADMINISTRATOR]:                    '/inicio',
    [PERFIS.REAL_ESTATE_AGENCY]:               '/inicio',
    [PERFIS.RESIDENT_OWNER]:                   '/inicio',
    [PERFIS.ABSENT_OWNER]:                     '/inicio',
    [PERFIS.LESSEE]:                           '/inicio',
    [PERFIS.OCCUPANT]:                         '/inicio',
    [PERFIS.GUEST]:                            '/inicio',
  };
  return map[perfil] || '/inicio';
}
