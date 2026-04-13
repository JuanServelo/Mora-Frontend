// src/components/navbar/Navbar.jsx
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Icone } from "../icones/Icone";

const NAV_LINKS_LEFT = [
  { label: "Início", to: "/inicio" },
  { label: "Serviços", to: "/servicos" },
  { label: "Contatos", to: "/contatos" },
];

const NAV_LINKS_RIGHT = [
  { label: "Comodidades", to: "/comodidades" },
  { label: "Perfil", to: "/perfil" },
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

export function Navbar() {
  const [darkMode, setDarkMode] = useState(true);

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[94%] max-w-4xl px-1">
      <nav className="glass-panel rounded-full px-4 py-2.5 flex items-center shadow-[0_8px_32px_rgba(0,0,0,0.3)]">
        {/* Esquerda */}
        <div className="flex-1 flex items-center gap-0.5">
          {NAV_LINKS_LEFT.map((l) => (
            <NavLink key={l.to} to={l.to}>
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Centro — Logo */}
        <Link
          to="/perfil"
          className="shrink-0 mx-4 font-headline text-xl font-extrabold tracking-tighter bg-gradient-to-br from-primary to-primary-container bg-clip-text text-transparent hover:opacity-80 transition-opacity"
        >
          Mora
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
