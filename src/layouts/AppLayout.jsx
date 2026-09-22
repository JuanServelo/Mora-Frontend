// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/sidebar/Sidebar";

// Layout único: admin, porteiro e morador usam a mesma barra lateral.
// Quem vê o quê é decidido dentro da Sidebar, pelo perfil.
export function AppLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen pt-14 lg:pt-0">
        <Outlet />
      </main>
    </div>
  );
}
