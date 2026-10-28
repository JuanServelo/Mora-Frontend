// src/components/sidebar/Sidebar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Icone } from "../icones/Icone";
import { FotoUsuario } from "../avatar/FotoUsuario";
import { useAuth } from "../../contexts/AuthContext";
import { usePlano } from "../../contexts/PlanoContext";
import { useNotificacoes } from "../../contexts/NotificacoesContext";
import { PERFIS, isUsuarioRestrito, podeAcessarAdmin } from "../../utils/perfis";
import { linksDoPerfil } from "../../utils/menuAdmin";
import moraLogo3 from "../../assets/Mora3.png";

const MORADOR_LINKS = [
  { to: "/inicio", rotuloKey: "sidebar.links.inicio", icon: "home" },
  { to: "/conversas", rotuloKey: "sidebar.links.conversas", icon: "forum" },
  { rotuloKey: "sidebar.links.cobrancas", to: "/financeiro", icon: "payments" },
  { rotuloKey: "sidebar.links.espacos", to: "/espacos", icon: "apartment", modulo: "areas_comuns" },
  { rotuloKey: "sidebar.links.entregas", to: "/entregas", icon: "inventory_2", modulo: "entregas" },
  { rotuloKey: "sidebar.links.reunioes", to: "/reunioes", icon: "groups", modulo: "reunioes" },
  { rotuloKey: "sidebar.links.reclamacoes", to: "/reclamacoes", icon: "report", modulo: "reclamacoes" },
  { rotuloKey: "sidebar.links.comunicados", to: "/avisos", icon: "campaign", modulo: "comunicacao" },
  { rotuloKey: "sidebar.links.conhecimento", to: "/faq", icon: "library_books", modulo: "conhecimento" },
  { rotuloKey: "sidebar.links.votacoes", to: "/votacoes", icon: "how_to_vote", modulo: "votacoes" },
  { rotuloKey: "sidebar.links.veiculos", to: "/meus-veiculos", icon: "directions_car", modulo: "veiculos" },
];

// Telas do porteiro (mesmo layout de Sidebar dos admins).
const PORTEIRO_LINKS = [
  { to: "/inicio", rotuloKey: "sidebar.links.inicio", icon: "home" },
  // Cadastro de visitante na chegada é tela de portaria, como Entradas e
  // Saídas: sem o módulo, as duas somem juntas.
  { to: "/atendimento", rotuloKey: "sidebar.links.cadastros", icon: "waving_hand", modulo: "portaria" },
  { to: "/entradas-e-saidas", rotuloKey: "sidebar.links.entradasSaidas", icon: "swap_horiz", modulo: "portaria" },
  { to: "/portaria/entregas", rotuloKey: "sidebar.links.entregas", icon: "inventory_2", modulo: "entregas" },
  { to: "/chaves", rotuloKey: "sidebar.links.chaves", icon: "vpn_key", modulo: "chaves" },
  // O porteiro consulta a agenda e registra reserva no balcão; a tela já traz
  // as abas de operação para o perfil dele.
  { to: "/espacos", rotuloKey: "sidebar.links.espacos", icon: "deck", modulo: "areas_comuns" },
  { to: "/usuarios", rotuloKey: "sidebar.links.usuariosCondominio", icon: "groups" },
  { to: "/conversas", rotuloKey: "sidebar.links.conversas", icon: "forum" },
  // O porteiro é destinatário dos avisos de público FUNCIONARIOS. Sem esta
  // entrada ele recebia comunicado que não tinha como abrir — a rota existe,
  // mas só a navbar dos moradores levava até ela.
  { to: "/avisos", rotuloKey: "sidebar.links.avisos", icon: "campaign", modulo: "comunicacao" },
];

