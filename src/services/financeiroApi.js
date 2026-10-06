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

  // As notificações saíram daqui: a caixa de entrada é lida no
  // comunicacao-service (`comunicacaoApi`), e o financeiro não serve mais as
  // rotas antigas.

  // ── Multas (RF-16) ────────────────────────────────────
  listarMultas(filtros = {}) {
    return financeiro.get(`${base}/admin/multas`, { params: filtros });
  },
  aplicarMulta(dados) {
    return financeiro.post(`${base}/admin/multas`, dados);
  },
  julgarRecurso(id, aceito, justificativa) {
    return financeiro.patch(`${base}/admin/multas/${id}/julgar`, { aceito, justificativa });
  },
  cancelarMulta(id, justificativa) {
    return financeiro.patch(`${base}/admin/multas/${id}/cancelar`, { justificativa });
  },
  minhasMultas() {
    return financeiro.get(`${base}/multas/minhas`);
  },
  recorrerMulta(id, texto) {
    return financeiro.post(`${base}/multas/${id}/recurso`, { texto });
  },

  // ── Contratos de locação (RF-15) ──────────────────────
  listarContratos() {
    return financeiro.get(`${base}/admin/contratos`);
  },
  criarContrato(dados) {
    return financeiro.post(`${base}/admin/contratos`, dados);
  },
  encerrarContrato(id) {
    return financeiro.patch(`${base}/admin/contratos/${id}/encerrar`);
  },
  meusContratos() {
    return financeiro.get(`${base}/contratos/meus`);
  },
  criarMeuContrato(dados) {
    return financeiro.post(`${base}/contratos/meus`, dados);
  },
  encerrarMeuContrato(id) {
    return financeiro.patch(`${base}/contratos/${id}/encerrar`);
  },

  // ── Prestação de contas (RF-17) ───────────────────────
  obterPrestacao(competencia) {
    return financeiro.get(`${base}/admin/prestacao/${competencia}`);
  },
  lancar(competencia, dados) {
    return financeiro.post(`${base}/admin/prestacao/${competencia}/lancamentos`, dados);
  },
  excluirLancamento(id) {
    return financeiro.delete(`${base}/admin/prestacao/lancamentos/${id}`);
  },
  publicarPrestacao(competencia) {
    return financeiro.post(`${base}/admin/prestacao/${competencia}/publicar`);
  },
  prestacoesPublicadas() {
    return financeiro.get(`${base}/prestacao`);
  },
  prestacaoPublicada(competencia) {
    return financeiro.get(`${base}/prestacao/${competencia}`);
  },
};

export default financeiroApi;
