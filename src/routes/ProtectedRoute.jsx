import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ children }) {
  const { usuario, loading } = useAuth();
  const location = useLocation();

  const role = String(usuario?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const hasBuilding = Boolean(usuario?.bloco);
  const hasApartment = Boolean(usuario?.apartamento);
  const hasUnitAssociation = hasBuilding && hasApartment;
  const isRestrictedUser = Boolean(usuario) && !isAdmin && !hasUnitAssociation;
  const allowedRestrictedPaths = new Set(["/perfil", "/acesso-pendente"]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (isRestrictedUser && !allowedRestrictedPaths.has(location.pathname)) {
    return <Navigate to="/acesso-pendente" replace state={{ from: location.pathname }} />;
  }

  return children;
}
