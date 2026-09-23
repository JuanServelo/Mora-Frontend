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
    // O backend devolve um código de uso único, não o JWT: a URL do redirect
    // fica registrada no histórico do navegador e nos logs do caminho.
    const code = searchParams.get("code");

    if (!code) {
      navigate("/login?erro=oauth", { replace: true });
      return;
    }

    // O código vale uma única troca; limpar a URL evita reenvio ao recarregar.
    window.history.replaceState({}, "", window.location.pathname);

    completarOAuth(code)
      .then((usuario) => {
        navigate(redirectPorPerfil(usuario?.perfil), { replace: true });
      })
      .catch(() => {
        setErro("Não foi possível concluir o login com Google.");
      });
    // Roda uma única vez: o código já foi consumido na primeira execução.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
