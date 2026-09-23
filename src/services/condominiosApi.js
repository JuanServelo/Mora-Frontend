import api from './api';

export const condominiosApi = {
  listar() {
    return api.get('/api/condominios');
  },

  buscar(id) {
    return api.get(`/api/condominios/${id}`);
  },

  criar(dados) {
    return api.post('/api/condominios', dados);
  },

  atualizar(id, dados) {
    return api.put(`/api/condominios/${id}`, dados);
  },

  desativar(id) {
    return api.patch(`/api/condominios/${id}/deactivate`);
  },

  ativar(id) {
    return api.patch(`/api/condominios/${id}/activate`);
  },

  listarUsuarios(id) {
    return api.get(`/api/condominios/${id}/users`);
  },

  vincularUsuario(id, userId) {
    return api.patch(`/api/condominios/${id}/assign-user`, { userId });
  },
};
