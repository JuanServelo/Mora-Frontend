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
  publicar: (id) => comunicacaoApi.patch(`/artigos/${id}/publicar`),
  despublicar: (id) => comunicacaoApi.patch(`/artigos/${id}/despublicar`),
  excluir: (id) => comunicacaoApi.delete(`/artigos/${id}`),
};

// ─────────────────────────────────────────────
// AVISOS E COMUNICADOS (por condomínio)
//
// A resposta de cada aviso traz `lido` — se o usuário atual já registrou
// ciência — e, para a administração, `totalLeituras`.
// ─────────────────────────────────────────────
export const avisoApi = {
  listar: () => comunicacaoApi.get("/avisos"),
  listarAtivos: () => comunicacaoApi.get("/avisos/ativos"),
  buscar: (id) => comunicacaoApi.get(`/avisos/${id}`),
  criar: (data) => comunicacaoApi.post("/avisos", data),
  atualizar: (id, data) => comunicacaoApi.put(`/avisos/${id}`, data),
  publicar: (id) => comunicacaoApi.patch(`/avisos/${id}/publicar`),
  despublicar: (id) => comunicacaoApi.patch(`/avisos/${id}/despublicar`),
  encerrar: (id) => comunicacaoApi.patch(`/avisos/${id}/encerrar`),
  excluir: (id) => comunicacaoApi.delete(`/avisos/${id}`),

  /** Registra a ciência do usuário. Idempotente. */
  marcarLido: (id) => comunicacaoApi.post(`/avisos/${id}/lido`),
  /** Percentual, quem já leu e quem falta. Só para a administração. */
  leituras: (id) => comunicacaoApi.get(`/avisos/${id}/leituras`),
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
  excluir: (id) => comunicacaoApi.delete(`/notificacoes/${id}`),

  /** Categorias existentes + as que o usuário silenciou. */
  preferencias: () => comunicacaoApi.get("/notificacoes/preferencias"),
  /** `silenciadas` é o estado completo: o que não vier volta a ser recebido. */
  salvarPreferencias: (silenciadas) =>
    comunicacaoApi.put("/notificacoes/preferencias", { silenciadas }),
};

// ─────────────────────────────────────────────
// CHAT — morador ↔ administração
// ─────────────────────────────────────────────
export const chatApi = {
  enviar: (destinatarioId, texto) =>
    comunicacaoApi.post("/chat/mensagem", { destinatarioId, texto }),
  /** Caixa de entrada: uma linha por interlocutor. */
  conversas: () => comunicacaoApi.get("/chat/conversas"),
  /** Com quem este usuário pode iniciar uma conversa. */
  contatos: () => comunicacaoApi.get("/chat/contatos"),
  buscarConversa: (outroUsuarioId) =>
    comunicacaoApi.get(`/chat/conversa/${outroUsuarioId}`),
  marcarConversaLida: (outroUsuarioId) =>
    comunicacaoApi.patch(`/chat/conversa/${outroUsuarioId}/lida`),
  marcarMensagemLida: (id) => comunicacaoApi.patch(`/chat/mensagem/${id}/lida`),
  contador: () => comunicacaoApi.get("/chat/contador"),
};

export default comunicacaoApi;
