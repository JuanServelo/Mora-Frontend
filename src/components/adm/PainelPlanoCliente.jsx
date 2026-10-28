import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { planApi } from "../../services/planApi";
import { Icone } from "../icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { formatarData } from "../../utils/datas";
import { formatarReais } from "../../utils/dinheiro";

const STATUS_STYLE = {
  ATIVA: "bg-primary/10 text-primary",
  CANCELADA: "bg-error/10 text-error",
  SUSPENSA: "bg-tertiary/10 text-tertiary",
};

const hoje = () => new Date().toISOString().slice(0, 10);

const formatarPreco = formatarReais;

/**
 * Plano contratado por um cliente.
 *
 * Até aqui não havia lugar nenhum na interface para associar um plano a um
 * condomínio — o backend aceitava desde sempre, e ninguém chamava. Por isso os
 * clientes nasciam sem assinatura e o indicador "sem plano" não tinha saída.
 */
export function PainelPlanoCliente({ condominioId, aoMudar, qtdUsuarios = 0 }) {
  const { t } = useTranslation("planos");
  const toast = useToast();
  const confirmar = useConfirm();

  const [planos, setPlanos] = useState([]);
  const [assinatura, setAssinatura] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [escolhido, setEscolhido] = useState("");
  const [salvando, setSalvando] = useState(false);
  // Vigência é do contrato, não do sistema: uma assinatura pode começar no
  // primeiro dia do mês que vem, ou ter fim combinado. Sem estes campos o
  // backend assumia "hoje" e "indeterminado", sem ninguém poder dizer outra coisa.
  const [vigencia, setVigencia] = useState({ inicio: hoje(), fim: "", observacao: "" });

  async function carregar() {
    setCarregando(true);
    try {
      const [listaPlanos, vigente, hist] = await Promise.all([
        planApi.listar(),
        // 404 é a resposta certa para "ainda não contratou": não é falha.
        planApi.assinaturaVigente(condominioId).catch(() => ({ data: null })),
        planApi.historicoAssinaturas(condominioId).catch(() => ({ data: [] })),
      ]);
      setPlanos(listaPlanos.data ?? []);
      setAssinatura(vigente.data ?? null);
      setHistorico(hist.data ?? []);
      setEscolhido(String(vigente.data?.planId ?? ""));
      setVigencia({ inicio: hoje(), fim: "", observacao: "" });
    } catch {
      toast.error(t("cliente.toast.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [condominioId]);

  const plano = planos.find((p) => String(p.id) === escolhido);
  const trocando = Boolean(assinatura) && String(assinatura.planId) !== escolhido;

  async function contratar() {
    if (!escolhido) {
      toast.warning(t("cliente.toast.escolha"));
      return;
    }
    if (plano && qtdUsuarios > plano.maxUsersPerCondominium) {
      toast.warning(t("cliente.toast.limiteUsuarios", { max: plano.maxUsersPerCondominium, qtd: qtdUsuarios }));
      return;
    }
    if (!vigencia.inicio) {
      toast.warning(t("cliente.toast.informeInicio"));
      return;
    }
    if (vigencia.fim && vigencia.fim < vigencia.inicio) {
      toast.warning(t("cliente.toast.fimAntesInicio"));
      return;
    }

    if (trocando) {
      const ok = await confirmar({
        titulo: t("cliente.trocar.titulo"),
        // O serviço encerra a vigente e abre outra. Dizer isso evita a
        // impressão de que a assinatura antiga simplesmente some.
        mensagem: t("cliente.trocar.mensagem", { atual: assinatura.planNome, novo: plano?.name, data: formatarData(vigencia.inicio) }),
        confirmarTexto: t("cliente.trocar.confirmar"),
      });
      if (!ok) return;
    }

    setSalvando(true);
    try {
      await planApi.contratarPlano({
        condominioId,
        planId: Number(escolhido),
        vigenciaInicio: vigencia.inicio,
        // Vazio significa indeterminado — o backend aceita nulo.
        vigenciaFim: vigencia.fim || null,
        observacao: vigencia.observacao.trim() || null,
      });
      toast.success(trocando ? t("cliente.toast.trocado") : t("cliente.toast.contratado"));
      await carregar();
      aoMudar?.();
    } catch (e) {
      toast.error(e.response?.data?.message || t("cliente.toast.erroContratar"));
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar() {
    const ok = await confirmar({
      titulo: t("cliente.cancelar.titulo"),
      mensagem: t("cliente.cancelar.mensagem", { plano: assinatura.planNome }),
      confirmarTexto: t("cliente.cancelar.titulo"),
    });
    if (!ok) return;

    try {
      await planApi.alterarStatusAssinatura(assinatura.id, "CANCELADA");
      toast.success(t("cliente.toast.cancelada"));
      await carregar();
      aoMudar?.();
    } catch (e) {
      toast.error(e.response?.data?.message || t("cliente.toast.erroCancelar"));
    }
  }

  if (carregando) {
    return <p className="text-on-surface-variant text-sm">{t("cliente.carregando")}</p>;
  }

  return (
    <div className="space-y-6">
      {/* ── Situação atual ── */}
      {assinatura ? (
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Icone name="workspace_premium" className="text-2xl" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-headline text-2xl font-bold text-on-surface">
                  {assinatura.planNome}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[assinatura.status] ?? ""}`}>
                  {t(`status.${assinatura.status}`, { defaultValue: assinatura.status.toLowerCase() })}
                </span>
              </div>
              <p className="text-on-surface-variant text-sm mt-1">
                {formatarPreco(assinatura.mensalidade)}{t("geral.porMes")} ·{" "}
                {t("cliente.desde", { data: formatarData(assinatura.vigenciaInicio) })}
              </p>
            </div>
            {assinatura.status === "ATIVA" && (
              <button
                onClick={cancelar}
                className="px-4 py-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 text-sm font-semibold transition cursor-pointer"
              >
                {t("cliente.cancelar.titulo")}
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-veu/5">
            <Dado rotulo={t("cliente.dados.limiteUsuarios")} valor={assinatura.maxUsuariosPorCondominio ?? "—"} />
            <Dado rotulo={t("cliente.dados.modulosAtivos")} valor={assinatura.modulosAtivos?.length ?? 0} />
            <Dado
              rotulo={t("cliente.dados.vigencia")}
              valor={assinatura.vigenciaFim ? t("cliente.dados.ate", { data: formatarData(assinatura.vigenciaFim) }) : t("cliente.dados.indeterminada")}
            />
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-6 flex items-start gap-3">
          <Icone name="money_off" className="text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-on-surface font-semibold">{t("cliente.semPlano")}</p>
            <p className="text-on-surface-variant text-sm mt-0.5">
              {t("cliente.semPlanoAjuda")}
            </p>
          </div>
        </div>
      )}

      {/* ── Escolha ── */}
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          {assinatura ? t("cliente.trocar.titulo") : t("cliente.contratarUm")}
        </h3>

        <div className="grid sm:grid-cols-2 gap-3">
          {planos.map((p) => {
            const ativo = String(p.id) === escolhido;
            const atual = String(assinatura?.planId) === String(p.id);
            const excedeu = p.maxUsersPerCondominium != null && qtdUsuarios > p.maxUsersPerCondominium;
            return (
              <button
                key={p.id}
                disabled={excedeu}
                onClick={() => setEscolhido(String(p.id))}
                className={`text-left p-4 rounded-2xl border transition ${
                  excedeu
                    ? "opacity-50 cursor-not-allowed border-error/20 bg-surface-container-highest/10"
                    : ativo
                    ? "border-primary/60 bg-primary/10 cursor-pointer"
                    : "border-veu/10 hover:border-veu/25 bg-surface-container-highest/20 cursor-pointer"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-on-surface">{p.name}</span>
                  {atual && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                      {t("cliente.atual")}
                    </span>
                  )}
                  {ativo && <Icone name="check_circle" className="text-primary text-base ml-auto" />}
                </div>
                <p className="font-headline font-bold text-on-surface mt-1">
                  {formatarPreco(p.monthlyPrice)}
                  <span className="text-xs font-normal text-on-surface-variant">{t("geral.porMes")}</span>
                </p>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  {t("cliente.ateUsuarios", { max: p.maxUsersPerCondominium ?? "—" })} ·{" "}
                  {t("cliente.modulos", { count: p.activeModules?.length ?? 0 })}
                </p>
              </button>
            );
          })}
        </div>

        {planos.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            {t("cliente.nenhumPlano")}
          </p>
        )}

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-veu/5">
          <CampoVigencia
            id="vigencia-inicio"
            rotulo={t("cliente.vigencia.inicio")}
            ajuda={t("cliente.vigencia.inicioAjuda")}
            tipo="date"
            valor={vigencia.inicio}
            aoMudar={(v) => setVigencia((s) => ({ ...s, inicio: v }))}
          />
          <CampoVigencia
            id="vigencia-fim"
            rotulo={t("cliente.vigencia.fim")}
            ajuda={vigencia.fim ? t("cliente.vigencia.fimAjuda") : t("cliente.vigencia.fimVazio")}
            tipo="date"
            valor={vigencia.fim}
            min={vigencia.inicio}
            aoMudar={(v) => setVigencia((s) => ({ ...s, fim: v }))}
          />
          <CampoVigencia
            id="vigencia-obs"
            rotulo={t("cliente.vigencia.observacao")}
            ajuda={t("cliente.vigencia.observacaoAjuda")}
            valor={vigencia.observacao}
            placeholder={t("cliente.vigencia.observacaoPlaceholder")}
            aoMudar={(v) => setVigencia((s) => ({ ...s, observacao: v }))}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={contratar}
            disabled={salvando || !escolhido || (!trocando && Boolean(assinatura))}
            className="px-6 py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {salvando ? t("comum:acoes.salvando") : trocando ? t("cliente.trocar.confirmar") : t("cliente.contratar")}
          </button>
        </div>
      </div>

      {/* ── Histórico ── */}
      {historico.length > 1 && (
        <div className="glass-panel rounded-3xl p-6 space-y-3">
          <h3 className="font-headline text-lg font-bold text-on-surface">
            {t("cliente.historico")}
          </h3>
          <div className="space-y-2">
            {historico.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-sm py-2 border-t border-veu/5 first:border-0">
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${STATUS_STYLE[h.status] ?? ""}`}>
                  {t(`status.${h.status}`, { defaultValue: h.status.toLowerCase() })}
                </span>
                <span className="text-on-surface font-medium">{h.planNome}</span>
                {h.observacao && (
                  <span className="text-on-surface-variant text-xs truncate max-w-[200px]">
                    {h.observacao}
                  </span>
                )}
                <span className="text-on-surface-variant text-xs ml-auto whitespace-nowrap">
                  {formatarData(h.vigenciaInicio)}
                  {h.vigenciaFim ? ` → ${formatarData(h.vigenciaFim)}` : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CampoVigencia({ id, rotulo, ajuda, tipo = "text", valor, min, placeholder, aoMudar }) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1"
      >
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        min={min}
        placeholder={placeholder}
        onChange={(e) => aoMudar(e.target.value)}
        className="w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface placeholder:text-outline-variant focus:outline-none focus:ring-2 focus:ring-primary/50"
      />
      <p className="text-[11px] text-on-surface-variant ml-1">{ajuda}</p>
    </div>
  );
}

function Dado({ rotulo, valor }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
        {rotulo}
      </p>
      <p className="text-on-surface font-semibold mt-0.5">{valor}</p>
    </div>
  );
}
