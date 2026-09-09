/**
 * Formata a identificação de uma unidade residencial.
 * @param {string|null|undefined} bloco  - Nome do bloco (ex: "Bloco A")
 * @param {string|number|null|undefined} numero - Número do apartamento
 * @returns {string}
 */
export function formatarUnidade(bloco, numero) {
  if (!numero && numero !== 0) return "Não atribuída";
  return bloco ? `${bloco} - Apto ${numero}` : `Apto ${numero}`;
}
