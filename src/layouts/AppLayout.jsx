// src/layouts/AppLayout.jsx
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Navbar } from "../components/navbar/Navbar";
import { Sidebar } from "../components/sidebar/Sidebar";
import { Icone } from "../components/icones/Icone";
import { useAuth } from "../contexts/AuthContext";
import { podeAcessarAdmin, PERFIS } from "../utils/perfis";

export function AppLayout() {
  const { usuario } = useAuth();
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

  const isAdmin = podeAcessarAdmin(usuario?.perfil);
  const isDoorman = usuario?.perfil === PERFIS.PORTEIRO;

  // Admins e porteiro usam layout de barra lateral; os demais, a navbar.
  if (isAdmin || isDoorman) {
    const fechar = () => setMenuAberto(false);

    return (
      <div className="flex min-h-screen">
        <Sidebar aberta={menuAberto} aoFechar={fechar} />

        {/* Fundo que fecha a gaveta ao toque. Só existe no celular, onde a
            barra cobre o conteúdo — no desktop ela é parte do layout. */}
        {menuAberto && (
          <div
            onClick={fechar}
            aria-hidden="true"
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          />
        )}

        {/* A margem só entra a partir de lg. Fixa, ela empurrava o conteúdo
            256px para fora de um viewport de 375px, e a tela ficava ilegível.
            `min-w-0` impede que um filho largo (tabela, gráfico) estique o
            flex item além da tela. */}
        <main className="flex-1 lg:ml-64 min-h-screen min-w-0">
          <div className="lg:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 border-b border-veu/5 backdrop-blur-xl bg-surface/70">
            <button
              onClick={() => setMenuAberto(true)}
              aria-label="Abrir menu"
              className="p-2 -ml-2 rounded-xl text-on-surface hover:bg-veu/5 cursor-pointer"
            >
              <Icone name="menu" />
            </button>
            <span className="text-sm font-bold text-on-surface truncate">
              {tituloDaRota(pathname)}
            </span>
          </div>

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

/** Nome curto da seção, para a barra do celular não ficar sem referência. */
function tituloDaRota(pathname) {
  const mapa = {
    "/adm/geral": "Visão Geral",
    "/adm/condominios": "Clientes",
    "/adm/planos": "Planos",
    "/adm/usuarios": "Usuários",
    "/adm/estruturas": "Estruturas",
    "/adm/perfis": "Perfis",
    "/adm/financeiro": "Financeiro",
    "/adm/reunioes": "Reuniões",
    "/adm/reclamacoes": "Reclamações",
    "/adm/entregas": "Entregas",
    "/adm/vagas": "Vagas",
    "/adm/conhecimento": "Conhecimento",
    "/adm/meu-plano": "Meu Plano",
  };
  const chave = Object.keys(mapa).find((k) => pathname.startsWith(k));
  return chave ? mapa[chave] : "Mora";
}
