import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PERFIS } from "../utils/perfis";

const PERFIS_PERMITIDOS = [
  PERFIS.PORTEIRO,
  PERFIS.ADMIN_GERAL,
  PERFIS.ADMIN_SINDICO,
];

export function DoormanRoute({ children }) {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  if (!usuario || !PERFIS_PERMITIDOS.includes(usuario.perfil)) {
    return <Navigate to="/inicio" replace />;
  }

  return children;
}
