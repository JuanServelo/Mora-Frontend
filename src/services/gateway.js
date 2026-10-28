// Uma única origem para APIs, arquivos e OAuth. Não há fallback para portas dos serviços.
export const GATEWAY_URL = (import.meta.env.VITE_GATEWAY_URL || "http://localhost:8087").replace(/\/+$/, "");
