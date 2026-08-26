// src/components/navbar/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icone } from "../icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS, isUsuarioRestrito, podeAcessarAdmin } from "../../utils/perfis";
// import moraLogo from "../../assets/Mora.png";
// import moraLogo2 from "../../assets/Mora2.png";
import moraLogo3 from "../../assets/Mora3.png";

const NAV_LINKS_LEFT = [
  { label: "Início", to: "/inicio" },
  { label: "Serviços", to: "/servicos" },
  { label: "Comodidades", to: "/comodidades" },
  { label: "Espaços", to: "/espacos" },
  { label: "Reclamações", to: "/reclamacoes" },
];

const NAV_LINKS_DOORMAN = [
  { label: "Início", to: "/inicio" },
  { label: "Entradas e Saídas", to: "/entradas-e-saidas" },
  { label: "Entregas", to: "/entregas" },
  { label: "Chaves", to: "/chaves" },
];

const NAV_LINKS_RIGHT = [
  { label: "Perfil", to: "/perfil" },
];

const ADM_LINKS = [
  { label: "Usuários", to: "/adm/usuarios", icon: "manage_accounts", description: "Gerenciar moradores" },
  { label: "Estruturas", to: "/adm/estruturas", icon: "apartment", description: "Blocos e apartamentos" },
  { label: "Reuniões", to: "/adm/reunioes", icon: "groups", description: "Reuniões e votações" },
  { label: "Reclamações", to: "/adm/reclamacoes", icon: "report", description: "Gestão de reclamações" },
  { label: "Entregas", to: "/adm/entregas", icon: "inventory_2", description: "Gestão de entregas" },
  { label: "Vagas", to: "/adm/vagas", icon: "local_parking", description: "Vagas de garagem" },
  { label: "Conhecimento", to: "/adm/conhecimento", icon: "library_books", description: "Base de conhecimento e FAQ" },
  { label: "Perfis", to: "/adm/perfis", icon: "verified_user", description: "Permissões por perfil" },
  { label: "Clientes", to: "/adm/condominios", icon: "domain", description: "Gestão de clientes" },
];

const PANEL_STYLE = {
  background: "rgba(18,18,24,0.97)",
  backdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.08)",
};

/** Links administrativos visiveis para o usuario (Super Admin ganha Planos no topo). */
function getAdmLinks(usuario) {
  const isSuperAdmin = usuario?.role === "admin";
  return isSuperAdmin
    ? [
        { label: "Planos", to: "/adm/planos", icon: "workspace_premium", description: "Gerenciar planos SaaS" },
        ...ADM_LINKS,
      ]
    : ADM_LINKS;
}

/** Item do painel administrativo — reutilizado no dropdown desktop e no menu mobile. */
function AdminLink({ link, onNavigate }) {
  const { pathname } = useLocation();
  const active = pathname === link.to;

  return (
    <Link
      to={link.to}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
        ${active
          ? "bg-primary/10 text-primary"
          : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
        }`}
    >
      <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-all
        ${active ? "bg-primary/15" : "bg-surface-container-highest/50 group-hover:bg-primary/10"}`}>
        <Icone name={link.icon} className={`text-lg ${active ? "text-primary" : "group-hover:text-primary"}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{link.label}</p>
        <p className="text-xs opacity-60 leading-tight">{link.description}</p>
      </div>
      {active && (
        <Icone name="arrow_forward_ios" className="text-xs text-primary ml-auto shrink-0" />
      )}
    </Link>
  );
}

function NavLink({ to, children }) {
  const { pathname } = useLocation();
  const active = pathname === to;

  return (
    <Link
      to={to}
      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
        ${
          active
            ? "text-primary bg-primary/10"
            : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
        }`}
    >
      {children}
    </Link>
  );
}

