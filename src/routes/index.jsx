// src/routes/index.jsx
import { createBrowserRouter, Navigate } from "react-router-dom";
import { AtivarConta } from "../pages/auth/AtivarConta";
import { SemConvite } from "../pages/auth/SemConvite";
import { Login } from "../pages/auth/Login";
import { EsqueceuSenha } from "../pages/auth/EsqueceuSenha";
import { ResetPassword } from "../pages/auth/ResetPassword";
import { AuthCallback } from "../pages/auth/AuthCallback";
import { AcessoPendente } from "../pages/auth/AcessoPendente";
import { Perfil } from "../pages/usuario/perfil/Perfil";
import { GerenciarUsuarios } from "../pages/adm/GerenciarUsuarios";
import { GerenciarEstruturas } from "../pages/adm/GerenciarEstruturas";
import { GerenciarReunioes } from "../pages/adm/GerenciarReunioes";
import { GerenciarReclamacoes } from "../pages/adm/GerenciarReclamacoes";
import { GerenciarEntregas } from "../pages/adm/GerenciarEntregas";
import { GerenciarConhecimento } from "../pages/adm/GerenciarConhecimento";
import { GerenciarPerfis } from "../pages/adm/GerenciarPerfis";
import { GerenciarCondominios } from "../pages/adm/GerenciarCondominios";
import { GerenciarPlanos } from "../pages/adm/GerenciarPlanos";
import { GerenciarFinanceiro } from "../pages/adm/GerenciarFinanceiro";
import { MeuPlano } from "../pages/adm/MeuPlano";
import { GerenciarVeiculos } from "../pages/adm/GerenciarVeiculos";
import { FAQ } from "../pages/usuario/FAQ";
import { MinhasReservas } from "../pages/usuario/MinhasReservas";
import { MinhasReclamacoes } from "../pages/usuario/MinhasReclamacoes";
import { MinhasEntregas } from "../pages/usuario/MinhasEntregas";
import { Inicio } from "../pages/inicio/Inicio";
import { Servicos } from "../pages/servicos/Servicos";
import { Comodidades } from "../pages/comodidades/Comodidades";
import { Portaria } from "../pages/portaria/Portaria";
import { Chaves } from "../pages/porteiro/Chaves";
import { AtendimentoPortaria } from "../pages/porteiro/AtendimentoPortaria";
import { UsuariosCondominio } from "../pages/porteiro/UsuariosCondominio";
import { MeusConvidados } from "../pages/usuario/MeusConvidados";
import { MinhasCobrancas } from "../pages/usuario/MinhasCobrancas";
import { Notificacoes } from "../pages/usuario/Notificacoes";
import { Conversas } from "../pages/usuario/Conversas";
import { Avisos } from "../pages/usuario/Avisos";
import { GerenciarComunicados } from "../pages/adm/GerenciarComunicados";
import { AppLayout } from "../layouts/AppLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import { DoormanRoute } from "./DoormanRoute";
import { AdminRoute } from "./AdminRoute";
import { IndexAdminGeralLazy } from "../pages/adm/IndexAdminGeralLazy";
import { DetalheCondominio } from "../pages/adm/DetalheCondominio";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },
  // Páginas de autenticação — sem navbar
  {
    path: "/solicitar-acesso",
    element: <Navigate to="/sem-convite" replace />,
  },
  {
    path: "/sem-convite",
    element: <SemConvite />,
  },
  {
    path: "/ativar",
    element: <AtivarConta />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/esqueceu-senha",
    element: <EsqueceuSenha />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
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
      // Duas telas, dois papeis: o morador ve as encomendas dele; o porteiro
      // cadastra e da baixa nas do predio inteiro. Antes a gestao de entregas
      // ficava em /adm, onde o porteiro nao entra — quem recebe a encomenda
      // nao tinha onde registra-la.
      { path: "/entregas", element: <MinhasEntregas /> },
      {
        path: "/portaria/entregas",
        element: (
          <DoormanRoute>
            <GerenciarEntregas />
          </DoormanRoute>
        ),
      },
      { path: "/portaria", element: <Portaria /> },
      { path: "/entradas-e-saidas", element: <Portaria /> },
      { path: "/atendimento", element: <AtendimentoPortaria /> },
      { path: "/chaves", element: <Chaves /> },
      { path: "/veiculos", element: <GerenciarVeiculos /> },
      {
        path: "/usuarios",
        element: (
          <DoormanRoute>
            <UsuariosCondominio />
          </DoormanRoute>
        ),
      },
      { path: "/meus-convidados", element: <MeusConvidados /> },
      { path: "/financeiro", element: <MinhasCobrancas /> },
      { path: "/notificacoes", element: <Notificacoes /> },
      { path: "/avisos", element: <Avisos /> },
      // A mesma tela com e sem conversa aberta: o serviço decide o que cada
      // perfil enxerga, entao nao ha rota separada para sindico e morador.
      { path: "/conversas", element: <Conversas /> },
      { path: "/conversas/:id", element: <Conversas /> },
      // Todas as telas /adm passam pelo AdminRoute, que usa o mesmo mapa do menu
      // (src/utils/menuAdmin.js) — assim esconder do menu também barra a URL.
      { path: "/adm/geral", element: <AdminRoute><IndexAdminGeralLazy /></AdminRoute> },
      { path: "/adm/condominios", element: <AdminRoute><GerenciarCondominios /></AdminRoute> },
      { path: "/adm/condominios/:id", element: <AdminRoute><DetalheCondominio /></AdminRoute> },
      { path: "/adm/planos", element: <AdminRoute><GerenciarPlanos /></AdminRoute> },
      { path: "/adm/usuarios", element: <AdminRoute><GerenciarUsuarios /></AdminRoute> },
      { path: "/adm/estruturas", element: <AdminRoute><GerenciarEstruturas /></AdminRoute> },
      { path: "/adm/perfis", element: <AdminRoute><GerenciarPerfis /></AdminRoute> },
      { path: "/adm/meu-plano", element: <AdminRoute><MeuPlano /></AdminRoute> },
      { path: "/adm/financeiro", element: <AdminRoute><GerenciarFinanceiro /></AdminRoute> },
      { path: "/adm/comunicados", element: <AdminRoute><GerenciarComunicados /></AdminRoute> },
      { path: "/adm/reunioes", element: <AdminRoute><GerenciarReunioes /></AdminRoute> },
      { path: "/adm/reclamacoes", element: <AdminRoute><GerenciarReclamacoes /></AdminRoute> },
      { path: "/adm/conhecimento", element: <AdminRoute><GerenciarConhecimento /></AdminRoute> },
      { path: "/adm/veiculos", element: <GerenciarVeiculos /> },

      // Endereços antigos, mantidos como atalho: quem tiver link salvo ou
      // histórico do navegador chega ao lugar novo em vez de um 404 cru.
      // Vagas virou aba dentro de Estruturas; entregas passaram à portaria.
      { path: "/adm/vagas", element: <Navigate to="/adm/estruturas" replace /> },
      { path: "/adm/entregas", element: <Navigate to="/portaria/entregas" replace /> },
    ],
  },
]);
