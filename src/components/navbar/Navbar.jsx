// src/components/navbar/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icone } from "../icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
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

const NAV_LINKS_RIGHT = [
  { label: "Perfil", to: "/perfil" },
];

const ADM_LINKS = [
  { label: "Usuários", to: "/adm/usuarios", icon: "manage_accounts", description: "Gerenciar moradores" },
  { label: "Estruturas", to: "/adm/estruturas", icon: "apartment", description: "Blocos e apartamentos" },
  { label: "Reuniões", to: "/adm/reunioes", icon: "groups", description: "Reuniões e votações" },
  { label: "Espaços", to: "/adm/espacos", icon: "deck", description: "Gerenciar áreas comuns" },
  { label: "Reclamações", to: "/adm/reclamacoes", icon: "report", description: "Gestão de reclamações" },
  { label: "Entregas", to: "/adm/entregas", icon: "inventory_2", description: "Gestão de entregas" },
  { label: "Vagas", to: "/adm/vagas", icon: "local_parking", description: "Vagas de garagem" },
  { label: "Conhecimento", to: "/adm/conhecimento", icon: "library_books", description: "Base de conhecimento e FAQ" },
];

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

function AdminMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();
  const admActive = ADM_LINKS.some((l) => pathname === l.to);

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
        <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-72 rounded-2xl overflow-hidden z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]" style={{ background: "rgba(18,18,24,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Header do painel */}
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Painel Administrativo
            </p>
          </div>

          {/* Links */}
          <div className="p-2 space-y-0.5">
            {ADM_LINKS.map((link) => {
              const active = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                    ${active
                      ? "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                    }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all
                    ${active ? "bg-primary/15" : "bg-surface-container-highest/50 group-hover:bg-primary/10"}`}>
                    <Icone name={link.icon} className={`text-lg ${active ? "text-primary" : "group-hover:text-primary"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold leading-tight">{link.label}</p>
                    <p className="text-xs opacity-60 leading-tight">{link.description}</p>
                  </div>
                  {active && (
                    <Icone name="arrow_forward_ios" className="text-xs text-primary ml-auto" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [darkMode, setDarkMode] = useState(true);
  const { usuario } = useAuth();
  const role = String(usuario?.role || "").toLowerCase();
  const isAdmin = role === "admin";
  const hasUnitAssociation = Boolean(usuario?.bloco) && Boolean(usuario?.apartamento);
  const isRestrictedUser = Boolean(usuario) && !isAdmin && !hasUnitAssociation;
  const visibleLeftLinks = isRestrictedUser
    ? []
    : NAV_LINKS_LEFT;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl px-1">
      <nav className="glass-panel rounded-full px-4 py-2.5 flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Esquerda */}
        <div className="flex-1 flex items-center gap-0.5">
          {visibleLeftLinks.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
          {isAdmin && <AdminMenu />}
        </div>

        {/* Centro — Logo */}
        <Link
          to={isRestrictedUser ? "/perfil" : "/inicio"}
          className="shrink-0 mx-4 hover:opacity-80 transition-opacity"
        >
          <img src={moraLogo3} alt="Mora" className="h-8 w-auto" />
        </Link>

        {/* Direita */}
        <div className="flex-1 flex items-center gap-0.5 justify-end">
          {NAV_LINKS_RIGHT.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}

          {/* Toggle Dark/Light */}
          <button
            onClick={() => setDarkMode((d) => !d)}
            className="ml-1 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
            title={darkMode ? "Modo Claro" : "Modo Escuro"}
          >
            <Icone
              name={darkMode ? "dark_mode" : "light_mode"}
              className="text-xl"
            />
          </button>
        </div>
      </nav>
    </div>
  );
}
