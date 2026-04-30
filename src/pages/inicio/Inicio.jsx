// src/pages/inicio/Inicio.jsx
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { Icone } from "../../components/icones/Icone";

const ACESSO_RAPIDO = [
  {
    to: "/espacos",
    label: "Espaços",
    desc: "Reservar áreas comuns",
    icon: "event_available",
  },
  {
    to: "/reclamacoes",
    label: "Reclamações",
    desc: "Abrir ou acompanhar chamados",
    icon: "report",
  },
  {
    to: "/servicos",
    label: "Serviços",
    desc: "Portaria, manutenção e mais",
    icon: "room_service",
  },
  {
    to: "/comodidades",
    label: "Comodidades",
    desc: "Estrutura de lazer e bem-estar",
    icon: "pool",
  },
];

export function Inicio() {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(" ")[0] || "Morador";

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-10">
        <header className="text-center max-w-3xl mx-auto">
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-2">
            Condomínio
          </p>
          <h1 className="font-headline text-4xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
            Olá,{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {primeiroNome}
            </span>
          </h1>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Central do seu condomínio: reservas, comunicação e tudo o que você precisa em um só lugar.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: "calendar_month",
              titulo: "Reservas",
              texto: "Áreas comuns cadastradas pela administração aparecem em Espaços.",
            },
            {
              icon: "campaign",
              titulo: "Comunicação",
              texto: "Reclamações e chamados são registrados na área dedicada.",
            },
            {
              icon: "shield",
              titulo: "Acesso",
              texto: "Seu perfil e vínculo com a unidade seguem as regras definidas pela gestão.",
            },
          ].map((c) => (
            <div
              key={c.titulo}
              className="glass-panel rounded-3xl p-6 border border-white/5 hover:border-primary/20 transition-colors"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icone name={c.icon} className="text-primary text-xl" />
                </div>
                <span className="text-on-surface-variant text-xs font-semibold uppercase tracking-wider">
                  {c.titulo}
                </span>
              </div>
              <p className="text-on-surface-variant text-sm leading-relaxed">{c.texto}</p>
            </div>
          ))}
        </div>

        <section className="space-y-5">
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-headline text-2xl font-bold text-on-surface">Acesso rápido</h2>
              <p className="text-on-surface-variant text-sm mt-1">
                Atalhos para as áreas mais usadas do app
              </p>
            </div>
            <Link
              to="/perfil"
              className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              Meu perfil
              <Icone name="arrow_forward" className="text-base" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ACESSO_RAPIDO.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="group glass-panel rounded-3xl p-5 border border-outline-variant/15 hover:border-primary/35 hover:bg-white/[0.03] transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <Icone name={item.icon} className="text-primary text-2xl" />
                </div>
                <h3 className="font-headline font-bold text-on-surface text-lg mb-1">{item.label}</h3>
                <p className="text-on-surface-variant text-sm leading-snug">{item.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                  Abrir
                  <Icone name="chevron_right" className="text-lg" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="glass-panel rounded-[2rem] p-8 md:p-10 relative overflow-hidden border border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-tertiary/5 pointer-events-none" />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6 justify-between">
            <div className="flex gap-4">
              <div className="w-14 h-14 rounded-2xl bg-secondary/15 flex items-center justify-center shrink-0">
                <Icone name="apartment" className="text-secondary text-3xl" />
              </div>
              <div>
                <h3 className="font-headline text-xl font-bold text-on-surface mb-1">
                  Precisa de ajuda da administração?
                </h3>
                <p className="text-on-surface-variant text-sm max-w-xl">
                  Use reclamações para chamados ou consulte serviços do condomínio. Em breve, avisos oficiais aparecerão aqui também.
                </p>
              </div>
            </div>
            <Link
              to="/reclamacoes"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-opacity"
            >
              Ir para reclamações
              <Icone name="arrow_forward" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
