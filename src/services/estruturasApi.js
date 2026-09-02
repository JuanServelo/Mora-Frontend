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
  listar: (condominioId) =>
    estruturasApi.get("/blocos", { params: condominioId ? { condominioId } : {} }),
  listarTodos: (condominioId) =>
    estruturasApi.get("/blocos/todos", { params: condominioId ? { condominioId } : {} }),
  buscar: (id) => estruturasApi.get(`/blocos/${id}`),
  cadastrar: (data) => estruturasApi.post("/blocos/cadastrar", data),
  atualizar: (id, data) => estruturasApi.put(`/blocos/${id}`, data),
  ativar: (id) => estruturasApi.put(`/blocos/${id}/ativar`),
  desativar: (id) => estruturasApi.put(`/blocos/${id}/desativar`),
  deletar: (id) => estruturasApi.delete(`/blocos/${id}`),
};

export const apartamentoApi = {
  listar: (condominioId) =>
    estruturasApi.get("/apartamentos", { params: condominioId ? { condominioId } : {} }),
  listarTodos: (condominioId) =>
    estruturasApi.get("/apartamentos/todos", { params: condominioId ? { condominioId } : {} }),
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
  listar: (condominioId) =>
    estruturasApi.get("/areas-comuns", { params: condominioId ? { condominioId } : {} }),
  listarTodas: (condominioId) =>
    estruturasApi.get("/areas-comuns/todas", { params: condominioId ? { condominioId } : {} }),
  buscar: (id) => estruturasApi.get(`/areas-comuns/${id}`),
  listarPorTipo: (tipo) => estruturasApi.get(`/areas-comuns/tipo/${tipo}`),
  cadastrar: (data) => estruturasApi.post("/areas-comuns/cadastrar", data),
  atualizar: (id, data) => estruturasApi.put(`/areas-comuns/${id}`, data),
  ativar: (id) => estruturasApi.put(`/areas-comuns/${id}/ativar`),
  desativar: (id) => estruturasApi.put(`/areas-comuns/${id}/desativar`),
  deletar: (id) => estruturasApi.delete(`/areas-comuns/${id}`),
};

export const vagaApi = {
  listar: (condominioId) =>
    estruturasApi.get("/vagas", { params: condominioId ? { condominioId } : {} }),
  listarTodas: (condominioId) =>
    estruturasApi.get("/vagas/todas", { params: condominioId ? { condominioId } : {} }),
  buscar: (id) => estruturasApi.get(`/vagas/${id}`),
  listarPorApartamento: (apartamentoId) => estruturasApi.get(`/vagas/apartamento/${apartamentoId}`),
  cadastrar: (data, apartamentoId) =>
    estruturasApi.post('/vagas/cadastrar', data, {
      params: apartamentoId ? { apartamentoId } : {},
    }),
  atualizar: (id, data, apartamentoId) =>
    estruturasApi.put(`/vagas/${id}?apartamentoId=${apartamentoId}`, data),
  ativar: (id) => estruturasApi.post(`/vagas/${id}/ativar`),
  desativar: (id) => estruturasApi.delete(`/vagas/${id}`),
};
