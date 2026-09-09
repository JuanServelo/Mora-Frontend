// src/components/navbar/Navbar.jsx
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Icone } from "../icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { PERFIS, isUsuarioRestrito, podeAcessarAdmin } from "../../utils/perfis";
import { linksDoPerfil } from "../../utils/menuAdmin";
// import moraLogo from "../../assets/Mora.png";
// import moraLogo2 from "../../assets/Mora2.png";
import moraLogo3 from "../../assets/Mora3.png";

const NAV_LINKS_LEFT = [
  { label: "Início", to: "/inicio" },
  { label: "Serviços", to: "/servicos" },
  { label: "Espaços", to: "/espacos" },
  { label: "Reclamações", to: "/reclamacoes" },
  { label: "Cobranças", to: "/financeiro" },
];

const NAV_LINKS_PORTEIRO = [
  { label: "Início", to: "/inicio" },
  { label: "Entradas e Saídas", to: "/entradas-e-saidas" },
  { label: "Entregas", to: "/entregas" },
  { label: "Chaves", to: "/chaves" },
];

const NAV_LINKS_RIGHT = [
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

function AdminMenu({ usuario }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { pathname } = useLocation();

  const admLinks = linksDoPerfil(usuario?.perfil);

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
        <div className="absolute top-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-72 rounded-2xl overflow-hidden z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]" style={{ background: "rgba(18,18,24,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Header do painel */}
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Painel Administrativo
            </p>
          </div>

          {/* Links */}
          <div className="p-2 space-y-0.5">
            {admLinks.map((link) => {
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

function SinoNotificacoes() {
  const { notificacoes, naoLidas, marcarLida, marcarTodasLidas } = useNotificacoes();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function aoClicar(n) {
    marcarLida(n.id);
    setAberto(false);
    if (["NOVA_FATURA", "PAGAMENTO_CONFIRMADO", "FATURA_VENCIDA"].includes(n.tipo)) {
      navigate("/financeiro");
    }
  }

  const recentes = notificacoes.slice(0, 8);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto((o) => !o)}
        className="relative ml-1 w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all duration-200 cursor-pointer"
        title="Notificações"
      >
        <Icone name="notifications" className="text-xl" />
        {naoLidas > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute top-[calc(100%+10px)] right-0 w-80 rounded-2xl overflow-hidden z-50 shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
          style={{ background: "rgba(18,18,24,0.97)", backdropFilter: "blur(24px)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              Notificações
            </p>
            {naoLidas > 0 && (
              <button
                onClick={marcarTodasLidas}
                className="text-xs text-primary hover:underline cursor-pointer"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {recentes.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant text-sm">
              <Icone name="notifications_none" className="text-3xl opacity-30 block mb-2 mx-auto" />
              Sem notificações
            </div>
          ) : (
            <div className="max-h-72 overflow-y-auto divide-y divide-white/5">
              {recentes.map((n) => (
                <button
                  key={n.id}
                  onClick={() => aoClicar(n)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-white/5 transition cursor-pointer ${!n.lida ? "bg-primary/5" : ""}`}
                >
                  <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                    n.tipo === "PAGAMENTO_CONFIRMADO" ? "bg-green-500/15 text-green-400" :
                    n.tipo === "FATURA_VENCIDA" ? "bg-error/15 text-error" :
                    "bg-primary/15 text-primary"
                  }`}>
                    <Icone name={
                      n.tipo === "PAGAMENTO_CONFIRMADO" ? "check_circle" :
                      n.tipo === "FATURA_VENCIDA" ? "warning" : "receipt"
                    } className="text-sm" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm font-medium leading-snug ${n.lida ? "text-on-surface-variant" : "text-on-surface"}`}>
                      {n.titulo}
                    </p>
                    {n.mensagem && (
                      <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">{n.mensagem}</p>
                    )}
                    <p className="text-[10px] text-on-surface-variant/50 mt-1">
                      {new Date(n.criadoEm).toLocaleString("pt-BR")}
                    </p>
                  </div>
                  {!n.lida && <div className="mt-2 shrink-0 w-2 h-2 rounded-full bg-primary" />}
                </button>
              ))}
            </div>
          )}

          {/* Rodapé — Ver todas */}
          <div className="px-4 py-3 border-t border-white/5">
            <Link
              to="/notificacoes"
              onClick={() => setAberto(false)}
              className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-on-surface-variant hover:text-primary transition"
            >
              Ver todas as notificações
              <Icone name="arrow_forward" className="text-sm" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const [darkMode, setDarkMode] = useState(true);
  const { usuario } = useAuth();
  const isRestrictedUser = isUsuarioRestrito(usuario);
  const showAdminMenu = podeAcessarAdmin(usuario?.perfil);
  const isDoorman = usuario?.perfil === PERFIS.PORTEIRO;

  let visibleLeftLinks;
  if (isRestrictedUser) {
    visibleLeftLinks = [];
  } else if (isDoorman) {
    visibleLeftLinks = NAV_LINKS_PORTEIRO;
  } else {
    visibleLeftLinks = NAV_LINKS_LEFT;
  }

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
          {!isRestrictedUser && !isDoorman && showAdminMenu && <AdminMenu usuario={usuario} />}
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

          <SinoNotificacoes />

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
