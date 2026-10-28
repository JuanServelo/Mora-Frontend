import api from "./api";

export const acessoApi = {
  // PORTEIRO
  listarGuests: () => api.get("/api/acessos/guests"),
  listarResidentes: () => api.get("/api/acessos/residentes"),
  listarDentro: () => api.get("/api/acessos/dentro"),
  registrarEntrada: (userId) => api.post(`/api/acessos/entrada/${userId}`),
  registrarSaida: (userId) => api.post(`/api/acessos/saida/${userId}`),
  listarHistorico: (userId) => api.get(`/api/acessos/historico/${userId}`),

  listarUsuariosCondominio: () => api.get("/api/acessos/usuarios-condominio"),

  // MORADOR / RESPONSÁVEL
  listarMeusGuests: () => api.get("/api/acessos/meus-guests"),
  alterarPermissao: (guestId, permitir) =>
    api.patch(`/api/acessos/guests/${guestId}/permissao`, { permitir }),
  listarHistoricoAcesso: (params) => api.get('/api/acessos/historico-acesso', { params }),
};
