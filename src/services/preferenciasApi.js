import axios from "axios";

/**
 * Preferências de tela do usuário logado — hoje, como cada um monta os
 * próprios painéis. Guardadas no gestao-geral (banco `mora_gestao`), o serviço
 * dos painéis.
 *
 * Ficam no servidor, e não no navegador, para acompanhar a conta: o síndico que
 * monta o painel no computador do escritório encontra o mesmo painel em casa.
 */
const gestao = axios.create({
  baseURL: import.meta.env.VITE_GESTAO_API_URL || "http://localhost:3002",
});

gestao.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const preferenciasApi = {
  ler: (chave) => gestao.get(`/api/gestao/preferencias/${chave}`),

  salvar: (chave, valor) => gestao.put(`/api/gestao/preferencias/${chave}`, { valor }),

  /** Apaga a preferência: a tela volta ao padrão. */
  remover: (chave) => gestao.delete(`/api/gestao/preferencias/${chave}`),
};
