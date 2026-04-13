// src/routes/index.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { SolicitarAcesso } from "../pages/auth/SolicitarAcesso";
import { Login } from "../pages/auth/Login";
import { EsqueceuSenha } from "../pages/auth/EsqueceuSenha";
import { Perfil } from "../pages/usuario/perfil/Perfil";
import { GerenciarUsuarios } from "../pages/adm/GerenciarUsuarios";
import { AppLayout } from "../layouts/AppLayout";

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
  // Páginas do app — com navbar
  {
    element: <AppLayout />,
    children: [
      { path: "/perfil", element: <Perfil /> },
      { path: "/adm/usuarios", element: <GerenciarUsuarios /> },
    ],
  },
]);
