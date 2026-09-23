import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { usePlano } from "../contexts/PlanoContext";
import { podeAcessarRotaAdmin } from "../utils/menuAdmin";
import { redirectPorPerfil } from "../utils/perfis";

/**
 * Guarda as rotas /adm/* usando o mesmo mapa que monta o menu.
 *
 * Sem isto, esconder um item do menu não impediria nada: bastaria digitar a URL
 * para a tela abrir. Quem não pode ver volta para a própria tela inicial.
 */
export function AdminRoute({ children }) {
  const { usuario, loading: authLoading } = useAuth();
  const { modulosAtivos, carregando: planoLoading } = usePlano();
  const { pathname } = useLocation();

  if (authLoading || planoLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando...
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (!podeAcessarRotaAdmin(usuario.perfil, pathname, modulosAtivos)) {
    return <Navigate to={redirectPorPerfil(usuario.perfil)} replace />;
  }

  return children;
}
