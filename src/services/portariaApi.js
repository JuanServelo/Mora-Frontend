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
// VEÍCULOS (substitui Carros)
// ─────────────────────────────────────────────
export const veiculoApi = {
  listar: () => portariaApi.get("/veiculos"),
  listarDentro: () => portariaApi.get("/veiculos/dentro"),
  listarPorProprietario: (proprietarioId) => portariaApi.get(`/veiculos/proprietario/${proprietarioId}`),
  buscar: (id) => portariaApi.get(`/veiculos/${id}`),
  cadastrar: (data) => portariaApi.post("/veiculos/cadastrar", data),
  atualizar: (id, data) => portariaApi.put(`/veiculos/${id}`, data),
  alterarVaga: (id, vagaId) => portariaApi.patch(`/veiculos/${id}/vaga`, { vagaId }),
  registrarEntrada: (id, vagaId) => portariaApi.post(`/veiculos/${id}/entrada`, null, { params: vagaId ? { vagaId } : {} }),
  registrarEntradaPorPlaca: (placa) => portariaApi.post(`/veiculos/entrada/placa/${placa}`),
  registrarEntradaAvulsa: (placa) => portariaApi.post(`/veiculos/entrada/avulsa/${placa}`),
  registrarSaida: (id) => portariaApi.post(`/veiculos/${id}/saida`),
  registrarSaidaPorPlaca: (placa) => portariaApi.post(`/veiculos/saida/placa/${placa}`),
  listarDentroPortaria: () => portariaApi.get('/veiculos/dentro-portaria'),
  historicoAcesso: (params) => portariaApi.get('/veiculos/historico-acesso', { params }),
};

/** @deprecated Use veiculoApi */
export const carroApi = veiculoApi;

// ─────────────────────────────────────────────
// APARTAMENTOS
// ─────────────────────────────────────────────
export const apartamentoApi = {
  listar: () => portariaApi.get("/apartamentos"),
};

// ─────────────────────────────────────────────
// ATENDIMENTO DE PORTARIA (visitantes e terceiros)
// ─────────────────────────────────────────────
export const atendimentoApi = {
  buscar: (q, tipo) =>
    portariaApi.get("/atendimento/buscar", { params: { q, tipo } }),
  buscarPorId: (id) =>
    portariaApi.get(`/atendimento/${id}`),
  vagasUnidade: (apartamentoId) =>
    portariaApi.get(`/atendimento/vagas-unidade/${apartamentoId}`),
  registrar: (data) =>
    portariaApi.post("/atendimento/registrar", data),
  registrarSaida: (id) =>
    portariaApi.post(`/atendimento/${id}/saida`),
  dentro: () =>
    portariaApi.get("/atendimento/dentro"),
  historico: (params) =>
    portariaApi.get("/atendimento/historico", { params }),
};

// ─────────────────────────────────────────────
// RESERVAS DE ÁREAS COMUNS (RF-10)
// ─────────────────────────────────────────────
export const reservaApi = {
  solicitar: (data) => portariaApi.post("/reservas", data),
  listarMinhas: () => portariaApi.get("/reservas/minhas"),
  listar: (status) => portariaApi.get("/reservas", { params: status ? { status } : {} }),
  buscar: (id) => portariaApi.get(`/reservas/${id}`),
  listarPorArea: (areaComunId) => portariaApi.get(`/reservas/area/${areaComunId}`),
  /** Reservas que tocam o período exibido na agenda (inclui as passadas). */
  agenda: (areaComumId, inicio, fim) =>
    portariaApi.get("/reservas/agenda", { params: { areaComumId, inicio, fim } }),
  moradoresDaUnidade: (unidadeId) =>
    portariaApi.get("/reservas/opcoes/moradores", { params: { unidadeId } }),
  funcionarios: () => portariaApi.get("/reservas/opcoes/funcionarios"),
  aprovar: (id) => portariaApi.patch(`/reservas/${id}/aprovar`),
  recusar: (id, justificativa) => portariaApi.patch(`/reservas/${id}/recusar`, { justificativa }),
  cancelar: (id) => portariaApi.patch(`/reservas/${id}/cancelar`),
  /** Fila do síndico: pendentes do condomínio, as mais próximas primeiro. */
  pendentes: () => portariaApi.get("/reservas/pendentes"),
  /** Aprova várias de uma vez; as que conflitarem voltam em `falhas`. */
  aprovarLote: (ids) => portariaApi.post("/reservas/aprovar-lote", ids),
  /** Trilha somente leitura das decisões sobre a reserva. */
  auditoria: (id) => portariaApi.get(`/reservas/${id}/auditoria`),
};

