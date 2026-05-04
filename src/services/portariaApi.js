// src/services/portariaApi.js
import axios from "axios";

const portariaApi = axios.create({
  baseURL: import.meta.env.VITE_PORTARIA_API_URL || "/portaria-api",
});

portariaApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────
// USUÁRIOS (Morador, Visitante, Funcionário)
// ─────────────────────────────────────────────
export const usuarioApi = {
  criarMorador: (data) =>
    portariaApi.post("/usuarios/criar", { ...data, tipoUsuario: "MORADOR" }),
  criarVisitante: (data) =>
    portariaApi.post("/usuarios/criar", { ...data, tipoUsuario: "VISITANTE" }),
  criarFuncionario: (data) =>
    portariaApi.post("/usuarios/criar", { ...data, tipoUsuario: "FUNCIONARIO" }),
  criar: (data) => portariaApi.post("/usuarios/criar", data),
};

// ─────────────────────────────────────────────
// MORADORES
// ─────────────────────────────────────────────
export const moradorApi = {
  listar: () => portariaApi.get("/moradores"),
  listarTodos: () => portariaApi.get("/moradores/todos"),
  buscar: (id) => portariaApi.get(`/moradores/${id}`),
  cadastrar: (data) => portariaApi.post("/moradores/cadastrar", data),
  atualizar: (id, data) => portariaApi.put(`/moradores/${id}`, data),
  desativar: (id) => portariaApi.delete(`/moradores/${id}`),
};

// ─────────────────────────────────────────────
// VISITANTES
// ─────────────────────────────────────────────
export const visitanteApi = {
  listar: () => portariaApi.get("/visitantes"),
  listarTodos: () => portariaApi.get("/visitantes/todos"),
  buscar: (id) => portariaApi.get(`/visitantes/${id}`),
  cadastrar: (data) => portariaApi.post("/visitantes/cadastrar", data),
  atualizar: (id, data) => portariaApi.put(`/visitantes/${id}`, data),
  desativar: (id) => portariaApi.delete(`/visitantes/${id}`),
};

// ─────────────────────────────────────────────
// FUNCIONÁRIOS
// ─────────────────────────────────────────────
export const funcionarioApi = {
  listar: () => portariaApi.get("/funcionarios"),
  listarTodos: () => portariaApi.get("/funcionarios/todos"),
  buscar: (id) => portariaApi.get(`/funcionarios/${id}`),
  cadastrar: (data) => portariaApi.post("/funcionarios/cadastrar", data),
  atualizar: (id, data) => portariaApi.put(`/funcionarios/${id}`, data),
  desativar: (id) => portariaApi.delete(`/funcionarios/${id}`),
};

// ─────────────────────────────────────────────
// VAGAS DE ESTACIONAMENTO
// ─────────────────────────────────────────────
export const vagaApi = {
  listar: () => portariaApi.get("/vagas"),
  listarTodas: () => portariaApi.get("/vagas/todas"),
  buscar: (id) => portariaApi.get(`/vagas/${id}`),
  listarPorApartamento: (apartamentoId) =>
    portariaApi.get(`/vagas/apartamento/${apartamentoId}`),
  cadastrar: (data, apartamentoId) =>
    portariaApi.post("/vagas/cadastrar", data, {
      params: apartamentoId ? { apartamentoId } : {},
    }),
  atualizar: (id, data, apartamentoId) =>
    portariaApi.put(`/vagas/${id}`, data, {
      params: apartamentoId !== undefined
        ? { apartamentoId: apartamentoId || "none" }
        : {},
    }),
  ativar: (id) => portariaApi.post(`/vagas/${id}/ativar`),
  desativar: (id) => portariaApi.delete(`/vagas/${id}`),
};

// ─────────────────────────────────────────────
// CARROS
// ─────────────────────────────────────────────
export const carroApi = {
  listar: () => portariaApi.get("/carros"),
  listarDentro: () => portariaApi.get("/carros/dentro"),
  buscar: (id) => portariaApi.get(`/carros/${id}`),
  cadastrar: (data) => portariaApi.post("/carros/cadastrar", data),
  atualizar: (id, data) => portariaApi.put(`/carros/${id}`, data),
  registrarEntrada: (data) => portariaApi.post("/carros/entrada", data),
  registrarSaida: (id) => portariaApi.post(`/carros/${id}/saida`),
};
