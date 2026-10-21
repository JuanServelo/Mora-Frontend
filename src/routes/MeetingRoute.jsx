import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePlano } from "../contexts/PlanoContext";
import { PERFIS } from "../utils/perfis";

export function MeetingRoute({ modulo, children }) {
  const { usuario, loading } = useAuth();
  const { carregando, modulosAtivos, hasModulo } = usePlano();
  if (loading || carregando) return <p className="p-6">Carregando...</p>;
  const permitido = [PERFIS.ADMIN_GERAL, PERFIS.ADMIN_SINDICO, PERFIS.MORADOR, PERFIS.DONO_ALUGUEL].includes(usuario?.perfil);
  if (!permitido || !usuario?.condominioId) return <Navigate to="/inicio" replace />;
  if (modulosAtivos === null) return <p className="p-6">Carregando...</p>;
  if (usuario.perfil !== PERFIS.ADMIN_GERAL && !hasModulo(modulo)) return <Navigate to="/inicio" replace />;
  return children;
}