function AdminMenu({ usuario }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  const admLinks = getAdmLinks(usuario);
  const admActive = admLinks.some((l) => pathname === l.to);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer
          ${admActive || open
            ? "text-primary bg-primary/10"
            : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
          }`}
      >
        <Icone name="admin_panel_settings" className="text-base" />
        <span>Admin</span>
        <Icone
          name="expand_more"
          className={`text-base transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-72 rounded-2xl overflow-hidden z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]" style={PANEL_STYLE}>
          {/* Header do painel */}
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Painel Administrativo
            </p>
          </div>

          {/* Links */}
          <div className="p-2 space-y-0.5">
            {admLinks.map((link) => (
              <AdminLink key={link.to} link={link} onNavigate={() => setOpen(false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Painel deslizante do mobile — abre abaixo da pilula da navbar. */
function MobileMenu({ open, onClose, links, admLinks }) {
  const { pathname } = useLocation();

  // Trava o scroll do body enquanto o menu esta aberto
  useEffect(() => {
    if (!open) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [open]);

  // Fecha com Esc
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const todosLinks = [...links, ...NAV_LINKS_RIGHT];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="absolute top-[calc(100%+10px)] left-0 right-0 z-50 rounded-3xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.6)] max-h-[calc(100vh-8rem)] overflow-y-auto lg:hidden"
        style={PANEL_STYLE}
      >
        {todosLinks.length > 0 && (
          <div className="p-2 space-y-0.5">
            {todosLinks.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={onClose}
                  className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200
                    ${active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                    }`}
                >
                  {l.label}
                </Link>
              );
            })}
          </div>
        )}

        {admLinks && admLinks.length > 0 && (
          <>
            <div className="px-4 py-3 border-y border-white/5">
              <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
                Painel Administrativo
              </p>
            </div>
            <div className="p-2 space-y-0.5">
              {admLinks.map((link) => (
                <AdminLink key={link.to} link={link} onNavigate={onClose} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function Navbar() {
  const [darkMode, setDarkMode] = useState(true);
  const [menuAberto, setMenuAberto] = useState(false);
  const { pathname } = useLocation();
  const [rotaAnterior, setRotaAnterior] = useState(pathname);
  const { usuario } = useAuth();
  const isRestrictedUser = isUsuarioRestrito(usuario);
  const showAdminMenu = podeAcessarAdmin(usuario?.perfil);
  const isDoorman = usuario?.perfil === PERFIS.DOORMAN;

  let visibleLeftLinks;
  if (isRestrictedUser) {
    visibleLeftLinks = [];
  } else if (isDoorman) {
    visibleLeftLinks = NAV_LINKS_DOORMAN;
  } else {
    visibleLeftLinks = NAV_LINKS_LEFT;
  }

  const showAdmin = !isRestrictedUser && !isDoorman && showAdminMenu;
  const admLinksMobile = showAdmin ? getAdmLinks(usuario) : [];

  // Fecha o menu ao trocar de rota (inclusive via voltar/avancar do navegador)
  if (rotaAnterior !== pathname) {
    setRotaAnterior(pathname);
    setMenuAberto(false);
  }

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl px-1">
      <nav className="relative z-50 glass-panel rounded-full px-3 sm:px-4 py-2.5 flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Esquerda — links no desktop, hamburguer no mobile */}
        <div className="flex-1 flex items-center gap-0.5 min-w-0">
          <button
            onClick={() => setMenuAberto((o) => !o)}
            aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
            aria-expanded={menuAberto}
            className={`lg:hidden w-9 h-9 shrink-0 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer
              ${menuAberto
                ? "text-primary bg-primary/10"
                : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
          >
            <Icone name={menuAberto ? "close" : "menu"} className="text-xl" />
          </button>

          <div className="hidden lg:flex items-center gap-0.5">
            {visibleLeftLinks.map((l) => (
              <NavLink key={l.to} to={l.to}>
                {l.label}
              </NavLink>
            ))}
            {showAdmin && <AdminMenu usuario={usuario} />}
          </div>
        </div>

        {/* Centro — Logo */}
        <Link
          to={isRestrictedUser ? "/perfil" : "/inicio"}
          className="shrink-0 mx-2 sm:mx-4 hover:opacity-80 transition-opacity"
        >
          <img src={moraLogo3} alt="Mora" className="h-7 sm:h-8 w-auto" />
        </Link>

        {/* Direita */}
        <div className="flex-1 flex items-center gap-0.5 justify-end min-w-0">
          <div className="hidden lg:flex items-center gap-0.5">
            {NAV_LINKS_RIGHT.map((l) => (
              <NavLink key={l.to} to={l.to}>
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Toggle Dark/Light */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="ml-1 w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
            title={darkMode ? "Modo Claro" : "Modo Escuro"}
          >
            <Icone
              name={darkMode ? "dark_mode" : "light_mode"}
              className="text-xl"
            />
          </button>
        </div>
      </nav>

      <MobileMenu
        open={menuAberto}
        onClose={() => setMenuAberto(false)}
        links={visibleLeftLinks}
        admLinks={admLinksMobile}
      />
    </div>
  );
}