// ─────────────────────────────────────────────
// FUNCIONAMENTO DA ÁREA COMUM (janelas por dia da semana)
// ─────────────────────────────────────────────
export const funcionamentoApi = {
  consultar: (areaComumId) => portariaApi.get(`/funcionamento/${areaComumId}`),
  salvar: (areaComumId, data) => portariaApi.put(`/funcionamento/${areaComumId}`, data),
};

// ─────────────────────────────────────────────
// PRÉ-AUTORIZAÇÕES DE VISITANTES (RF-6)
// ─────────────────────────────────────────────
export const preAutorizacaoApi = {
  minhas: () => portariaApi.get("/pre-autorizacoes/minhas"),
  ativasHoje: () => portariaApi.get("/pre-autorizacoes/hoje"),
  buscar: (termo) => portariaApi.get("/pre-autorizacoes/buscar", { params: { termo } }),
  /** Atendimento: autorização ativa para a placa lida no portão. */
  porPlaca: (placa) => portariaApi.get("/pre-autorizacoes/por-placa", { params: { placa } }),
  /** Atendimento: autorização ativa para o CPF identificado. */
  porCpf: (cpf) => portariaApi.get("/pre-autorizacoes/por-cpf", { params: { cpf } }),
  cadastrar: (data) => portariaApi.post("/pre-autorizacoes", data),
  /** Consome a autorização na entrada; não pode ser reaproveitada depois. */
  utilizar: (id) => portariaApi.post(`/pre-autorizacoes/${id}/utilizar`),
  /**
   * Registra a entrada do visitante pré-liberado (e do veículo dele, se houver)
   * numa só transação. `incluirVeiculo=false` permite a entrada a pé de quem
   * foi pré-liberado com carro — o caso de chegar sem vaga disponível.
   */
  registrarEntrada: (id, { incluirVeiculo = true, vagaId } = {}) =>
    portariaApi.post(`/pre-autorizacoes/${id}/registrar-entrada`, null, {
      params: { incluirVeiculo, ...(vagaId ? { vagaId } : {}) },
    }),
  revogar: (id) => portariaApi.delete(`/pre-autorizacoes/${id}`),
};

// ─────────────────────────────────────────────
// MEUS VEÍCULOS (tela do morador)
// Tudo é escopado pela unidade do JWT — não há parâmetro de unidade.
// ─────────────────────────────────────────────
export const meusVeiculosApi = {
  listar: () => portariaApi.get("/meus-veiculos"),
  pessoasUnidade: () => portariaApi.get("/meus-veiculos/pessoas-unidade"),
  cadastrar: (data) => portariaApi.post("/meus-veiculos", data),
  atualizar: (id, data) => portariaApi.put(`/meus-veiculos/${id}`, data),
  desvincular: (id) => portariaApi.delete(`/meus-veiculos/${id}/vinculo`),
  vincularPessoa: (id, pessoaId) =>
    portariaApi.post(`/meus-veiculos/${id}/pessoas/${pessoaId}`),
  desvincularPessoa: (id, pessoaId) =>
    portariaApi.delete(`/meus-veiculos/${id}/pessoas/${pessoaId}`),
};

