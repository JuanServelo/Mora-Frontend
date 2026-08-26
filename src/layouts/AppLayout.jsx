// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/navbar/Navbar";
import { Sidebar } from "../components/sidebar/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { podeAcessarAdmin, PERFIS } from "../utils/perfis";

export function AppLayout() {
  const { usuario } = useAuth();
  const isAdmin = podeAcessarAdmin(usuario?.perfil);
  const isDoorman = usuario?.perfil === PERFIS.PORTEIRO;

  // Admins e porteiro usam layout de barra lateral; os demais, a navbar.
  if (isAdmin || isDoorman) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="pt-20 sm:pt-24">
        <Outlet />
      </div>
    </>
  );
}
