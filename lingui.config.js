/** @type {import('@lingui/conf').LinguiConfig} */
export default {
  locales: ["pt-BR", "en"],
  sourceLocale: "pt-BR",
  compileNamespace: "es",
  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}/messages",
      include: ["<rootDir>/src"],
    },
  ],
  format: "po",
};
