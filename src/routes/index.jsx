// src/routes/index.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { SolicitarAcesso } from "../pages/auth/SolicitarAcesso";
import { Login } from "../pages/auth/Login";
import { EsqueceuSenha } from "../pages/auth/EsqueceuSenha";
import { AcessoPendente } from "../pages/auth/AcessoPendente";
import { Perfil } from "../pages/usuario/perfil/Perfil";
import { GerenciarUsuarios } from "../pages/adm/GerenciarUsuarios";
import { GerenciarEstruturas } from "../pages/adm/GerenciarEstruturas";
import { GerenciarReunioes } from "../pages/adm/GerenciarReunioes";
import { GerenciarEspacos } from "../pages/adm/GerenciarEspacos";
import { GerenciarReclamacoes } from "../pages/adm/GerenciarReclamacoes";
import { GerenciarEntregas } from "../pages/adm/GerenciarEntregas";
import { GerenciarVagas } from "../pages/adm/GerenciarVagas";
import { GerenciarConhecimento } from "../pages/adm/GerenciarConhecimento";
import { FAQ } from "../pages/usuario/FAQ";
import { MinhasReservas } from "../pages/usuario/MinhasReservas";
import { MinhasReclamacoes } from "../pages/usuario/MinhasReclamacoes";
import { MinhasEntregas } from "../pages/usuario/MinhasEntregas";
import { Inicio } from "../pages/inicio/Inicio";
import { Servicos } from "../pages/servicos/Servicos";
import { Comodidades } from "../pages/comodidades/Comodidades";
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
      { path: "/inicio", element: <Inicio /> },
      { path: "/servicos", element: <Servicos /> },
      { path: "/comodidades", element: <Comodidades /> },
      { path: "/faq", element: <FAQ /> },
      { path: "/perfil", element: <Perfil /> },
      { path: "/acesso-pendente", element: <AcessoPendente /> },
      { path: "/espacos", element: <MinhasReservas /> },
      { path: "/reclamacoes", element: <MinhasReclamacoes /> },
      { path: "/entregas", element: <MinhasEntregas /> },
      { path: "/adm/usuarios", element: <GerenciarUsuarios /> },
      { path: "/adm/estruturas", element: <GerenciarEstruturas /> },
      { path: "/adm/reunioes", element: <GerenciarReunioes /> },
      { path: "/adm/espacos", element: <GerenciarEspacos /> },
      { path: "/adm/reclamacoes", element: <GerenciarReclamacoes /> },
      { path: "/adm/entregas", element: <GerenciarEntregas /> },
      { path: "/adm/vagas", element: <GerenciarVagas /> },
      { path: "/adm/conhecimento", element: <GerenciarConhecimento /> },
    ],
  },
]);
