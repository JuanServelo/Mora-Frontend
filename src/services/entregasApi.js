// src/services/entregasApi.js
import axios from "axios";
import { GATEWAY_URL } from "./gateway";

const portariaBase = axios.create({
  baseURL: `${GATEWAY_URL}/api/portaria`,
});

portariaBase.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const entregaApi = {
  listarTodas: () => portariaBase.get("/entregas"),
  buscar: (id) => portariaBase.get(`/entregas/${id}`),
  cadastrar: (data) => portariaBase.post("/entregas/cadastrar", data),
  atualizar: (id, data) => portariaBase.put(`/entregas/${id}`, data),
  /**
   * Dá baixa na encomenda.
   *
   * Endpoint de ação, não o PUT genérico: o morador pode retirar a própria
   * encomenda, mas não pode reescrever os campos dela — e o PUT exige perfil
   * de portaria justamente por isso.
   */
  retirar: (id, recebedorNome, dataRetirada) =>
    portariaBase.post(`/entregas/${id}/retirar`, recebedorNome, {
      headers: { "Content-Type": "text/plain" },
      params: dataRetirada ? { dataRetirada } : {},
    }),
  excluir: (id) => portariaBase.delete(`/entregas/${id}`),
};
