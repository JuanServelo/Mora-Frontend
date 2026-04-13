import { createContext, useContext, useState, useEffect } from "react";
import api from "../services/api";

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

  async function login(email, senha) {
    const res = await api.post("/api/auth/login", { email, senha });
    localStorage.setItem("token", res.data.token);
    setUsuario(res.data.usuario);
    return res.data;
  }

  async function registrar(nome, email, senha) {
    const res = await api.post("/api/auth/register", { nome, email, senha });
    localStorage.setItem("token", res.data.token);
    setUsuario(res.data.usuario);
    return res.data;
  }

  async function esqueciSenha(email) {
    const res = await api.post("/api/auth/forgot-password", { email });
    return res.data;
  }

  async function atualizarPerfil(dados) {
    const res = await api.put("/api/auth/me", dados);
    setUsuario(res.data.usuario);
    return res.data;
  }

  function logout() {
    localStorage.removeItem("token");
    setUsuario(null);
  }

  return (
    <AuthContext.Provider
      value={{ usuario, loading, login, registrar, esqueciSenha, atualizarPerfil, logout }}
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