// ─────────────────────────────────────────────
// JORNADAS E TURNOS (RF-09 — tela do síndico)
// A identidade do funcionário é do auth-api; aqui vive a vida funcional.
// ─────────────────────────────────────────────
export const jornadaApi = {
  listar: () => portariaApi.get("/jornadas"),
  consultar: (authUserId) => portariaApi.get(`/jornadas/${authUserId}`),
  salvar: (data) => portariaApi.put("/jornadas", data),
  proximosPlantoes: (authUserId, dias = 14) =>
    portariaApi.get(`/jornadas/${authUserId}/proximos-plantoes`, { params: { dias } }),
  /** Prévia antes de confirmar mudança da âncora do ciclo. */
  previa: (data, dias = 14) =>
    portariaApi.post("/jornadas/previa", data, { params: { dias } }),
  avaliarEntrada: (authUserId) =>
    portariaApi.get(`/jornadas/${authUserId}/avaliar-entrada`),
  auditoria: (authUserId) => portariaApi.get(`/jornadas/${authUserId}/auditoria`),
  listarLiberacoes: () => portariaApi.get("/jornadas/liberacoes/todas"),
  criarLiberacao: (data) => portariaApi.post("/jornadas/liberacoes", data),
  cancelarLiberacao: (id) => portariaApi.delete(`/jornadas/liberacoes/${id}`),
};

// ─────────────────────────────────────────────
// CHAVES
// ─────────────────────────────────────────────
export const chaveApi = {
  listar: () => portariaApi.get("/chaves"),
  listarLocais: () => portariaApi.get("/chaves/locais"),
  buscar: (id) => portariaApi.get(`/chaves/${id}`),
  cadastrar: (data) => portariaApi.post("/chaves/cadastrar", data),
  retirar: (id, responsavelId, tipoResponsavel, nomeResponsavel) =>
    portariaApi.post(`/chaves/${id}/retirar`, { responsavelId, tipoResponsavel, nomeResponsavel }),
  devolver: (id) => portariaApi.post(`/chaves/${id}/devolver`),
  deletar: (id) => portariaApi.delete(`/chaves/${id}`),
  historico: (id, params) => portariaApi.get(`/chaves/${id}/historico`, { params }),
};

// ─────────────────────────────────────────────
// Abaixo: clientes que a integracao com feat/ajus havia removido daqui.
//
// Na branch dele estes dois assuntos passaram a ser servidos pelo
// comunicacao-service, e o cliente foi para `comunicacaoApi`. Como o frontend
// voltou ao estado anterior, `GerenciarConhecimento` e `FAQ` seguem importando
// daqui — sem estes blocos o build quebra na importacao.
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// BASE DE CONHECIMENTO / FAQ
// ─────────────────────────────────────────────
export const conhecimentoApi = {
  listarTodos: () => portariaApi.get("/conhecimento"),
  listarPublicados: () => portariaApi.get("/conhecimento/publicados"),
  listarPorCategoria: (categoria) =>
    portariaApi.get(`/conhecimento/categoria/${categoria}`),
  listarPublicadosPorCategoria: (categoria) =>
    portariaApi.get(`/conhecimento/categoria/${categoria}/publicados`),
  buscarPorTitulo: (titulo) =>
    portariaApi.get("/conhecimento/buscar", { params: { titulo } }),
  buscar: (id) => portariaApi.get(`/conhecimento/${id}`),
  criar: (data) => portariaApi.post("/conhecimento", data),
  atualizar: (id, data) => portariaApi.put(`/conhecimento/${id}`, data),
  excluir: (id) => portariaApi.delete(`/conhecimento/${id}`),
};

// ─────────────────────────────────────────────
// AVISOS E COMUNICADOS (por condomínio)
// ─────────────────────────────────────────────
export const avisoApi = {
  listar: (condominioId) =>
    portariaApi.get("/avisos", { params: condominioId ? { condominioId } : {} }),
  listarAtivos: (condominioId) =>
    portariaApi.get("/avisos/ativos", { params: { condominioId } }),
  buscar: (id) => portariaApi.get(`/avisos/${id}`),
  criar: (data) => portariaApi.post("/avisos", data),
  atualizar: (id, data) => portariaApi.put(`/avisos/${id}`, data),
  encerrar: (id) => portariaApi.patch(`/avisos/${id}/encerrar`),
  excluir: (id) => portariaApi.delete(`/avisos/${id}`),
};
