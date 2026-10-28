import { afterEach, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); localStorage.clear(); vi.resetModules(); });

it("encaminha todos os clientes ao gateway, com prefixos distintos e JWT preservado", async () => {
  vi.resetModules();
  vi.stubEnv("VITE_GATEWAY_URL", "http://localhost:8087/");
  vi.stubEnv("VITE_API_URL", "http://localhost:3001");
  vi.stubEnv("VITE_PORTARIA_API_URL", "http://localhost:8090");
  const { default: axios } = await import("axios");
  const original = axios.defaults.adapter;
  const requisicoes = [];
  axios.defaults.adapter = async (config) => {
    requisicoes.push({ url: axios.getUri(config), token: config.headers.Authorization });
    return { config, data: [], status: 200, statusText: "OK", headers: {} };
  };
  try {
    localStorage.setItem("token", "token-de-teste");
    const [{ default: api }, { acessoApi }, { planApi }, { meetingApi }, { gestaoApi }, { financeiroApi },
      { blocoApi }, { entregaApi }, { conhecimentoApi, urlDaImagem }, { fotoUrlCompleta }] = await Promise.all([
      import("./api"), import("./acessoApi"), import("./planApi"), import("./meetingApi"), import("./gestaoApi"),
      import("./financeiroApi"), import("./estruturasApi"), import("./entregasApi"), import("./comunicacaoApi"), import("../utils/avatar"),
    ]);
    await Promise.all([api.get("/api/auth/me"), acessoApi.listarGuests(), planApi.listar(), meetingApi.listar(),
      gestaoApi.plataforma(), financeiroApi.obterConfig(), blocoApi.listar(), entregaApi.listarTodas(), conhecimentoApi.listarTodos()]);
    expect(requisicoes).toHaveLength(9);
    expect(requisicoes.every((r) => new URL(r.url).origin === "http://localhost:8087")).toBe(true);
    expect(requisicoes.every((r) => r.token === "Bearer token-de-teste")).toBe(true);
    expect(requisicoes.map((r) => new URL(r.url).pathname)).toContain("/api/acessos/guests");
    expect(requisicoes.map((r) => new URL(r.url).pathname)).toContain("/api/portaria/blocos");
    expect(requisicoes.map((r) => new URL(r.url).pathname)).toContain("/api/comunicacao/artigos");
    expect(urlDaImagem("/uploads/avisos/imagem.png")).toBe("http://localhost:8087/api/comunicacao/uploads/avisos/imagem.png");
    expect(fotoUrlCompleta("/uploads/avatars/foto.jpg")).toBe("http://localhost:8087/uploads/avatars/foto.jpg");
  } finally { axios.defaults.adapter = original; }
});
