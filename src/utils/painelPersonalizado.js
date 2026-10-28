import { CORES, PALETA } from "./chartTheme";

/**
 * A configuração de um painel personalizável: quais blocos aparecem, em que
 * ordem, em que largura e altura, com que tipo de gráfico e com que cor.
 *
 * Gravada no servidor como
 * `{ versao, blocos: [{ id, visivel, largura, altura, tipo, cor }] }`, na ordem
 * de exibição. Funções puras — o componente só as chama.
 */

export const VERSAO = 2;

/**
 * Formatos de gráfico de série mensal (ver components/charts/GraficoMensal).
 * `rotuloKey` é a chave do namespace `paineis`, traduzida na tela.
 */
export const TIPOS_SERIE = {
  barras: { rotuloKey: "tiposSerie.barras", icone: "bar_chart" },
  linhas: { rotuloKey: "tiposSerie.linhas", icone: "show_chart" },
  area: { rotuloKey: "tiposSerie.area", icone: "area_chart" },
  combinado: { rotuloKey: "tiposSerie.combinado", icone: "stacked_line_chart" },
};

/** Larguras que um bloco de gráfico aceita. KPI e seção têm largura fixa. */
export const LARGURAS = {
  metade: { rotuloKey: "larguras.metade", icone: "view_column" },
  inteira: { rotuloKey: "larguras.inteira", icone: "view_agenda" },
};

/** Alturas da área do gráfico, em pixels. */
export const ALTURAS = {
  baixa: { rotuloKey: "alturas.baixa", px: 200 },
  media: { rotuloKey: "alturas.media", px: 280 },
  alta: { rotuloKey: "alturas.alta", px: 380 },
};

/**
 * As cores que o usuário pode escolher — só as do tema, de propósito.
 *
 * Um seletor livre deixaria o painel com um rosa choque que some no fundo
 * escuro ou um amarelo ilegível; aqui toda opção já tem contraste com o tema.
 * `null` é "automática": o bloco usa a cor que tem significado para ele
 * (vermelho quando há atraso, por exemplo).
 */
export const CORES_BLOCO = {
  agua: { rotuloKey: "cores.agua", hex: CORES.primary },
  turquesa: { rotuloKey: "cores.turquesa", hex: CORES.tertiary },
  dourado: { rotuloKey: "cores.dourado", hex: CORES.secondary },
  coral: { rotuloKey: "cores.coral", hex: CORES.error },
  ardosia: { rotuloKey: "cores.ardosia", hex: PALETA[3] },
  lavanda: { rotuloKey: "cores.lavanda", hex: PALETA[5] },
};

/** O hexadecimal da cor escolhida, ou `null` para a automática. */
export const hexDaCor = (cor) => CORES_BLOCO[cor]?.hex ?? null;

/**
 * A paleta categórica começando pela cor escolhida — para gráficos de várias
 * fatias, em que uma cor só não basta.
 */
export function paletaAPartirDe(cor) {
  const hex = hexDaCor(cor);
  if (!hex) return PALETA;
  return [hex, ...PALETA.filter((c) => c !== hex)];
}

/** A altura em pixels de um bloco de gráfico, com o padrão da definição. */
export function alturaPx(bloco, def) {
  return ALTURAS[bloco?.altura]?.px ?? def?.alturaPx ?? ALTURAS.media.px;
}

/** O bloco como ele nasce, sem nada personalizado. */
function blocoPadrao(def) {
  return {
    id: def.id,
    visivel: !def.ocultoPorPadrao,
    largura: def.tamanho === "grafico" ? (def.larguraPadrao ?? "metade") : null,
    altura: def.tamanho === "grafico" ? (def.alturaPadrao ?? "media") : null,
    tipo: def.tipos?.[0] ?? null,
    cor: null,
  };
}

export function configPadrao(definicoes) {
  return definicoes.map(blocoPadrao);
}

/**
 * Junta o que foi salvo com os blocos que a tela oferece hoje.
 *
 * O salvo pode estar velho: um bloco que deixou de existir sai; um bloco novo,
 * que o usuário nunca viu, entra no fim, visível. Valores que a tela não
 * aceita mais (um tipo de gráfico removido, uma cor fora da paleta) voltam ao
 * padrão do bloco.
 */
export function normalizar(salvo, definicoes) {
  const porId = new Map(definicoes.map((d) => [d.id, d]));
  const vistos = new Set();
  const blocos = [];

  for (const b of salvo?.blocos ?? []) {
    const def = porId.get(b?.id);
    if (!def || vistos.has(b.id)) continue;
    vistos.add(b.id);
    const padrao = blocoPadrao(def);
    const grafico = def.tamanho === "grafico";
    blocos.push({
      id: def.id,
      visivel: typeof b.visivel === "boolean" ? b.visivel : padrao.visivel,
      largura: grafico && LARGURAS[b.largura] ? b.largura : padrao.largura,
      altura: grafico && ALTURAS[b.altura] ? b.altura : padrao.altura,
      tipo: def.tipos?.includes(b.tipo) ? b.tipo : padrao.tipo,
      cor: CORES_BLOCO[b.cor] ? b.cor : null,
    });
  }
  for (const def of definicoes) {
    if (!vistos.has(def.id)) blocos.push(blocoPadrao(def));
  }
  return blocos;
}

export function iguais(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Move o bloco `de` para a posição `para`, devolvendo uma lista nova. */
export function mover(blocos, de, para) {
  if (de === para || de < 0 || para < 0 || de >= blocos.length || para >= blocos.length) return blocos;
  const copia = [...blocos];
  const [item] = copia.splice(de, 1);
  copia.splice(para, 0, item);
  return copia;
}

/** Classes de grade de cada tamanho, numa grade de 2 colunas (4 no desktop). */
export function classeDaLargura(def, bloco) {
  if (def.tamanho === "kpi") return "col-span-1";
  if (def.tamanho === "secao" || bloco.largura === "inteira") return "col-span-2 lg:col-span-4";
  return "col-span-2";
}
