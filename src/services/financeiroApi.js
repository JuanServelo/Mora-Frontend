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

  // ── Contas de consumo (síndico) ───────────────────────
  listarContasConsumo(competencia) {
    return financeiro.get(`${base}/contas-consumo`, {
      params: competencia ? { competencia } : undefined,
    });
  },
  criarContaConsumo(dados) {
    return financeiro.post(`${base}/contas-consumo`, dados);
  },
  atualizarContaConsumo(id, dados) {
    return financeiro.put(`${base}/contas-consumo/${id}`, dados);
  },
  cancelarContaConsumo(id) {
    return financeiro.delete(`${base}/contas-consumo/${id}`);
  },
  ratearContaConsumo(id) {
    return financeiro.post(`${base}/contas-consumo/${id}/ratear`);
  },

  // ── Fechamento / faturamento (síndico) ────────────────
  previewCompetencia(competencia) {
    return financeiro.get(`${base}/admin/fechamento/preview`, { params: { competencia } });
  },
  fecharCompetencia(competencia) {
    return financeiro.post(`${base}/fechar-competencia`, { competencia });
  },

  // ── Faturas: visão síndico ────────────────────────────
  listarFaturasCondominio({ competencia, status, unidadeId } = {}) {
    return financeiro.get(`${base}/admin/faturas`, {
      params: { competencia, status, unidadeId },
    });
  },
  kpisFaturas(competencia) {
    return financeiro.get(`${base}/admin/faturas/kpis`, { params: { competencia } });
  },
  baixaManual(id, dados) {
    return financeiro.patch(`${base}/admin/faturas/${id}/baixa-manual`, dados);
  },

  // ── Faturas: visão morador ────────────────────────────
  listarMinhasFaturas() {
    return financeiro.get(`${base}/faturas`);
  },
  obterDetalhesFatura(id) {
    return financeiro.get(`${base}/faturas/${id}`);
  },
  gerarCobranca(id, forma) {
    return financeiro.post(`${base}/faturas/${id}/pagar`, { forma });
  },
  meuGastos(ano) {
    return financeiro.get(`${base}/gastos`, { params: ano ? { ano } : {} });
  },

  // ── Notificações ──────────────────────────────────────
  listarNotificacoes() {
    return financeiro.get(`${base}/notificacoes`);
  },
  marcarNotificacaoLida(id) {
    return financeiro.patch(`${base}/notificacoes/${id}/lida`);
  },
  marcarTodasNotificacoesLidas() {
    return financeiro.patch(`${base}/notificacoes/marcar-todas-lidas`);
  },
};

export default financeiroApi;
