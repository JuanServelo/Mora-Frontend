import { afterEach, describe, expect, it } from "vitest";
import i18n, { IDIOMAS, idiomaAtual, trocarIdioma } from "./i18n";
import { formatarData, formatarCompetencia } from "./utils/datas";
import { campoParaCentavos, centavosParaCampo, formatarBRL, formatarReais } from "./utils/dinheiro";
import { definirCotacaoDolar } from "./utils/cambio";
import { rotuloMes } from "./utils/chartTheme";

/** Todas as chaves de um objeto de traduções, como "secao.chave". */
const chaves = (obj, prefixo = "") =>
  Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? chaves(v, `${prefixo}${k}.`) : [`${prefixo}${k}`]);

const arquivos = import.meta.glob("./locales/*/*.json", { eager: true });
const porIdioma = (idioma) => Object.fromEntries(
  Object.entries(arquivos)
    .filter(([caminho]) => caminho.includes(`/locales/${idioma}/`))
    .map(([caminho, modulo]) => [caminho.split("/").pop(), modulo.default]),
);

afterEach(async () => {
  await trocarIdioma("pt-BR");
  definirCotacaoDolar(null);
});

describe("arquivos de tradução", () => {
  const pt = porIdioma("pt-BR");
  const en = porIdioma("en");

  it("os dois idiomas têm os mesmos arquivos", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort());
  });

  it.each(Object.keys(pt))("%s: mesmas chaves em português e inglês, nenhuma vazia", (arquivo) => {
    expect(chaves(en[arquivo]).sort()).toEqual(chaves(pt[arquivo]).sort());
    for (const k of chaves(en[arquivo])) {
      const valor = k.split(".").reduce((o, s) => o[s], en[arquivo]);
      expect(valor, `${arquivo}: ${k}`).not.toBe("");
    }
  });
});

describe("troca de idioma", () => {
  it("começa em português e só aceita os idiomas oferecidos", async () => {
    expect(idiomaAtual()).toBe("pt-BR");
    await trocarIdioma("fr");
    expect(idiomaAtual()).toBe("pt-BR");
    expect(Object.keys(IDIOMAS)).toEqual(["pt-BR", "en"]);
  });

  it("traduz, atualiza o lang da página e lembra a escolha", async () => {
    expect(i18n.t("comum:acoes.salvar")).toBe("Salvar");
    await trocarIdioma("en");
    expect(i18n.t("comum:acoes.salvar")).toBe("Save");
    expect(document.documentElement.lang).toBe("en");
    expect(localStorage.getItem("mora.idioma")).toBe("en");
  });
});

describe("datas e valores seguem o idioma", () => {
  it("português", () => {
    expect(formatarData("2026-08-10T03:00:00.000Z")).toBe("10/08/2026");
    expect(formatarCompetencia("2026-08-01")).toBe("ago/2026");
    expect(rotuloMes("2026-08")).toBe("ago/26");
    expect(formatarBRL(24990)).toMatch(/^R\$\s249,90$/);
    expect(centavosParaCampo(24990)).toBe("249,90");
  });

  it("inglês", async () => {
    await trocarIdioma("en");
    expect(formatarData("2026-08-10T03:00:00.000Z")).toBe("08/10/2026");
    expect(formatarCompetencia("2026-08-01")).toBe("Aug/2026");
    expect(rotuloMes("2026-08")).toBe("Aug/26");
    expect(formatarBRL(24990)).toBe("R$249.90");
    expect(centavosParaCampo(24990)).toBe("249.90");
  });

  it("o valor digitado é lido igual nos dois idiomas", async () => {
    for (const idioma of ["pt-BR", "en"]) {
      await trocarIdioma(idioma);
      expect(campoParaCentavos("350,00")).toBe(35000);
      expect(campoParaCentavos("350.00")).toBe(35000);
      expect(campoParaCentavos("1.234,56")).toBe(123456);
      expect(campoParaCentavos("1,234.56")).toBe(123456);
      expect(campoParaCentavos("12,5")).toBe(1250);
      expect(campoParaCentavos("80")).toBe(8000);
      expect(campoParaCentavos("abc")).toBeNull();
    }
  });
});

describe("dólar aproximado, só em inglês", () => {
  it("em inglês, com cotação, o real vem acompanhado do dólar", async () => {
    await trocarIdioma("en");
    definirCotacaoDolar(5.3346);
    expect(formatarBRL(24990)).toBe("R$249.90 (≈ $46.85)");
    expect(formatarReais(249.9)).toBe("R$249.90 (≈ $46.85)");
  });

  it("em português, nunca mostra o dólar", () => {
    definirCotacaoDolar(5.3346);
    expect(formatarBRL(24990)).toMatch(/^R\$\s249,90$/);
    expect(formatarReais(249.9)).toMatch(/^R\$\s249,90$/);
  });

  it("sem cotação, fica só o real", async () => {
    await trocarIdioma("en");
    expect(formatarBRL(24990)).toBe("R$249.90");
    definirCotacaoDolar(0);
    expect(formatarBRL(24990)).toBe("R$249.90");
  });

  it("eixo de gráfico: sem dólar e sem centavos", async () => {
    await trocarIdioma("en");
    definirCotacaoDolar(5.3346);
    expect(formatarBRL(150000, { dolar: false, casas: 0 })).toBe("R$1,500");
  });

  it("o campo digitado continua em real, com ou sem cotação", async () => {
    await trocarIdioma("en");
    definirCotacaoDolar(5.3346);
    expect(centavosParaCampo(24990)).toBe("249.90");
    expect(campoParaCentavos("249.90")).toBe(24990);
  });

  it("valor vazio continua como traço", async () => {
    await trocarIdioma("en");
    definirCotacaoDolar(5.3346);
    expect(formatarBRL(null)).toBe("—");
    expect(formatarReais(null)).toBe("—");
  });
});
