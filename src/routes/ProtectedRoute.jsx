import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function ProtectedRoute({ children }) {
  const { t } = useTranslation("layout");
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        {t("rota.carregando")}
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
