import axios from "axios";

/**
 * Client do ocorrencias-service: reclamações, ordens de serviço e fornecedores.
 *
 * O serviço é o Java, na 8095. Em desenvolvimento a chamada passa pelo proxy
 * `/ocorrencias-api` do Vite, que remove o prefixo antes de encaminhar — o
 * Traefik faz o mesmo em produção com `/api/ocorrencias`, então os caminhos
 * aqui são os mesmos nos dois ambientes.
 *
 * Antes as reclamações viviam no auth-api (`/api/reclamacoes`); migraram para
 * cá junto com as ordens de serviço (D27).
 */
const ocorrencias = axios.create({
  baseURL: import.meta.env.VITE_OCORRENCIAS_API_URL || "/ocorrencias-api",
});

ocorrencias.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** A mensagem que o serviço manda em `erro`, ou a padrão. */
export const mensagemDeErro = (err, padrao) => err?.response?.data?.erro || padrao;

export const reclamacoesApi = {
  /** As do usuário logado. */
  listarMinhas: () => ocorrencias.get("/reclamacoes/minhas"),

  registrar: (data) => ocorrencias.post("/reclamacoes", data),

  /** Gestão: as do condomínio, opcionalmente por status. */
  listar: (params) => ocorrencias.get("/reclamacoes", { params }),

  detalhar: (id) => ocorrencias.get(`/reclamacoes/${id}`),

  /** Síndico: `{ mensagem, status? }` — com status, a mensagem é a justificativa. */
  atender: (id, data) => ocorrencias.patch(`/reclamacoes/${id}`, data),
};

export const ordensServicoApi = {
  listar: (params) => ocorrencias.get("/ordens-servico", { params }),

  detalhar: (id) => ocorrencias.get(`/ordens-servico/${id}`),

  estatisticas: () => ocorrencias.get("/ordens-servico/estatisticas"),

  /** `{ descricao, prioridade, prazo, responsavel?, fornecedorId?, reclamacaoId? }` */
  abrir: (data) => ocorrencias.post("/ordens-servico", data),

  registrarAndamento: (id, mensagem) => ocorrencias.post(`/ordens-servico/${id}/andamentos`, { mensagem }),

  concluir: (id, data) => ocorrencias.post(`/ordens-servico/${id}/conclusao`, data),
};

export const fornecedoresApi = {
  listar: () => ocorrencias.get("/fornecedores"),

  criar: (data) => ocorrencias.post("/fornecedores", data),

  atualizar: (id, data) => ocorrencias.put(`/fornecedores/${id}`, data),
};