export function Sidebar({ aberta = false, aoFechar }) {
  const { t } = useTranslation("layout");
  const { pathname } = useLocation();
  const { usuario, logout } = useAuth();
  const { modulosAtivos, hasModulo } = usePlano();
  const navigate = useNavigate();
  const { naoLidas, conversasNaoLidas } = useNotificacoes();

  const perfil = usuario?.perfil;
  const isDoorman = perfil === PERFIS.PORTEIRO;
  const isGeral = perfil === PERFIS.ADMIN_GERAL;
  const isAdmin = podeAcessarAdmin(perfil);
  const isRestrito = isUsuarioRestrito(usuario);

  let links = [];
  if (isDoorman) {
    links = PORTEIRO_LINKS.filter((l) => !l.modulo || hasModulo(l.modulo));
  } else if (isAdmin) {
    links = [
      ...(isGeral ? [] : [{ to: "/inicio", rotuloKey: "sidebar.links.inicio", icon: "home" }]),
      ...linksDoPerfil(perfil, modulosAtivos),
    ];
  } else {
    if (isRestrito) {
      links = [{ to: "/inicio", rotuloKey: "sidebar.links.inicio", icon: "home" }];
    } else {
      links = MORADOR_LINKS.filter((l) => !l.modulo || hasModulo(l.modulo));
    }
  }

  // O logo leva à tela inicial, como na navbar dos moradores.
  const telaInicial = isGeral ? "/adm/geral" : "/inicio";

  const subtitulo = isDoorman
    ? t("sidebar.subtitulo.portaria")
    : isGeral
      ? t("sidebar.subtitulo.plataforma")
      : isAdmin
        ? t("sidebar.subtitulo.administrativo")
        : t("sidebar.subtitulo.condominio");

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <aside
      /* No desktop fica sempre visível; no celular desliza de fora da tela,
         porque 256px fixos sobre um viewport de 375px cobriam o conteúdo. */
      /* Alterna exibição em vez de deslocar.
         Com `translate`, o valor ficava preso em -100% depois que a classe saía:
         a transição não tem para onde interpolar quando a propriedade é
         removida, e a gaveta nunca aparecia. `hidden`/`flex` não interpola nada
         e o resultado é determinístico. */
      className={`fixed top-0 left-0 h-screen w-64 flex-col z-50 lg:flex ${
        aberta ? "flex" : "hidden"
      }`}
      style={{ background: "rgba(255,255,255,0.04)", borderRight: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(32px)" }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-veu/5">
        <button
          onClick={aoFechar}
          aria-label={t("sidebar.fecharMenu")}
          className="lg:hidden p-1 -ml-1 rounded-lg text-on-surface-variant hover:bg-veu/5 cursor-pointer"
        >
          <Icone name="close" />
        </button>
        <Link
          to={telaInicial}
          onClick={aoFechar}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <img src={moraLogo3} alt="Mora" className="h-7 w-auto" />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-on-surface-variant">{t("sidebar.painel")}</p>
            <p className="text-sm font-bold text-on-surface leading-tight">{subtitulo}</p>
          </div>
        </Link>
      </div>

      {/* Links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {links.map((link) => {
          const active = pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              onClick={aoFechar}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200 group
                ${active
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-veu/5 hover:text-on-surface"
                }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all
                ${active ? "bg-primary/15" : "bg-surface-container-highest/50 group-hover:bg-primary/10"}`}>
                <Icone name={link.icon} className={`text-base ${active ? "text-primary" : "group-hover:text-primary"}`} />
              </div>
              <span className="text-sm font-semibold leading-tight">{link.rotuloKey ? t(link.rotuloKey) : link.label}</span>

              {/* O chamado que um morador abre com a administracao nao gera
                  notificacao — nao ha participante da gestao a quem endereca-la.
                  Sem este contador, o sindico so descobriria abrindo a tela. */}
              {link.to === "/conversas" && conversasNaoLidas > 0 && (
                <span className="ml-auto shrink-0 min-w-5 h-5 px-1.5 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
                  {conversasNaoLidas > 9 ? "9+" : conversasNaoLidas}
                </span>
              )}

              {active && link.to !== "/conversas" && (
                <Icone name="arrow_forward_ios" className="text-xs text-primary ml-auto shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Usuário (link p/ perfil) + Logout */}
      <div className="px-2 py-3 border-t border-veu/5 space-y-0.5">
        {/*
          Precisa ser link, e não apenas um aviso: quem usa a barra lateral não
          tem Navbar, logo não tem o sino nem o "ver todas". Como uma `div`, o
          contador ficava eterno — sem caminho para a tela que marca como lido.

          Conta só notificação. Conversa não lida já tem selo próprio no item
          "Conversas" do menu, e somar as duas aqui recriaria o mesmo problema:
          um número que não zera ao abrir o destino.
        */}
        {naoLidas > 0 && (
          <Link
            to="/notificacoes"
            onClick={aoFechar}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/10 mb-1 hover:bg-primary/10 transition-all cursor-pointer"
          >
            <Icone name="notifications_active" className="text-primary text-base" />
            <span className="text-xs text-primary font-semibold flex-1">
              {t("sidebar.notificacoes", { count: naoLidas })}
            </span>
            <span className="w-5 h-5 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">
              {naoLidas > 9 ? "9+" : naoLidas}
            </span>
          </Link>
        )}
        <Link
          to="/perfil"
          onClick={aoFechar}
          className="flex items-center gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20 hover:bg-veu/5 transition-all"
        >
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
            <FotoUsuario
              usuario={usuario}
              iconeVazio={isDoorman ? "badge" : "admin_panel_settings"}
              classeIcone="text-base text-primary"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-on-surface truncate leading-tight">{usuario?.nome || t("sidebar.usuarioPadrao")}</p>
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
          <span className="text-sm font-semibold">{t("comum:acoes.sair")}</span>
        </button>
      </div>
    </aside>
  );
}
