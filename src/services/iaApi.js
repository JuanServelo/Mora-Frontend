// src/services/iaApi.js
import axios from "axios";

/**
 * O ia-service (Mora Inteligente): previsão de inadimplência e o assistente
 * do síndico, em Python.
 *
 * Em desenvolvimento passa pelo proxy do Vite (`/ia-api` → porta 8000), como o
 * portaria e o comunicacao; assim o serviço não precisa liberar CORS.
 */
const iaHttp = axios.create({
  baseURL: import.meta.env.VITE_IA_API_URL || "/ia-api",
});

iaHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const iaApi = {
  /**
   * Pergunta ao assistente. Devolve `{ fonte, resposta, chamadas, modelo, motivo }`:
   * `fonte` é "gemini" (resposta conferida), "dados" (a resposta citou número
   * que as funções não devolveram e foi trocada pelos dados consultados) ou
   * "indisponivel".
   */
  perguntar: (pergunta) => iaHttp.post("/api/ia/assistente", { pergunta }),
};
