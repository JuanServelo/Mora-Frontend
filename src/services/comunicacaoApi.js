import axios from "axios";

/**
 * Client do comunicacao-service.
 *
 * Instância própria porque é outro serviço, em outra porta — mesmo desenho de
 * financeiroApi.js e gestaoApi.js.
 *
 * A caixa de notificações vinha do financeiro-service. Mudou de lugar porque a
 * caixa é **do usuário**, não de um serviço: ela mistura fatura, aviso e
 * mensagem, e com uma tabela por serviço a tela teria que juntar as fontes e
 * ordenar sozinha.
 */
const comunicacao = axios.create({
  baseURL: import.meta.env.VITE_COMUNICACAO_API_URL || "http://localhost:3003",
});

comunicacao.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const base = "/api/comunicacao";

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
  return `${comunicacao.defaults.baseURL}${caminho}`;
}

export const comunicacaoApi = {
  // ── Notificações ──────────────────────────────────────
  listarNotificacoes(params) {
    return comunicacao.get(`${base}/notificacoes`, { params });
  },
  /** Contador do sino: notificações não lidas + conversas com mensagem nova. */
  resumo() {
    return comunicacao.get(`${base}/notificacoes/resumo`);
  },
  marcarNotificacaoLida(id) {
    return comunicacao.patch(`${base}/notificacoes/${id}/lida`);
  },
  marcarTodasNotificacoesLidas() {
    return comunicacao.post(`${base}/notificacoes/lidas`);
  },

  // ── Conversas ─────────────────────────────────────────
  listarConversas(incluirEncerradas = false) {
    return comunicacao.get(`${base}/conversas`, {
      params: incluirEncerradas ? { encerradas: "true" } : undefined,
    });
  },
  abrirConversa(dados) {
    return comunicacao.post(`${base}/conversas`, dados);
  },
  verConversa(id) {
    return comunicacao.get(`${base}/conversas/${id}`);
  },
  responder(id, corpo) {
    return comunicacao.post(`${base}/conversas/${id}/mensagens`, { corpo });
  },
  encerrarConversa(id) {
    return comunicacao.patch(`${base}/conversas/${id}/encerrar`);
  },
  removerMensagem(id) {
    return comunicacao.delete(`${base}/mensagens/${id}`);
  },
  /** Só a gestão: o morador alcança a rota, mas recortada na unidade dele. */
  listarContatos() {
    return comunicacao.get(`${base}/contatos`);
  },

  // ── Avisos e confirmação de leitura ───────────────────
  /** Envia a imagem e devolve a URL para gravar junto do aviso. */
  enviarImagemAviso(arquivo) {
    const dados = new FormData();
    dados.append("imagem", arquivo);
    return comunicacao.post(`${base}/avisos/imagem`, dados, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  listarAvisos() {
    return comunicacao.get(`${base}/avisos`);
  },
  confirmarLeitura(avisoId) {
    return comunicacao.post(`${base}/avisos/${avisoId}/leitura`);
  },
  /** Panorama da gestão: avisos ativos e quantos confirmaram cada um. */
  panoramaLeituras() {
    return comunicacao.get(`${base}/avisos/leituras`);
  },
  relatorioLeitura(avisoId) {
    return comunicacao.get(`${base}/avisos/${avisoId}/leituras`);
  },
};
