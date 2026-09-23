// src/services/comunicacaoApi.js
// src/services/http.js
import axios from "axios";

const http = axios.create({
  baseURL: import.meta.env.VITE_COMUNICACAO_API_URL || "/comunicacao-api",
});

http.interceptors.request.use((config) => {
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
  listarTodos: () => http.get("/artigos"),
  listarPublicados: () => http.get("/artigos", { params: { publicadosOnly: true } }),
  listarPorCategoria: (categoria) =>
    http.get("/artigos", { params: { categoria } }),
  listarPublicadosPorCategoria: (categoria) =>
    http.get("/artigos", { params: { publicadosOnly: true, categoria } }),
  buscarPorTitulo: (titulo) =>
    http.get("/artigos/buscar", { params: { titulo } }),
  buscar: (id) => http.get(`/artigos/${id}`),
  criar: (data) => http.post("/artigos", data),
  atualizar: (id, data) => http.put(`/artigos/${id}`, data),
  excluir: (id) => http.delete(`/artigos/${id}`),
};

// ─────────────────────────────────────────────
// AVISOS E COMUNICADOS (por condomínio)
// ─────────────────────────────────────────────
export const avisoApi = {
  listar: () => http.get("/avisos"),
  listarAtivos: () => http.get("/avisos/ativos"),
  buscar: (id) => http.get(`/avisos/${id}`),
  criar: (data) => http.post("/avisos", data),
  atualizar: (id, data) => http.put(`/avisos/${id}`, data),
  encerrar: (id) => http.patch(`/avisos/${id}/encerrar`),
  excluir: (id) => http.delete(`/avisos/${id}`),
};

// ─────────────────────────────────────────────
// NOTIFICAÇÕES
// ─────────────────────────────────────────────
export const notificacaoApi = {
  listar: (params) => http.get("/notificacoes", { params }),
  listarNaoLidas: () => http.get("/notificacoes/nao-lidas"),
  contador: () => http.get("/notificacoes/contador"),
  marcarLida: (id) => http.patch(`/notificacoes/${id}/lida`),
  marcarTodasLidas: () => http.patch("/notificacoes/todas-lidas"),
};

// ─────────────────────────────────────────────
// CHAT
// ─────────────────────────────────────────────
export const chatApi = {
  enviar: (data) => http.post("/chat/mensagem", data),
  buscarConversa: (outroUsuarioId) =>
    http.get(`/chat/conversa/${outroUsuarioId}`),
  marcarConversaLida: (outroUsuarioId) =>
    http.patch(`/chat/conversa/${outroUsuarioId}/lida`),
  marcarMensagemLida: (id) => http.patch(`/chat/mensagem/${id}/lida`),
  listarNaoLidas: () => http.get("/chat/nao-lidas"),
  contador: () => http.get("/chat/contador"),
};

// ─────────────────────────────────────────────
// URL de arquivo servido pelo próprio serviço
// ─────────────────────────────────────────────

/**
 * Endereço completo de uma imagem de aviso.
 *
 * O serviço grava um caminho relativo (`/uploads/avisos/...`), porque é ele
 * quem serve o arquivo. Usado como está, o navegador pediria a imagem na origem
 * do frontend — e o servidor de desenvolvimento responde `index.html` com 200
 * para qualquer caminho desconhecido, o que daria imagem quebrada sem erro
 * nenhum no console. Mesma armadilha da foto de perfil.
 */
export function urlDaImagem(caminho) {
  if (!caminho) return null;
  if (caminho.startsWith("http")) return caminho;
  return `${http.defaults.baseURL}${caminho}`;
}

// ─────────────────────────────────────────────
// A caixa do usuário: notificações e avisos
// ─────────────────────────────────────────────

/**
 * O mesmo serviço, visto pelas telas do morador.
 *
 * Convive com `avisoApi` e `notificacaoApi` acima em vez de substituí-los:
 * aqueles são a visão de CRUD que as telas de gestão usam, e este é o que a
 * caixa de entrada e a tela de avisos consomem. Batem no mesmo backend.
 */
export const comunicacaoApi = {
  // ── Notificações ──────────────────────────────────────
  /**
   * A caixa do usuário, no formato que as telas esperam.
   *
   * O serviço devolve um `Page` do Spring — `content`, `totalElements` e o
   * resto da paginação. Converter aqui, e não lá, mantém o endpoint como está
   * para quem já o consome, e evita que cada tela aprenda a desembrulhar
   * página.
   */
  async listarNotificacoes(params) {
    const resposta = await http.get("/notificacoes", { params });
    const itens = resposta.data?.content ?? resposta.data ?? [];
    return {
      ...resposta,
      data: {
        sucesso: true,
        notificacoes: itens,
        naoLidas: itens.filter((n) => !n.lida).length,
      },
    };
  },
  /** Contador do sino: notificações não lidas + conversas com mensagem nova. */
  resumo() {
    return http.get("/notificacoes/resumo");
  },
  marcarNotificacaoLida(id) {
    return http.patch(`/notificacoes/${id}/lida`);
  },
  marcarTodasNotificacoesLidas() {
    return http.patch("/notificacoes/todas-lidas");
  },

  // ── Avisos e confirmação de leitura ───────────────────
  /** Avisos ativos do condomínio, já marcados com o que este usuário leu. */
  listarAvisos() {
    return http.get("/avisos/ativos");
  },
  confirmarLeitura(avisoId) {
    return http.post(`/avisos/${avisoId}/lido`);
  },
  relatorioLeitura(avisoId) {
    return http.get(`/avisos/${avisoId}/leituras`);
  },
};
