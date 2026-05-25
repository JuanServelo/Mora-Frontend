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

export function labelPerfil(perfil) {
  const all = [...PERFIS_CADASTRO_CONDOMINIO, ...PERFIS_CADASTRO_UNIDADE];
  return all.find((p) => p.value === perfil)?.label || perfil?.replace(/_/g, ' ') || '—';
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
    [PERFIS.DOORMAN]: '/portaria',
    [PERFIS.RESIDENT_OWNER]: '/inicio',
    [PERFIS.LESSEE]: '/inicio',
    [PERFIS.OCCUPANT]: '/inicio',
    [PERFIS.GUEST]: '/inicio',
    [PERFIS.CONTRACTING_PROPERTY_MANAGER]: '/inicio',
    [PERFIS.CONTRACTING_SYNDIC]: '/inicio',
    [PERFIS.OPERATIONAL_SYNDIC]: '/inicio',
    [PERFIS.ADMINISTRATOR]: '/inicio',
    [PERFIS.REAL_ESTATE_AGENCY]: '/inicio',
    [PERFIS.ABSENT_OWNER]: '/inicio',
  };
  return map[perfil] || '/inicio';
}
