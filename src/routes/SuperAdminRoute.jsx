import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Apenas o Super Admin da plataforma (role === "admin") pode acessar.
export function SuperAdminRoute({ children }) {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  if (!usuario || usuario.role !== "admin") {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}
