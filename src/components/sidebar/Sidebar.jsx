// src/components/sidebar/Sidebar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icone } from "../icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS } from "../../utils/perfis";
import { linksDoPerfil } from "../../utils/menuAdmin";
import moraLogo3 from "../../assets/Mora3.png";


// Telas do porteiro (mesmo layout de Sidebar dos admins).
const PORTEIRO_LINKS = [
  { to: "/inicio", label: "Início", icon: "home" },
  { to: "/entradas-e-saidas", label: "Entradas e Saídas", icon: "swap_horiz" },
  { to: "/entregas", label: "Entregas", icon: "inventory_2" },
  { to: "/chaves", label: "Chaves", icon: "vpn_key" },
  { to: "/usuarios", label: "Usuários do Condomínio", icon: "groups" },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  const perfil = usuario?.perfil;
  const isDoorman = perfil === PERFIS.PORTEIRO;

  // Porteiro tem o conjunto dele; os admins veem o que o próprio perfil permite.
  const links = isDoorman ? PORTEIRO_LINKS : linksDoPerfil(perfil);

  const subtitulo = isDoorman
    ? "Portaria"
    : perfil === PERFIS.ADMIN_GERAL
      ? "Plataforma"
      : "Administrativo";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-64 flex flex-col z-50"
      style={{ background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(32px)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-white/5">
        <img src={moraLogo3} alt="Mora" className="h-7 w-auto" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">Painel</p>
          <p className="text-sm font-bold text-on-surface leading-tight">{subtitulo}</p>
        </div>
      </div>

      {/* Links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const active = pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group
                ${active
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-white/5 hover:text-on-surface"
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all
                ${active ? "bg-primary/15" : "bg-surface-container-highest/50 group-hover:bg-primary/10"}`}>
                <Icone name={link.icon} className={`text-base ${active ? "text-primary" : "group-hover:text-primary"}`} />
              </div>
              <span className="text-sm font-semibold leading-tight">{link.label}</span>
              {active && <Icone name="arrow_forward_ios" className="text-xs text-primary ml-auto shrink-0" />}
            </Link>
          );
        })}
      </nav>

      {/* Usuário (link p/ perfil) + Logout */}
      <div className="px-2 py-3 border-t border-white/5 space-y-0.5">
        <Link
          to="/perfil"
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20 hover:bg-white/5 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <Icone name={isDoorman ? "badge" : "admin_panel_settings"} className="text-base text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate leading-tight">{usuario?.nome || "Admin"}</p>
            <p className="text-xs text-on-surface-variant truncate leading-tight">{usuario?.email}</p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-on-surface-variant hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest/50 group-hover:bg-red-500/10 flex items-center justify-center shrink-0 transition-all">
            <Icone name="logout" className="text-base" />
          </div>
          <span className="text-sm font-semibold">Sair</span>
        </button>
      </div>
    </aside>
  );
}
