// src/pages/perfil/Perfil.jsx
import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Icone } from "../../../components/icones/Icone";
import { DetalhesContaView } from "./DetalhesContaView";
import { PrivacidadeView } from "./PrivacidadeView";
import { FamiliaView } from "./FamiliaView";
import { CobrancaView } from "./CobrancaView";

const ITENS_CONTA = [
  {
    id: "detalhes",
    icon: "person",
    color: "text-primary",
    titleId: "perfil.conta.titulo",
    titleDefault: "Detalhes da Conta",
    descId: "perfil.conta.desc",
    descDefault: "Informações pessoais e de residência",
  },
  {
    id: "privacidade",
    icon: "shield",
    color: "text-primary",
    titleId: "perfil.privacidade.titulo",
    titleDefault: "Privacidade e Segurança",
    descId: "perfil.privacidade.desc",
    descDefault: "Senha, biometria e acessos",
  },
  {
    id: "familia",
    icon: "groups",
    color: "text-primary",
    titleId: "perfil.familia.titulo",
    titleDefault: "Família e Convidados",
    descId: "perfil.familia.desc",
    descDefault: "Gerencie quem pode acessar sua unidade",
  },
  {
    id: "cobranca",
    icon: "receipt_long",
    color: "text-secondary",
    titleId: "perfil.cobranca.titulo",
    titleDefault: "Histórico de Cobrança",
    descId: "perfil.cobranca.desc",
    descDefault: "Faturas anteriores e comprovantes",
  },
];

const TITULOS_VIEW = {
  detalhes: "Detalhes da Conta",
  privacidade: "Privacidade e Segurança",
  familia: "Família e Convidados",
  cobranca: "Histórico de Cobrança",
};

export function Perfil() {
  const { t } = useTranslation();
  const [activeView, setActiveView] = useState(null);
  const lastViewRef = useRef(null);
  if (activeView !== null) lastViewRef.current = activeView;

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-14">
          <h1 className="font-headline text-5xl font-extrabold tracking-tight mb-4 text-on-surface">
            {t("perfil.header.titulo")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("perfil.header.espaco")}
            </span>
            .
          </h1>
          <p className="text-on-surface-variant font-light text-lg">
            {t("perfil.header.subtitulo")}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Coluna esquerda — Perfil + Stats */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card de Perfil */}
            <div className="glass-panel rounded-[2rem] p-8 text-center flex flex-col items-center">
              {/* Avatar */}
              <div className="relative mb-6">
                <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-primary via-secondary to-tertiary">
                  <div className="w-full h-full rounded-full bg-surface-container-highest flex items-center justify-center overflow-hidden border-4 border-surface">
                    <Icone name="person" className="text-primary text-5xl" />
                  </div>
                </div>
              </div>

              <h2 className="font-headline text-2xl font-bold text-on-surface">
                {t("perfil.nome")}
              </h2>
              <p className="text-primary-container font-medium mb-4 text-sm">
                {t("perfil.unidade")}
              </p>

              <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/20">
                <Icone
                  name="verified"
                  className="text-primary text-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                />
                <span className="text-primary text-xs font-semibold tracking-wider uppercase">
                  {t("perfil.verificado")}
                </span>
              </div>
            </div>

            {/* Taxa de Condomínio */}
            <div className="glass-panel rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-primary/30 rounded-t-3xl" />
              <div className="flex justify-between items-start mb-2">
                <span className="text-on-surface-variant text-xs font-medium uppercase tracking-widest">
                  {t("perfil.taxa.label")}
                </span>
                <Icone
                  name="check_circle"
                  className="text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                />
              </div>
              <div className="text-2xl font-headline font-bold text-on-surface mb-1">
                R$ 1.240,00
              </div>
              <div className="text-xs text-primary font-medium">
                {t("perfil.taxa.status")}
              </div>
            </div>
          </div>

          {/* Coluna direita — Navegação com sliding panel */}
          <div className="lg:col-span-8">
            <div className="glass-panel rounded-[2.5rem] p-6 lg:p-10">
              {/* Card Header — muda entre lista e view ativa */}
              <div className="flex items-center gap-3 mb-8 px-4">
                {activeView && (
                  <button
                    onClick={() => setActiveView(null)}
                    className="w-9 h-9 rounded-xl bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-white/5 transition-all shrink-0 cursor-pointer"
                  >
                    <Icone name="arrow_back" className="text-xl" />
                  </button>
                )}
                <h3 className="font-headline text-xl font-semibold text-on-surface">
                  {activeView ? (
                    TITULOS_VIEW[activeView]
                  ) : (
                    t("perfil.config.titulo")
                  )}
                </h3>
              </div>

              {/* Sliding Panels */}
              <div className="overflow-hidden">
                <div
                  className="flex transition-transform duration-500 ease-in-out"
                  style={{
                    transform: activeView
                      ? "translateX(-100%)"
                      : "translateX(0)",
                  }}
                >
                  {/* Panel 1 — Lista de itens */}
                  <div className="w-full shrink-0 min-w-0">
                    <div className="space-y-2">
                      {ITENS_CONTA.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setActiveView(item.id)}
                          className="w-full group flex items-center justify-between p-5 rounded-2xl hover:bg-white/5 transition-all duration-300 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-5">
                            <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center group-hover:scale-110 transition-transform">
                              <Icone name={item.icon} className={item.color} />
                            </div>
                            <div>
                              <div className="text-on-surface font-semibold text-base lg:text-lg">
                                {t(item.titleId)}
                              </div>
                              <div className="text-on-surface-variant text-sm">
                                {t(item.descId)}
                              </div>
                            </div>
                          </div>
                          <Icone
                            name="chevron_right"
                            className="text-outline group-hover:text-primary transition-colors shrink-0"
                          />
                        </button>
                      ))}

                      {/* Logout */}
                      <div className="pt-8 mt-8 border-t border-outline-variant/15">
                        <button className="w-full flex items-center justify-center gap-3 p-5 rounded-full border border-error/20 text-error hover:bg-error/10 transition-all duration-300 font-bold tracking-wide cursor-pointer">
                          <Icone name="logout" />
                          {t("perfil.sair")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Panel 2 — View ativa (mantém o último renderizado durante animação de volta) */}
                  <div className="w-full shrink-0 min-w-0">
                    {lastViewRef.current === "detalhes" && (
                      <DetalhesContaView />
                    )}
                    {lastViewRef.current === "privacidade" && (
                      <PrivacidadeView />
                    )}
                    {lastViewRef.current === "familia" && <FamiliaView />}
                    {lastViewRef.current === "cobranca" && <CobrancaView />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-outline-variant/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-on-surface-variant/50 text-sm">
            {t("perfil.footer.copy")}
          </div>
          <div className="flex gap-6 text-xs font-semibold tracking-widest uppercase text-on-surface-variant/50">
            <a href="#" className="hover:text-primary transition-colors">
              {t("perfil.footer.privacidade")}
            </a>
            <a href="#" className="hover:text-primary transition-colors">
              {t("perfil.footer.termos")}
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
