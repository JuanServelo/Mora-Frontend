// src/i18n.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * Internacionalização: português (padrão) e inglês.
 *
 * Os textos ficam em `src/locales/<idioma>/<namespace>.json`, um arquivo por
 * área da tela (`ocorrencias.json`, `financeiro.json`...), e são carregados
 * todos aqui pelo `import.meta.glob`: arquivo novo entra sem mexer neste. Um
 * arquivo por área, e não um só, para quem traduz uma tela não editar o mesmo
 * arquivo que quem traduz outra.
 *
 * - `comum`: termos repetidos pelo sistema todo (Salvar, Cancelar...). É o
 *   `fallbackNS`: `t("salvar")` com o namespace de uma tela cai nele.
 * - `translation`: o namespace das primeiras telas traduzidas (login, perfil).
 *
 * A escolha do idioma fica no navegador (`mora.idioma`), como o tema: é do
 * aparelho, e está valendo antes do login, na própria tela de entrar.
 */
export const IDIOMAS = {
  "pt-BR": { rotulo: "Português (Brasil)", curto: "PT" },
  en: { rotulo: "English", curto: "EN" },
};

export const IDIOMA_PADRAO = "pt-BR";
const CHAVE = "mora.idioma";

const arquivos = import.meta.glob("./locales/*/*.json", { eager: true });
const resources = {};
for (const [caminho, modulo] of Object.entries(arquivos)) {
  const [, idioma, namespace] = caminho.match(/\.\/locales\/([^/]+)\/([^/]+)\.json$/);
  (resources[idioma] ??= {})[namespace] = modulo.default;
}

function idiomaSalvo() {
  try {
    const salvo = localStorage.getItem(CHAVE);
    return IDIOMAS[salvo] ? salvo : null;
  } catch {
    return null;
  }
}

i18n.use(initReactI18next).init({
  resources,
  lng: idiomaSalvo() ?? IDIOMA_PADRAO,
  fallbackLng: IDIOMA_PADRAO,
  supportedLngs: Object.keys(IDIOMAS),
  ns: Object.keys(resources[IDIOMA_PADRAO] ?? {}),
  defaultNS: "translation",
  fallbackNS: "comum",
  interpolation: {
    escapeValue: false,
  },
});

/** O `lang` da página acompanha o idioma: leitor de tela e corretor usam. */
function aplicarNoDocumento(idioma) {
  if (typeof document !== "undefined") document.documentElement.lang = idioma;
}
aplicarNoDocumento(i18n.language);

i18n.on("languageChanged", (idioma) => {
  aplicarNoDocumento(idioma);
  try {
    localStorage.setItem(CHAVE, idioma);
  } catch {
    // Navegador sem armazenamento: vale até recarregar a página.
  }
});

/** O idioma em uso, no formato que o `Intl` aceita (`pt-BR`, `en`). */
export const idiomaAtual = () => (IDIOMAS[i18n.language] ? i18n.language : IDIOMA_PADRAO);

export const trocarIdioma = (idioma) => i18n.changeLanguage(IDIOMAS[idioma] ? idioma : IDIOMA_PADRAO);

export default i18n;
