import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSuperAdmin } from "../utils/perfis";

export function SuperAdminRoute({ children }) {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  if (!usuario || !isSuperAdmin(usuario.perfil)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}
