// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/navbar/Navbar";
import { Sidebar } from "../components/sidebar/Sidebar";
import { useAuth } from "../contexts/AuthContext";
import { podeAcessarAdmin, PERFIS } from "../utils/perfis";

export function AppLayout() {
  const { usuario } = useAuth();
  const isAdmin = podeAcessarAdmin(usuario?.perfil) || usuario?.role === "admin";
  const isDoorman = usuario?.perfil === PERFIS.DOORMAN;

  // Admins e porteiro usam layout de barra lateral; os demais, a navbar.
  if (isAdmin || isDoorman) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <>
      <Navbar />
      <div className="pt-24">
        <Outlet />
      </div>
    </>
  );
}
