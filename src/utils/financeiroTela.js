// src/utils/financeiroTela.js
// Funções de apoio às telas de multas, contratos e prestação de contas.
// Ficam fora dos arquivos de componente para o recarregamento a quente do Vite
// continuar funcionando — ele exige que um arquivo .jsx exporte só componentes.

const FUSO = "America/Sao_Paulo";

/** "YYYY-MM-DD" de hoje no fuso de Brasília — o que o `<input type="date">` espera. */
export const hojeCampo = () => new Date().toLocaleDateString("sv-SE", { timeZone: FUSO });

/** "YYYY-MM" do mês atual. */
export const mesAtual = () => hojeCampo().slice(0, 7);

/**
 * Carimbo de data e hora vindo do banco (`TIMESTAMPTZ`, em UTC) no fuso local.
 *
 * `formatarDataHora` recorta a hora do texto, o que serve para hora já local;
 * aplicado a um carimbo em UTC, mostraria a hora com três horas a mais.
 */
export const quandoLocal = (valor) =>
  valor
    ? new Date(valor).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: FUSO })
    : "—";

/** Mensagem de erro da API, ou a genérica. */
export const mensagemDe = (err, padrao) => err?.response?.data?.mensagem || padrao;
