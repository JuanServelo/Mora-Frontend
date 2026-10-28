import i18n from '../i18n';

export function validarSenha(senha) {
  const erros = [];
  if (!senha || senha.length < 8) {
    erros.push(i18n.t('auth:senha.minimo'));
  }
  if (!senha || !/\d/.test(senha)) {
    erros.push(i18n.t('auth:senha.numero'));
  }
  if (!senha || !/[A-Z]/.test(senha)) {
    erros.push(i18n.t('auth:senha.maiuscula'));
  }
  return erros;
}
