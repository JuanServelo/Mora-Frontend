import i18n from "../i18n";

/**
 * Formata a identificação de uma unidade residencial.
 * @param {string|null|undefined} bloco  - Nome do bloco (ex: "Bloco A")
 * @param {string|number|null|undefined} numero - Número do apartamento
 * @returns {string}
 */
export function formatarUnidade(bloco, numero) {
  if (!numero && numero !== 0) return i18n.t("estruturas:unidade.naoAtribuida");
  return bloco
    ? i18n.t("estruturas:unidade.comBloco", { bloco, numero })
    : i18n.t("estruturas:unidade.semBloco", { numero });
}
