/**
 * O backend trafega dinheiro em centavos (inteiro), e não em reais decimais.
 *
 * O motivo está do outro lado: JavaScript não tem decimal, e somar 0,1 + 0,2 em
 * ponto flutuante não dá 0,3. Inteiro elimina isso. Aqui só se converte para
 * exibir e para ler o que o usuário digitou.
 */

/** 24990 → "R$ 249,90" */
export function formatarBRL(centavos) {
  if (centavos == null) return "—";
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** 24990 → "249,90", para preencher um input de edição. */
export function centavosParaCampo(centavos) {
  if (centavos == null) return "";
  return (centavos / 100).toFixed(2).replace(".", ",");
}

/** "249,90" → 24990. Devolve null quando não é um valor válido. */
export function campoParaCentavos(texto) {
  if (texto == null || texto === "") return null;
  const limpo = String(texto).trim().replace(/\s/g, "");
  const normalizado = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : limpo;
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) return null;
  return Math.round(Number(normalizado) * 100);
}

/** 137 milésimos → "13,7%" */
export function milesimosParaPercentual(milesimos) {
  if (milesimos == null) return "—";
  return `${(milesimos / 10).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}%`;
}
