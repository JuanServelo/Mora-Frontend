import api from "./api";

export const reclamacoesApi = {
  /** Lista reclamações do usuário logado */
  listarMinhas: () => api.get("/api/reclamacoes/minhas"),

  criar: (data) => api.post("/api/reclamacoes", data),

  /** Admin */
  listarTodas: () => api.get("/api/reclamacoes/todas"),

  atualizarAdmin: (id, data) => api.patch(`/api/reclamacoes/${id}`, data),
};
