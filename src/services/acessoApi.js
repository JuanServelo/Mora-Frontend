import api from "./api";

export const acessoApi = {
  // PORTEIRO
  listarGuests: () => api.get("/api/portaria/guests"),
  listarResidentes: () => api.get("/api/portaria/residentes"),
  listarDentro: () => api.get("/api/portaria/dentro"),
  registrarEntrada: (userId) => api.post(`/api/portaria/entrada/${userId}`),
  registrarSaida: (userId) => api.post(`/api/portaria/saida/${userId}`),
  listarHistorico: (userId) => api.get(`/api/portaria/historico/${userId}`),

  listarUsuariosCondominio: () => api.get("/api/portaria/usuarios-condominio"),

  // MORADOR / RESPONSÁVEL
  listarMeusGuests: () => api.get("/api/portaria/meus-guests"),
  alterarPermissao: (guestId, permitir) =>
    api.patch(`/api/portaria/guests/${guestId}/permissao`, { permitir }),
};
