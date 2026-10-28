// src/pages/adm/MeuPlano.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Icone } from "../../components/icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { planApi } from "../../services/planApi";
import { formatarData } from "../../utils/datas";
import { formatarReais } from "../../utils/dinheiro";

/* Mapeamento slug → label + ícone + descrição do que o módulo habilita */
const MODULOS = {
  portaria:      { label: "modulos.portaria.rotulo", icone: "door_front", desc: "modulos.portaria.descricao" },
  reunioes:      { label: "modulos.reunioes.rotulo", icone: "groups", desc: "modulos.reunioes.descricao" },
  vagas:         { label: "modulos.vagas.rotulo", icone: "local_parking", desc: "modulos.vagas.descricao" },
  entregas:      { label: "modulos.entregas.rotulo", icone: "inventory_2", desc: "modulos.entregas.descricao" },
  areas_comuns:  { label: "modulos.areas_comuns.rotulo", icone: "event_available", desc: "modulos.areas_comuns.descricao" },
  reclamacoes:   { label: "modulos.reclamacoes.rotulo", icone: "report", desc: "modulos.reclamacoes.descricao" },
  conhecimento:  { label: "modulos.conhecimento.rotulo", icone: "library_books", desc: "modulos.conhecimento.descricao" },
  votacoes:      { label: "modulos.votacoes.rotulo", icone: "how_to_vote", desc: "modulos.votacoes.descricao" },
  veiculos:      { label: "modulos.veiculos.rotulo", icone: "directions_car", desc: "modulos.veiculos.descricao" },
  chaves:        { label: "modulos.chaves.rotulo", icone: "key", desc: "modulos.chaves.descricao" },
};

const TODOS_MODULOS = Object.keys(MODULOS);

const formatarBRL = formatarReais;

export function MeuPlano() {
  const { t } = useTranslation("planos");
  const { usuario } = useAuth();
  const [assinatura, setAssinatura] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!usuario?.condominioId) return;
    planApi.assinaturaVigente(usuario.condominioId)
      .then(({ data }) => setAssinatura(data))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [usuario?.condominioId]);

  const ativos = new Set(assinatura?.modulosAtivos ?? []);
  const modulosAtivos   = TODOS_MODULOS.filter(s => ativos.has(s));
  const modulosInativos = TODOS_MODULOS.filter(s => !ativos.has(s));

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">{t("meuPlano.sobretitulo")}</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            {t("meuPlano.titulo")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">{t("meuPlano.tituloDestaque")}</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            {t("meuPlano.descricao")}
          </p>
        </header>

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-on-surface-variant">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="text-sm">{t("meuPlano.carregando")}</span>
          </div>
        ) : erro || !assinatura ? (
          <div className="glass-panel rounded-3xl py-16 flex flex-col items-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center">
              <Icone name="workspace_premium" className="text-error text-2xl" />
            </div>
            <p className="font-semibold text-on-surface">{t("meuPlano.semPlano")}</p>
            <p className="text-xs text-on-surface-variant max-w-xs">
              {t("meuPlano.semPlanoAjuda")}
            </p>
          </div>
        ) : (
          <>
            {/* Card do plano */}
            <div className="glass-panel rounded-3xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icone name="workspace_premium" className="text-primary text-3xl" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-1">
                  <h2 className="font-headline text-2xl font-bold text-on-surface">{assinatura.planNome}</h2>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    assinatura.vigente
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-error/10 text-error border-error/20"
                  }`}>
                    {assinatura.vigente ? t("comum:estado.ativo") : t("comum:estado.inativo")}
                  </span>
                </div>
                <p className="text-on-surface-variant text-sm">
                  {t("meuPlano.vigencia", { inicio: formatarData(assinatura.vigenciaInicio), fim: assinatura.vigenciaFim ? formatarData(assinatura.vigenciaFim) : t("meuPlano.indeterminado") })}
                </p>
              </div>

              <div className="shrink-0 text-right sm:text-right">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">{t("meuPlano.mensalidade")}</p>
                <p className="text-3xl font-bold text-primary">{formatarBRL(assinatura.mensalidade)}</p>
                <p className="text-xs text-on-surface-variant">{t("geral.porMes")}</p>
              </div>
            </div>

            {/* Módulos incluídos */}
            {modulosAtivos.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold px-1">
                  {t("meuPlano.incluidos", { count: modulosAtivos.length })}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modulosAtivos.map(slug => {
                    const m = MODULOS[slug] ?? { label: slug, icone: "extension", desc: "" };
                    return (
                      <div key={slug} className="glass-panel rounded-2xl p-4 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Icone name={m.icone} className="text-primary text-lg" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-on-surface text-sm">{t(m.label)}</p>
                            <Icone name="check_circle" className="text-green-400 text-base shrink-0" />
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">{m.desc && t(m.desc)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Módulos não incluídos */}
            {modulosInativos.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold px-1">
                  {t("meuPlano.naoIncluidos")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modulosInativos.map(slug => {
                    const m = MODULOS[slug] ?? { label: slug, icone: "extension", desc: "" };
                    return (
                      <div key={slug} className="rounded-2xl p-4 flex items-start gap-4 border border-veu/5 opacity-50">
                        <div className="w-10 h-10 rounded-xl bg-veu/5 flex items-center justify-center shrink-0 mt-0.5">
                          <Icone name={m.icone} className="text-on-surface-variant text-lg" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-on-surface-variant text-sm">{t(m.label)}</p>
                            <Icone name="lock" className="text-on-surface-variant text-sm shrink-0" />
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">{m.desc && t(m.desc)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <p className="text-center text-xs text-on-surface-variant pb-2">
              {t("meuPlano.alterar")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
