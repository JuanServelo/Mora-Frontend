import { idiomaAtual } from "../i18n";
import { cotacaoDolar } from "./cambio";

/**
 * O backend trafega dinheiro em centavos (inteiro), e não em reais decimais.
 *
 * O motivo está do outro lado: JavaScript não tem decimal, e somar 0,1 + 0,2 em
 * ponto flutuante não dá 0,3. Inteiro elimina isso. Aqui só se converte para
 * exibir e para ler o que o usuário digitou.
 */

/** Em inglês, com cotação carregada: o real vem acompanhado do dólar aproximado. */
const mostraDolar = () => idiomaAtual().startsWith("en") && cotacaoDolar() != null;

/**
 * A moeda é sempre o real; o idioma muda a escrita do número, e em inglês
 * acrescenta o valor aproximado em dólar, só como referência:
 * 24990 → "R$ 249,90" (pt-BR) ou "R$249.90 (≈ $46.85)" (en).
 *
 * `dolar: false` tira a referência onde não cabe, como o eixo de um gráfico;
 * `casas` muda as casas decimais.
 */
export function formatarBRL(centavos, { dolar = true, casas = 2 } = {}) {
  if (centavos == null) return "—";
  const casasDecimais = { minimumFractionDigits: casas, maximumFractionDigits: casas };
  const real = (centavos / 100).toLocaleString(idiomaAtual(), {
    style: "currency",
    currency: "BRL",
    ...casasDecimais,
  });
  if (!dolar || !mostraDolar()) return real;

  const emDolar = (centavos / 100 / cotacaoDolar()).toLocaleString(idiomaAtual(), {
    style: "currency",
    currency: "USD",
    ...casasDecimais,
  });
  return `${real} (≈ ${emDolar})`;
}

/** Para os serviços que mandam reais decimais (planos, OS): 249.9 → como `formatarBRL(24990)`. */
export function formatarReais(valor) {
  if (valor == null || valor === "") return "—";
  return formatarBRL(Math.round(Number(valor) * 100));
}

/** Separador decimal do idioma: vírgula em português, ponto em inglês. */
const usaPonto = () => idiomaAtual().startsWith("en");

/** 24990 → "249,90" (ou "249.90" em inglês), para preencher um input de edição. */
export function centavosParaCampo(centavos) {
  if (centavos == null) return "";
  const texto = (centavos / 100).toFixed(2);
  return usaPonto() ? texto : texto.replace(".", ",");
}

/**
 * "249,90", "249.90", "1.234,56" ou "1,234.56" → centavos. Devolve null quando
 * não é um valor válido.
 *
 * Não depende do idioma: o separador decimal é o último ponto ou vírgula
 * seguido de 1 ou 2 dígitos no fim; os demais são milhar. Assim um valor
 * digitado no formato do outro idioma (ou um "350,00" já preenchido no campo)
 * não vira cem vezes maior quando o usuário troca de idioma.
 */
export function campoParaCentavos(texto) {
  if (texto == null || texto === "") return null;
  const limpo = String(texto).trim().replace(/\s/g, "");
  const decimal = limpo.match(/^(.*)[.,](\d{1,2})$/);
  const normalizado = decimal
    ? `${decimal[1].replace(/[.,]/g, "")}.${decimal[2]}`
    : limpo.replace(/[.,](?=\d{3}(\D|$))/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Math.round(Number(normalizado) * 100);
}

/** 137 milésimos → "13,7%" */
export function milesimosParaPercentual(milesimos) {
  if (milesimos == null) return "—";
  return `${(milesimos / 10).toLocaleString(idiomaAtual(), {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}
