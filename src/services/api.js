import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Rotas que tratam o próprio 401. Redirecionar a partir daqui atropelaria o
 * fluxo do OAuth, que ainda não tem token quando chama /oauth/exchange, e
 * esconderia a mensagem de erro das telas de login e ativação.
 */
const ROTAS_SEM_REDIRECT = [
  "/api/auth/login",
  "/api/auth/oauth/exchange",
  "/api/auth/reset-password",
  "/api/auth/forgot-password",
];

const tratamentoProprio = (url = "") =>
  ROTAS_SEM_REDIRECT.some((rota) => url.includes(rota));

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !tratamentoProprio(url)) {
      localStorage.removeItem("token");
      // replace: não deixa o usuário voltar para uma página já sem sessão.
      window.location.replace("/login?erro=sessao_expirada");
    }
    return Promise.reject(error);
  },
);

export default api;
