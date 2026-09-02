import axios from "axios";

/**
 * Client do financeiro-service.
 *
 * Instância própria porque é outro serviço, em outra porta — mesmo desenho de
 * gestaoApi.js. Valores monetários trafegam em centavos (inteiro); a conversão
 * para reais acontece só na tela.
 */
const financeiro = axios.create({
  baseURL: import.meta.env.VITE_FINANCEIRO_API_URL || "http://localhost:3004",
});

financeiro.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const base = "/api/financeiro";

export const financeiroApi = {
  // ── Regras de fechamento ──────────────────────────────
  obterConfig() {
    return financeiro.get(`${base}/config`);
  },
  salvarConfig(dados) {
    return financeiro.put(`${base}/config`, dados);
  },

  // ── Tipos de taxa ─────────────────────────────────────
  listarTaxas(incluirInativas = false) {
    return financeiro.get(`${base}/tipos-taxa`, {
      params: incluirInativas ? { todos: "true" } : undefined,
    });
  },
  criarTaxa(dados) {
    return financeiro.post(`${base}/tipos-taxa`, dados);
  },
  atualizarTaxa(id, dados) {
    return financeiro.put(`${base}/tipos-taxa/${id}`, dados);
  },
  desativarTaxa(id) {
    return financeiro.delete(`${base}/tipos-taxa/${id}`);
  },

  // ── Fração ideal ──────────────────────────────────────
  listarFracoes() {
    return financeiro.get(`${base}/fracoes`);
  },
  definirFracao(unidadeId, milesimos) {
    return financeiro.put(`${base}/fracoes/${unidadeId}`, { milesimos });
  },
  removerFracao(unidadeId) {
    return financeiro.delete(`${base}/fracoes/${unidadeId}`);
  },
  proporPorArea() {
    return financeiro.get(`${base}/fracoes/propor-por-area`);
  },
  aplicarFracoes(fracoes) {
    return financeiro.post(`${base}/fracoes/aplicar-lote`, { fracoes });
  },

  // ── Gateway de pagamento ──────────────────────────────
  statusGateway() {
    return financeiro.get(`${base}/gateway/status`);
  },
  /** Emite uma cobrança real no sandbox. O backend recusa fora dele. */
  cobrancaDeTeste(forma, valor) {
    return financeiro.post(`${base}/gateway/teste`, { forma, valor });
  },
  consultarCobrancaTeste(id) {
    return financeiro.get(`${base}/gateway/teste/${id}`);
  },
  cancelarCobrancaTeste(id) {
    return financeiro.delete(`${base}/gateway/teste/${id}`);
  },
};

export default financeiroApi;
