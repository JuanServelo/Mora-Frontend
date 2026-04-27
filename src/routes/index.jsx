// src/routes/index.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { SolicitarAcesso } from "../pages/auth/SolicitarAcesso";
import { Login } from "../pages/auth/Login";
import { EsqueceuSenha } from "../pages/auth/EsqueceuSenha";
import { Perfil } from "../pages/usuario/perfil/Perfil";
import { GerenciarUsuarios } from "../pages/adm/GerenciarUsuarios";
import { GerenciarEstruturas } from "../pages/adm/GerenciarEstruturas";
import { GerenciarReunioes } from "../pages/adm/GerenciarReunioes";
import { GerenciarEspacos } from "../pages/adm/GerenciarEspacos";
import { GerenciarReclamacoes } from "../pages/adm/GerenciarReclamacoes";
import { GerenciarVagas } from "../pages/adm/GerenciarVagas";
import { MinhasReservas } from "../pages/usuario/MinhasReservas";
import { MinhasReclamacoes } from "../pages/usuario/MinhasReclamacoes";
import { AppLayout } from "../layouts/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  // Páginas de autenticação — sem navbar
  {
    path: "/solicitar-acesso",
    element: <SolicitarAcesso />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/esqueceu-senha",
    element: <EsqueceuSenha />,
  },
  // Páginas do app — com navbar, protegidas
  {
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/perfil", element: <Perfil /> },
      { path: "/espacos", element: <MinhasReservas /> },
      { path: "/reclamacoes", element: <MinhasReclamacoes /> },
      { path: "/adm/usuarios", element: <GerenciarUsuarios /> },
      { path: "/adm/estruturas", element: <GerenciarEstruturas /> },
      { path: "/adm/reunioes", element: <GerenciarReunioes /> },
      { path: "/adm/espacos", element: <GerenciarEspacos /> },
      { path: "/adm/reclamacoes", element: <GerenciarReclamacoes /> },
      { path: "/adm/vagas", element: <GerenciarVagas /> },
    ],
  },
]);
