import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useModules } from "../contexts/ModulesContext";
import { rotaLiberada } from "../utils/modulosPlano";

export function ProtectedRoute({ children }) {
  const { usuario, loading } = useAuth();
  const { activeModules, modulesLoading } = useModules();
  const { pathname } = useLocation();

  if (loading || modulesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Bloqueia rotas de módulos não contratados
  if (!rotaLiberada(activeModules, pathname)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}
