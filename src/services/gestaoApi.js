import axios from "axios";

/**
 * Client do gestao-geral-service, que consolida os dados da plataforma.
 *
 * Instância própria porque é outro serviço, em outra porta. O interceptor de
 * token é o mesmo padrão de services/api.js.
 */
const gestao = axios.create({
  baseURL: import.meta.env.VITE_GESTAO_API_URL || "http://localhost:3002",
});

gestao.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const gestaoApi = {
  /** KPIs e séries da plataforma inteira. Exclusivo do Admin Geral. */
  /**
   * KPIs e séries da plataforma. Exclusivo do Admin Geral.
   *
   * Os filtros vão como query e são aplicados no backend, na origem do dado —
   * a tela nunca recebe a base inteira para peneirar.
   */
  plataforma(filtros = {}) {
    return gestao.get("/api/gestao/dashboard", { params: filtros });
  },

  /** Receita da plataforma com as assinaturas. Exclusivo do Admin Geral. */
  receita(filtros = {}) {
    return gestao.get("/api/gestao/receita", { params: filtros });
  },

  /** Resumo de um condomínio, para a tela de detalhe. */
  resumoCondominio(id) {
    return gestao.get(`/api/gestao/condominios/${id}/resumo`);
  },

  /** Painel operacional do síndico: o que pede ação agora. */
  painelOperacional() {
    return gestao.get("/api/gestao/painel/operacional");
  },

  /** Painel estratégico do síndico: séries mensais (3, 6 ou 12 meses). */
  painelEstrategico(meses = 6) {
    return gestao.get("/api/gestao/painel/estrategico", { params: { meses } });
  },
};

export default gestaoApi;
