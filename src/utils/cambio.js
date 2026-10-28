/**
 * Cotação do dólar em uso na tela: quantos reais vale 1 dólar.
 *
 * Só para exibir, em inglês, o valor aproximado em US$ ao lado do real. A
 * cobrança é sempre em real; nenhum valor digitado ou enviado ao backend passa
 * por aqui. Fica num módulo simples, e não num contexto, porque quem lê é o
 * `formatarBRL`, chamado fora de componentes. Quem carrega é o
 * `useCotacaoDolar`.
 */
let reaisPorDolar = null;

export function definirCotacaoDolar(valor) {
  reaisPorDolar = Number(valor) > 0 ? Number(valor) : null;
}

/** `null` enquanto não carregou, ou se o backend não tem cotação. */
export const cotacaoDolar = () => reaisPorDolar;
