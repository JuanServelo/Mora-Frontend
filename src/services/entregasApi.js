// src/services/entregasApi.js
import axios from "axios";

const portariaBase = axios.create({
  baseURL: import.meta.env.VITE_PORTARIA_API_URL || "/portaria-api",
});

portariaBase.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const entregaApi = {
  listarTodas: () => portariaBase.get("/entregas"),
  buscar: (id) => portariaBase.get(`/entregas/${id}`),
  cadastrar: (data) => portariaBase.post("/entregas/cadastrar", data),
  atualizar: (id, data) => portariaBase.put(`/entregas/${id}`, data),
  excluir: (id) => portariaBase.delete(`/entregas/${id}`),
};
