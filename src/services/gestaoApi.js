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
  plataforma() {
    return gestao.get("/api/gestao/dashboard");
  },

  /** Resumo de um condomínio, para a tela de detalhe. */
  resumoCondominio(id) {
    return gestao.get(`/api/gestao/condominios/${id}/resumo`);
  },
};

export default gestaoApi;
