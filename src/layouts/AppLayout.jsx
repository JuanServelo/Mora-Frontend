// src/layouts/AppLayout.jsx
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "../components/sidebar/Sidebar";
import { Icone } from "../components/icones/Icone";
import { useTranslation } from "react-i18next";

export function AppLayout() {
  const { t } = useTranslation("layout");
  const { pathname } = useLocation();
  const [menuAberto, setMenuAberto] = useState(false);

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
            aria-label={t("appLayout.abrirMenu")}
            className="p-2 -ml-2 rounded-xl text-on-surface hover:bg-veu/5 cursor-pointer"
          >
            <Icone name="menu" />
          </button>
          <span className="text-sm font-bold text-on-surface truncate">
            {tituloDaRota(pathname, t)}
          </span>
        </div>

        <Outlet />
      </main>
    </div>
  );
}

/** Nome curto da seção, para a barra do celular não ficar sem referência. */
function tituloDaRota(pathname, t) {
  const mapa = {
    "/inicio": "inicio",
    "/adm/painel": "painel",
    "/adm/geral": "visaoGeral",
    "/adm/condominios": "clientes",
    "/adm/planos": "planos",
    "/adm/usuarios": "usuarios",
    "/adm/estruturas": "estruturas",
    "/adm/perfis": "perfis",
    "/adm/financeiro": "financeiro",
    "/adm/reunioes": "reunioes",
    "/adm/reclamacoes": "reclamacoes",
    "/adm/ordens-servico": "ordensServico",
    "/adm/comunicados": "comunicados",
    "/adm/conhecimento": "conhecimento",
    "/adm/meu-plano": "meuPlano",
    // Fora de /adm, mas quem usa a barra lateral também abre estas.
    "/portaria/entregas": "entregas",
    "/conversas": "conversas",
    "/avisos": "avisos",
    "/entradas-e-saidas": "entradasSaidas",
    "/chaves": "chaves",
    "/usuarios": "usuarios",
  };
  const chave = Object.keys(mapa).find((k) => pathname.startsWith(k));
  return chave ? t(`appLayout.titulos.${mapa[chave]}`) : "Mora";
}
