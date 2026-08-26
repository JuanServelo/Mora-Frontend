import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "../services/api";
import { redirectPorPerfil } from "../utils/perfis";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      api
        .get("/api/auth/me")
        .then((res) => setUsuario(res.data.usuario))
        .catch(() => localStorage.removeItem("token"))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function persistSession(res) {
    localStorage.setItem("token", res.data.token);
    setUsuario(res.data.usuario);
    return res.data;
  }

  async function login(email, senha) {
    const res = await api.post("/api/auth/login", { email, senha });
    return persistSession(res);
  }

  async function validarConvite(codigo) {
    const res = await api.post("/api/invites/validate", { codigo });
    return res.data;
  }

  async function ativarConta(dados) {
    const res = await api.post("/api/invites/activate", dados);
    return persistSession(res);
  }

  async function esqueciSenha(email) {
    const res = await api.post("/api/auth/forgot-password", { email });
    return res.data;
  }

  async function redefinirSenha(token, senha) {
    const res = await api.post(`/api/auth/reset-password/${token}`, { senha });
    return res.data;
  }

  /**
   * Troca o código de uso único recebido no redirect do Google pelo JWT.
   * O token não vem mais na URL — ela vaza para histórico, logs e Referer.
   */
  const completarOAuth = useCallback(async (code) => {
    const res = await api.post("/api/auth/oauth/exchange", { code });
    localStorage.setItem("token", res.data.token);
    setUsuario(res.data.usuario);
    return res.data.usuario;
  }, []);

  function loginComGoogle() {
    const base = import.meta.env.VITE_API_URL || "http://localhost:3001";
    window.location.href = `${base}/api/auth/google`;
  }

  async function atualizarPerfil(dados) {
    const res = await api.put("/api/auth/me", dados);
    setUsuario(res.data.usuario);
    return res.data;
  }

  async function atualizarFoto(file) {
    const formData = new FormData();
    formData.append("foto", file);
    const res = await api.post("/api/auth/me/foto", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    setUsuario(res.data.usuario);
    return res.data;
  }

  async function logout() {
    // Revoga o token no servidor: limpar só o navegador deixaria um token
    // roubado válido até expirar. A sessão local cai mesmo se a chamada falhar.
    try {
      await api.post("/api/auth/logout");
    } catch {
      // Token já inválido ou API fora — seguir com a limpeza local.
    }
    localStorage.removeItem("token");
    setUsuario(null);
  }

  function getRedirectPath(perfil) {
    return redirectPorPerfil(perfil);
  }

  return (
    <AuthContext.Provider
      value={{
        usuario,
        loading,
        login,
        validarConvite,
        ativarConta,
        esqueciSenha,
        redefinirSenha,
        completarOAuth,
        loginComGoogle,
        atualizarPerfil,
        atualizarFoto,
        logout,
        getRedirectPath,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
