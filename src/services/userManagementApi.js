import api from './api';

const base = (unidadeId) => `/api/user-management/units/${unidadeId}`;

export const userManagementApi = {
  listarOcupantes(unidadeId) {
    return api.get(`${base(unidadeId)}/occupants`);
  },

  verificarElegibilidadeTransferencia(unidadeId) {
    return api.get(`${base(unidadeId)}/transfer-eligibility`);
  },

  cadastrarLessee(unidadeId, dados) {
    return api.post(`${base(unidadeId)}/occupants/lessee`, dados);
  },

  cadastrarOccupant(unidadeId, dados) {
    return api.post(`${base(unidadeId)}/occupants/occupant`, dados);
  },

  cadastrarGuest(unidadeId, dados) {
    return api.post(`${base(unidadeId)}/occupants/guest`, dados);
  },

  transferirResponsabilidadeFinanceira(unidadeId) {
    return api.post(`${base(unidadeId)}/transfer-financial-responsibility`);
  },

  removerOcupante(unidadeId, userId) {
    return api.delete(`${base(unidadeId)}/occupants/${userId}`);
  },

  listarMoradores(unidadeId) {
    return api.get(`${base(unidadeId)}/residents`);
  },

  vincularUnidade(userId, unidadeId) {
    return api.patch(`/api/user-management/users/${userId}/unit`, { unidadeId });
  },

  desvincularUnidade(userId) {
    return api.delete(`/api/user-management/users/${userId}/unit`);
  },
};
