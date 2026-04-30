import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Icone } from "../../components/icones/Icone";

export function AcessoPendente() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen w-full px-6 py-20 flex items-center justify-center">
      <div className="w-full max-w-2xl glass-panel rounded-3xl p-8 md:p-12 text-center">
        <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Icone name="apartment" className="text-primary text-3xl" />
        </div>

        <h1 className="font-headline text-3xl md:text-4xl font-bold text-on-surface mb-4">
          Acesso aguardando vinculacao
        </h1>

        <p className="text-on-surface-variant text-base md:text-lg mb-8">
          Seu cadastro foi criado com sucesso. Para liberar as demais telas, um
          administrador precisa vincular seu usuario a um predio e apartamento.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/perfil"
            className="px-5 py-3 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity"
          >
            Ir para perfil
          </Link>
          <button
            onClick={handleLogout}
            className="px-5 py-3 rounded-full border border-outline-variant text-on-surface font-semibold hover:bg-white/5 transition-colors cursor-pointer"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
}
