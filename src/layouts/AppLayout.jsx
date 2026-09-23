// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/navbar/Navbar";
import { Sidebar } from "../components/sidebar/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { NotificacoesProvider } from "../contexts/NotificacoesContext";
import { podeAcessarAdmin, PERFIS } from "../utils/perfis";

export function AppLayout() {
  const { usuario } = useAuth();
  const isAdmin = podeAcessarAdmin(usuario?.perfil);
  const isDoorman = usuario?.perfil === PERFIS.PORTEIRO;

  // O provider fica aqui, e não na raiz: só faz sentido consultar contadores
  // depois que existe uma sessão, e assim as telas de login não chamam a API.
  return (
    <NotificacoesProvider>
      {isAdmin || isDoorman ? (
        // Admins e porteiro usam layout de barra lateral; os demais, a navbar.
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
            <Outlet />
          </main>
        </div>
      ) : (
        <>
          <Navbar />
          <div className="pt-20 sm:pt-24">
            <Outlet />
          </div>
        </>
      )}
    </NotificacoesProvider>
  );
}
