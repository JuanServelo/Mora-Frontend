// src/services/planApi.js
import axios from "axios";

const planHttp = axios.create({
  baseURL: import.meta.env.VITE_PLAN_API_URL || "http://localhost:8093",
});

planHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const planApi = {
  criar: (data) => planHttp.post("/api/plans", data),
  listar: () => planHttp.get("/api/plans"),
  buscar: (id) => planHttp.get(`/api/plans/${id}`),
  atualizar: (id, data) => planHttp.put(`/api/plans/${id}`, data),
  toggleStatus: (id) => planHttp.patch(`/api/plans/${id}/toggle-status`),
  atualizarModulos: (id, modules) => planHttp.patch(`/api/plans/${id}/modules`, modules),
  assinaturaVigente: (condominioId) => planHttp.get(`/api/assinaturas/condominio/${condominioId}`),

  /** Histórico de assinaturas do condomínio, da mais recente para a mais antiga. */
  historicoAssinaturas: (condominioId) =>
    planHttp.get(`/api/assinaturas/condominio/${condominioId}/historico`),

  /**
   * Contrata um plano para o condomínio.
   *
   * Serve também para trocar: o serviço encerra a assinatura vigente antes de
   * criar a nova, então não é preciso cancelar em duas etapas.
   */
  contratarPlano: (data) => planHttp.post("/api/assinaturas", data),

  alterarStatusAssinatura: (id, status) =>
    planHttp.patch(`/api/assinaturas/${id}/status`, null, { params: { status } }),
};
