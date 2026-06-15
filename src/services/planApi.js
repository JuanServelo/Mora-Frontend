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
};
