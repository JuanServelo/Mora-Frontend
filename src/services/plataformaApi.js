// src/services/plataformaApi.js
// RF01 (Gerenciar Planos) e RF02 (Gerenciar Tenants) — Super Admin.
// Usa a instância compartilhada da auth-api (porta 3001).
import api from "./api";

export const planoApi = {
  listar: () => api.get("/api/plans"),
  buscar: (id) => api.get(`/api/plans/${id}`),
  modulos: () => api.get("/api/plans/modulos"),
  criar: (data) => api.post("/api/plans", data),
  atualizar: (id, data) => api.put(`/api/plans/${id}`, data),
  ativar: (id) => api.patch(`/api/plans/${id}/activate`),
  desativar: (id) => api.patch(`/api/plans/${id}/deactivate`),
  atualizarModulos: (id, activeModules) =>
    api.put(`/api/plans/${id}/modules`, { activeModules }),
};

export const tenantApi = {
  listar: () => api.get("/api/tenants"),
  buscar: (id) => api.get(`/api/tenants/${id}`),
  tipos: () => api.get("/api/tenants/tipos"),
  criar: (data) => api.post("/api/tenants", data),
  atualizar: (id, data) => api.put(`/api/tenants/${id}`, data),
  provisionar: (id) => api.post(`/api/tenants/${id}/provision`),
  suspender: (id) => api.patch(`/api/tenants/${id}/suspend`),
  reativar: (id) => api.patch(`/api/tenants/${id}/reactivate`),
  alterarPlano: (id, planId) => api.patch(`/api/tenants/${id}/plan`, { planId }),
};

export const MODULOS_LABEL = {
  property: "Propriedade",
  access: "Acesso / Portaria",
  amenity: "Áreas Comuns",
  complaint: "Reclamações",
  financial: "Financeiro",
  governance: "Governança",
  chat: "Mensagens",
  content: "Comunicados / Conteúdo",
  notification: "Notificações",
  reporting: "Relatórios",
};

export const TIPOS_TENANT_LABEL = {
  PROPERTY_MANAGER: "Administradora",
  SYNDIC: "Síndico",
};
