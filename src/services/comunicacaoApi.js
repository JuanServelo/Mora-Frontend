// src/services/comunicacaoApi.js
import axios from "axios";

const comunicacaoApi = axios.create({
  baseURL: import.meta.env.VITE_COMUNICACAO_API_URL || "/comunicacao-api",
});

comunicacaoApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─────────────────────────────────────────────
// BASE DE CONHECIMENTO / FAQ
// ─────────────────────────────────────────────
export const conhecimentoApi = {
  listarTodos: () => comunicacaoApi.get("/artigos"),
  listarPublicados: () => comunicacaoApi.get("/artigos", { params: { publicadosOnly: true } }),
  listarPorCategoria: (categoria) =>
    comunicacaoApi.get("/artigos", { params: { categoria } }),
  listarPublicadosPorCategoria: (categoria) =>
    comunicacaoApi.get("/artigos", { params: { publicadosOnly: true, categoria } }),
  buscarPorTitulo: (titulo) =>
    comunicacaoApi.get("/artigos/buscar", { params: { titulo } }),
  buscar: (id) => comunicacaoApi.get(`/artigos/${id}`),
  criar: (data) => comunicacaoApi.post("/artigos", data),
  atualizar: (id, data) => comunicacaoApi.put(`/artigos/${id}`, data),
  excluir: (id) => comunicacaoApi.delete(`/artigos/${id}`),
};

// ─────────────────────────────────────────────
// AVISOS E COMUNICADOS (por condomínio)
// ─────────────────────────────────────────────
export const avisoApi = {
  listar: () => comunicacaoApi.get("/avisos"),
  listarAtivos: () => comunicacaoApi.get("/avisos/ativos"),
  buscar: (id) => comunicacaoApi.get(`/avisos/${id}`),
  criar: (data) => comunicacaoApi.post("/avisos", data),
  atualizar: (id, data) => comunicacaoApi.put(`/avisos/${id}`, data),
  encerrar: (id) => comunicacaoApi.patch(`/avisos/${id}/encerrar`),
  excluir: (id) => comunicacaoApi.delete(`/avisos/${id}`),
};

// ─────────────────────────────────────────────
// NOTIFICAÇÕES
// ─────────────────────────────────────────────
export const notificacaoApi = {
  listar: (params) => comunicacaoApi.get("/notificacoes", { params }),
  listarNaoLidas: () => comunicacaoApi.get("/notificacoes/nao-lidas"),
  contador: () => comunicacaoApi.get("/notificacoes/contador"),
  marcarLida: (id) => comunicacaoApi.patch(`/notificacoes/${id}/lida`),
  marcarTodasLidas: () => comunicacaoApi.patch("/notificacoes/todas-lidas"),
};

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
export const chatApi = {
  enviar: (data) => comunicacaoApi.post("/chat/mensagem", data),
  buscarConversa: (outroUsuarioId) =>
    comunicacaoApi.get(`/chat/conversa/${outroUsuarioId}`),
  marcarConversaLida: (outroUsuarioId) =>
    comunicacaoApi.patch(`/chat/conversa/${outroUsuarioId}/lida`),
  marcarMensagemLida: (id) => comunicacaoApi.patch(`/chat/mensagem/${id}/lida`),
  listarNaoLidas: () => comunicacaoApi.get("/chat/nao-lidas"),
  contador: () => comunicacaoApi.get("/chat/contador"),
};
