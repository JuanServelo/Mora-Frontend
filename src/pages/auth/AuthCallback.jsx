import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { redirectPorPerfil } from "../../utils/perfis";

export function AuthCallback() {
  const { completarOAuth } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [erro, setErro] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      navigate("/login?erro=oauth", { replace: true });
      return;
    }

    completarOAuth(token)
      .then((usuario) => {
        navigate(redirectPorPerfil(usuario?.perfil), { replace: true });
      })
      .catch(() => {
        setErro("Não foi possível concluir o login com Google.");
      });
  }, [searchParams, navigate, completarOAuth]);

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4">
          <p className="text-error font-medium">{erro}</p>
          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="text-primary font-semibold hover:underline"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
      Concluindo login...
    </div>
  );
}
