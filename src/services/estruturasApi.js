// src/services/estruturasApi.js
import axios from "axios";

const estruturasApi = axios.create({
  baseURL: import.meta.env.VITE_PORTARIA_API_URL || "/portaria-api",
});

estruturasApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const blocoApi = {
  listar: () => estruturasApi.get("/blocos"),
  listarTodos: () => estruturasApi.get("/blocos/todos"),
  buscar: (id) => estruturasApi.get(`/blocos/${id}`),
  cadastrar: (data) => estruturasApi.post("/blocos/cadastrar", data),
  atualizar: (id, data) => estruturasApi.put(`/blocos/${id}`, data),
  ativar: (id) => estruturasApi.put(`/blocos/${id}/ativar`),
  desativar: (id) => estruturasApi.put(`/blocos/${id}/desativar`),
  deletar: (id) => estruturasApi.delete(`/blocos/${id}`),
};

export const apartamentoApi = {
  listar: () => estruturasApi.get("/apartamentos"),
  listarTodos: () => estruturasApi.get("/apartamentos/todos"),
  buscar: (id) => estruturasApi.get(`/apartamentos/${id}`),
  listarPorBloco: (blocoId) => estruturasApi.get(`/apartamentos/bloco/${blocoId}`),
  listarPorBlocoAtivos: (blocoId) => estruturasApi.get(`/apartamentos/bloco/${blocoId}/ativos`),
  cadastrar: (data, blocoId) =>
    estruturasApi.post("/apartamentos/cadastrar", { ...data, blocoId }),
  atualizar: (id, data, blocoId) =>
    estruturasApi.put(`/apartamentos/${id}`, { ...data, blocoId }),
  ativar: (id) => estruturasApi.put(`/apartamentos/${id}/ativar`),
  desativar: (id) => estruturasApi.put(`/apartamentos/${id}/desativar`),
  deletar: (id) => estruturasApi.delete(`/apartamentos/${id}`),
};

export const areaComunApi = {
  listar: () => estruturasApi.get("/areas-comuns"),
  listarTodas: () => estruturasApi.get("/areas-comuns/todas"),
  buscar: (id) => estruturasApi.get(`/areas-comuns/${id}`),
  listarPorTipo: (tipo) => estruturasApi.get(`/areas-comuns/tipo/${tipo}`),
  cadastrar: (data) => estruturasApi.post("/areas-comuns/cadastrar", data),
  atualizar: (id, data) => estruturasApi.put(`/areas-comuns/${id}`, data),
  ativar: (id) => estruturasApi.put(`/areas-comuns/${id}/ativar`),
  desativar: (id) => estruturasApi.put(`/areas-comuns/${id}/desativar`),
  deletar: (id) => estruturasApi.delete(`/areas-comuns/${id}`),
};

export const vagaApi = {
  listar: () => estruturasApi.get("/vagas"),
  listarTodas: () => estruturasApi.get("/vagas/todas"),
  buscar: (id) => estruturasApi.get(`/vagas/${id}`),
  listarPorApartamento: (apartamentoId) => estruturasApi.get(`/vagas/apartamento/${apartamentoId}`),
  cadastrar: (data, apartamentoId) =>
    estruturasApi.post('/vagas/cadastrar', data, {
      params: apartamentoId ? { apartamentoId } : {},
    }),
  atualizar: (id, data, apartamentoId) =>
    estruturasApi.put(`/vagas/${id}?apartamentoId=${apartamentoId}`, data),
  ativar: (id) => estruturasApi.put(`/vagas/${id}/ativar`),
  desativar: (id) => estruturasApi.put(`/vagas/${id}/desativar`),
  deletar: (id) => estruturasApi.delete(`/vagas/${id}`),
};