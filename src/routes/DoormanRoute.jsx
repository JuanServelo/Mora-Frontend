import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { PERFIS, podeAcessarAdmin } from "../utils/perfis";

const PERFIS_PERMITIDOS = [
  PERFIS.DOORMAN,
  PERFIS.CONTRACTING_PROPERTY_MANAGER,
  PERFIS.CONTRACTING_SYNDIC,
  PERFIS.OPERATIONAL_SYNDIC,
  PERFIS.ADMINISTRATOR,
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
