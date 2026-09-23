import axios from "axios";

/**
 * Client do comunicacao-service.
 *
 * O serviço é o Java, na 8094. Em desenvolvimento a chamada passa pelo proxy
 * `/comunicacao-api` do Vite, que remove o prefixo antes de encaminhar — o
 * Traefik faz o mesmo em produção com `/api/comunicacao`, então os caminhos
 * aqui são os mesmos nos dois ambientes.
 *
 * A caixa de notificações vinha do financeiro-service. Mudou de lugar porque a
 * caixa é **do usuário**, não de um serviço: ela mistura fatura, aviso e
 * mensagem, e com uma tabela por serviço a tela teria que juntar as fontes e
 * ordenar sozinha.
 */
const comunicacao = axios.create({
  baseURL: import.meta.env.VITE_COMUNICACAO_API_URL || "/comunicacao-api",
});

comunicacao.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

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

// ─────────────────────────────────────────────
// BASE DE CONHECIMENTO / FAQ
//
// Moravam no portaria-service e foram para cá na refatoração do feat/ajus. Os
// caminhos mudaram junto: `/conhecimento` virou `/artigos`, e os recortes que
// eram rota própria (`/categoria/{x}`, `/publicados`) viraram parâmetro de
// consulta na listagem.
// ─────────────────────────────────────────────
export const conhecimentoApi = {
  listarTodos: () => comunicacao.get("/artigos"),
  listarPublicados: () => comunicacao.get("/artigos", { params: { publicadosOnly: true } }),
  listarPorCategoria: (categoria) =>
    comunicacao.get("/artigos", { params: { categoria } }),
  listarPublicadosPorCategoria: (categoria) =>
    comunicacao.get("/artigos", { params: { publicadosOnly: true, categoria } }),
  buscar: (id) => comunicacao.get(`/artigos/${id}`),
  criar: (data) => comunicacao.post("/artigos", data),
  atualizar: (id, data) => comunicacao.put(`/artigos/${id}`, data),
  publicar: (id) => comunicacao.patch(`/artigos/${id}/publicar`),
  excluir: (id) => comunicacao.delete(`/artigos/${id}`),
};

// ─────────────────────────────────────────────
// AVISOS — forma de recurso
//
// Os mesmos endpoints que o objeto `comunicacaoApi` acima expõe como
// `criarAviso`/`atualizarAviso`/…, agrupados como recurso. Duas telas falam de
// aviso e cada uma preferiu uma forma: `GerenciarComunicados` usa o objeto
// grande, a aba de avisos em `GerenciarConhecimento` usa esta. Apontar as duas
// para o mesmo cliente axios é o que impede que divirjam.
//
// `listar` aceita um condominioId por compatibilidade com quem já chamava
// assim; o serviço ignora o parâmetro e recorta pelo condomínio do token, que é
// a única fonte em que se pode confiar.
// ─────────────────────────────────────────────
export const avisoApi = {
  listar: () => comunicacao.get("/avisos"),
  listarAtivos: () => comunicacao.get("/avisos/ativos"),
  buscar: (id) => comunicacao.get(`/avisos/${id}`),
  criar: (data) => comunicacao.post("/avisos", data),
  atualizar: (id, data) => comunicacao.put(`/avisos/${id}`, data),
  publicar: (id) => comunicacao.patch(`/avisos/${id}/publicar`),
  encerrar: (id) => comunicacao.patch(`/avisos/${id}/encerrar`),
  excluir: (id) => comunicacao.delete(`/avisos/${id}`),
};

export const comunicacaoApi = {
  // ── Notificações ──────────────────────────────────────
  /**
   * A caixa do usuário, no formato que as telas esperam.
   *
   * O serviço devolve um `Page` do Spring — `content`, `totalElements` e o
   * resto da paginação. Desembrulhar aqui, e não lá, mantém o endpoint como
   * está para quem já o consome e evita que cada tela aprenda a ler página.
   */
  async listarNotificacoes(params) {
    const resposta = await comunicacao.get("/notificacoes", { params });
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
    return comunicacao.get("/notificacoes/resumo");
  },
  marcarNotificacaoLida(id) {
    return comunicacao.patch(`/notificacoes/${id}/lida`);
  },
  marcarTodasNotificacoesLidas() {
    return comunicacao.patch("/notificacoes/todas-lidas");
  },

  // ── Conversas ─────────────────────────────────────────
  listarConversas(incluirEncerradas = false) {
    return comunicacao.get("/conversas", {
      params: incluirEncerradas ? { encerradas: "true" } : undefined,
    });
  },
  abrirConversa(dados) {
    return comunicacao.post("/conversas", dados);
  },
  verConversa(id) {
    return comunicacao.get(`/conversas/${id}`);
  },
  responder(id, corpo) {
    return comunicacao.post(`/conversas/${id}/mensagens`, { corpo });
  },
  encerrarConversa(id) {
    return comunicacao.patch(`/conversas/${id}/encerrar`);
  },
  removerMensagem(id) {
    return comunicacao.delete(`/mensagens/${id}`);
  },
  /** Só a gestão: o morador alcança a rota, mas recortada na unidade dele. */
  listarContatos() {
    return comunicacao.get("/contatos");
  },

  // ── Avisos e confirmação de leitura ───────────────────
  /**
   * Avisos vigentes, já marcados com o que este usuário leu.
   *
   * O serviço devolve a lista crua; a tela espera `{ avisos, pendentes }`.
   * `pendentes` é contado aqui porque é derivado — guardá-lo no serviço
   * obrigaria a recalcular a cada leitura confirmada.
   */
  async listarAvisos() {
    const resposta = await comunicacao.get("/avisos/ativos");
    const avisos = Array.isArray(resposta.data) ? resposta.data : [];
    return {
      ...resposta,
      data: {
        sucesso: true,
        avisos,
        pendentes: avisos.filter((a) => !a.lido).length,
      },
    };
  },
  async confirmarLeitura(avisoId) {
    const resposta = await comunicacao.post(`/avisos/${avisoId}/lido`);
    // A tela usa `leitura.confirmadaEm` para mostrar quando registrou.
    return {
      ...resposta,
      data: { sucesso: true, leitura: { confirmadaEm: new Date().toISOString() } },
    };
  },
  relatorioLeitura(avisoId) {
    return comunicacao.get(`/avisos/${avisoId}/leituras`);
  },

  // ── Gestão de comunicados ─────────────────────────────
  listarAvisosGestao() {
    return comunicacao.get("/avisos");
  },
  criarAviso(dados) {
    return comunicacao.post("/avisos", dados);
  },
  atualizarAviso(id, dados) {
    return comunicacao.put(`/avisos/${id}`, dados);
  },
  publicarAviso(id) {
    return comunicacao.patch(`/avisos/${id}/publicar`);
  },
  encerrarAviso(id) {
    return comunicacao.patch(`/avisos/${id}/encerrar`);
  },
  excluirAviso(id) {
    return comunicacao.delete(`/avisos/${id}`);
  },

  // ── Ainda sem endpoint no serviço ─────────────────────
  // O panorama de leituras e o upload de imagem do aviso não foram portados
  // para o Java. Falham com 404, e é melhor assim: um stub silencioso faria a
  // tela parecer funcionando com dado vazio.
  panoramaLeituras() {
    return comunicacao.get("/avisos/leituras");
  },
  enviarImagemAviso(arquivo) {
    const dados = new FormData();
    dados.append("imagem", arquivo);
    return comunicacao.post("/avisos/imagem", dados, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};
