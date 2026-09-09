// src/pages/adm/MeuPlano.jsx
import { useState, useEffect } from "react";
import { Icone } from "../../components/icones/Icone";
import { useAuth } from "../../contexts/AuthContext";
import { planApi } from "../../services/planApi";

/* Mapeamento slug → label + ícone + descrição do que o módulo habilita */
const MODULOS = {
  portaria:      { label: "Portaria",              icone: "door_front",      desc: "Controle de acesso, visitantes e registros de entrada e saída" },
  reunioes:      { label: "Reuniões",              icone: "groups",          desc: "Assembleias, pautas, votações e atas digitais" },
  vagas:         { label: "Vagas de Garagem",      icone: "local_parking",   desc: "Gestão de vagas, reservas e transferências" },
  entregas:      { label: "Entregas",              icone: "inventory_2",     desc: "Rastreamento de encomendas e notificação de retirada" },
  areas_comuns:  { label: "Áreas Comuns",          icone: "event_available", desc: "Reserva de salão, churrasqueira, academia e outros espaços" },
  reclamacoes:   { label: "Ocorrências",           icone: "report",          desc: "Registro e acompanhamento de reclamações e ocorrências" },
  conhecimento:  { label: "Base de Conhecimento",  icone: "library_books",   desc: "FAQ, documentos e regulamentos acessíveis aos moradores" },
  votacoes:      { label: "Votações",              icone: "how_to_vote",     desc: "Enquetes e votações online para decisões do condomínio" },
  veiculos:      { label: "Veículos",              icone: "directions_car",  desc: "Cadastro e controle de veículos dos moradores" },
  chaves:        { label: "Chaves",                icone: "key",             desc: "Empréstimo e devolução de chaves com registro de responsável" },
};

const TODOS_MODULOS = Object.keys(MODULOS);

function formatarBRL(valor) {
  if (valor == null) return "—";
  return Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatarData(iso) {
  if (!iso) return "—";
  const [ano, mes, dia] = String(iso).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function MeuPlano() {
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
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">Síndico</p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Meu{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">Plano</span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-2">
            Recursos disponíveis para o seu condomínio no aplicativo Mora.
          </p>
        </header>

        {carregando ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-on-surface-variant">
            <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
            <span className="text-sm">Carregando plano...</span>
          </div>
        ) : erro || !assinatura ? (
          <div className="glass-panel rounded-3xl py-16 flex flex-col items-center gap-4 text-center px-6">
            <div className="w-14 h-14 rounded-2xl bg-error/10 flex items-center justify-center">
              <Icone name="workspace_premium" className="text-error text-2xl" />
            </div>
            <p className="font-semibold text-on-surface">Nenhum plano ativo</p>
            <p className="text-xs text-on-surface-variant max-w-xs">
              Seu condomínio não possui uma assinatura ativa. Entre em contato com o suporte Mora.
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
                    {assinatura.vigente ? "Ativo" : "Inativo"}
                  </span>
                </div>
                <p className="text-on-surface-variant text-sm">
                  Vigência: {formatarData(assinatura.vigenciaInicio)} → {assinatura.vigenciaFim ? formatarData(assinatura.vigenciaFim) : "indeterminado"}
                </p>
              </div>

              <div className="shrink-0 text-right sm:text-right">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Mensalidade</p>
                <p className="text-3xl font-bold text-primary">{formatarBRL(assinatura.mensalidade)}</p>
                <p className="text-xs text-on-surface-variant">/mês</p>
              </div>
            </div>

            {/* Módulos incluídos */}
            {modulosAtivos.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-xs text-on-surface-variant uppercase tracking-widest font-semibold px-1">
                  Incluído no seu plano — {modulosAtivos.length} {modulosAtivos.length === 1 ? "módulo" : "módulos"}
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
                            <p className="font-semibold text-on-surface text-sm">{m.label}</p>
                            <Icone name="check_circle" className="text-green-400 text-base shrink-0" />
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">{m.desc}</p>
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
                  Não incluso no plano atual
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {modulosInativos.map(slug => {
                    const m = MODULOS[slug] ?? { label: slug, icone: "extension", desc: "" };
                    return (
                      <div key={slug} className="rounded-2xl p-4 flex items-start gap-4 border border-white/5 opacity-50">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                          <Icone name={m.icone} className="text-on-surface-variant text-lg" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-semibold text-on-surface-variant text-sm">{m.label}</p>
                            <Icone name="lock" className="text-on-surface-variant text-sm shrink-0" />
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">{m.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            <p className="text-center text-xs text-on-surface-variant pb-2">
              Para alterar seu plano, entre em contato com o suporte Mora.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
