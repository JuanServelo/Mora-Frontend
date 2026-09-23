import { useEffect, useState } from "react";
import { planApi } from "../../services/planApi";
import { Icone } from "../icones/Icone";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { formatarData } from "../../utils/datas";

const STATUS_STYLE = {
  ATIVA: "bg-primary/10 text-primary",
  CANCELADA: "bg-error/10 text-error",
  SUSPENSA: "bg-tertiary/10 text-tertiary",
};

const hoje = () => new Date().toISOString().slice(0, 10);

const formatarPreco = (valor) =>
  valor == null
    ? "—"
    : Number(valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Plano contratado por um cliente.
 *
 * Até aqui não havia lugar nenhum na interface para associar um plano a um
 * condomínio — o backend aceitava desde sempre, e ninguém chamava. Por isso os
 * clientes nasciam sem assinatura e o indicador "sem plano" não tinha saída.
 */
export function PainelPlanoCliente({ condominioId, aoMudar }) {
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
      toast.error("Não foi possível carregar os planos.");
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
      toast.warning("Escolha um plano.");
      return;
    }
    if (!vigencia.inicio) {
      toast.warning("Informe a data de início da vigência.");
      return;
    }
    if (vigencia.fim && vigencia.fim < vigencia.inicio) {
      toast.warning("O fim da vigência não pode ser anterior ao início.");
      return;
    }

    if (trocando) {
      const ok = await confirmar({
        titulo: "Trocar de plano",
        // O serviço encerra a vigente e abre outra. Dizer isso evita a
        // impressão de que a assinatura antiga simplesmente some.
        mensagem: `A assinatura atual (${assinatura.planNome}) será encerrada e "${plano?.name}" passa a valer a partir de ${formatarData(vigencia.inicio)}. O histórico fica registrado.`,
        confirmarTexto: "Trocar plano",
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
      toast.success(trocando ? "Plano trocado." : "Plano contratado.");
      await carregar();
      aoMudar?.();
    } catch (e) {
      toast.error(e.response?.data?.message || "Não foi possível contratar o plano.");
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar() {
    const ok = await confirmar({
      titulo: "Cancelar assinatura",
      mensagem: `O cliente fica sem plano e deixa de ser cobrado. Os limites de "${assinatura.planNome}" param de valer.`,
      confirmarTexto: "Cancelar assinatura",
    });
    if (!ok) return;

    try {
      await planApi.alterarStatusAssinatura(assinatura.id, "CANCELADA");
      toast.success("Assinatura cancelada.");
      await carregar();
      aoMudar?.();
    } catch (e) {
      toast.error(e.response?.data?.message || "Não foi possível cancelar.");
    }
  }

  if (carregando) {
    return <p className="text-on-surface-variant text-sm">Carregando plano…</p>;
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
                  {assinatura.status.toLowerCase()}
                </span>
              </div>
              <p className="text-on-surface-variant text-sm mt-1">
                {formatarPreco(assinatura.mensalidade)}/mês · desde{" "}
                {formatarData(assinatura.vigenciaInicio)}
              </p>
            </div>
            {assinatura.status === "ATIVA" && (
              <button
                onClick={cancelar}
                className="px-4 py-2 rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 text-sm font-semibold transition cursor-pointer"
              >
                Cancelar assinatura
              </button>
            )}
          </div>

          <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-veu/5">
            <Dado rotulo="Limite de usuários" valor={assinatura.maxUsuariosPorCondominio ?? "—"} />
            <Dado rotulo="Módulos ativos" valor={assinatura.modulosAtivos?.length ?? 0} />
            <Dado
              rotulo="Vigência"
              valor={assinatura.vigenciaFim ? `até ${formatarData(assinatura.vigenciaFim)}` : "indeterminada"}
            />
          </div>
        </div>
      ) : (
        <div className="glass-panel rounded-3xl p-6 flex items-start gap-3">
          <Icone name="money_off" className="text-error shrink-0 mt-0.5" />
          <div>
            <p className="text-on-surface font-semibold">Este cliente não tem plano contratado</p>
            <p className="text-on-surface-variant text-sm mt-0.5">
              Ele usa a plataforma sem ser cobrado, e sem limites de plano aplicados.
            </p>
          </div>
        </div>
      )}

      {/* ── Escolha ── */}
      <div className="glass-panel rounded-3xl p-6 space-y-4">
        <h3 className="font-headline text-lg font-bold text-on-surface">
          {assinatura ? "Trocar de plano" : "Contratar um plano"}
        </h3>

        <div className="grid sm:grid-cols-2 gap-3">
          {planos.map((p) => {
            const ativo = String(p.id) === escolhido;
            const atual = String(assinatura?.planId) === String(p.id);
            return (
              <button
                key={p.id}
                onClick={() => setEscolhido(String(p.id))}
                className={`text-left p-4 rounded-2xl border transition cursor-pointer ${
                  ativo
                    ? "border-primary/60 bg-primary/10"
                    : "border-veu/10 hover:border-veu/25 bg-surface-container-highest/20"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-on-surface">{p.name}</span>
                  {atual && (
                    <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface-variant">
                      atual
                    </span>
                  )}
                  {ativo && <Icone name="check_circle" className="text-primary text-base ml-auto" />}
                </div>
                <p className="font-headline font-bold text-on-surface mt-1">
                  {formatarPreco(p.monthlyPrice)}
                  <span className="text-xs font-normal text-on-surface-variant">/mês</span>
                </p>
                <p className="text-[11px] text-on-surface-variant mt-1">
                  até {p.maxUsersPerCondominium ?? "—"} usuários ·{" "}
                  {p.activeModules?.length ?? 0} módulos
                </p>
              </button>
            );
          })}
        </div>

        {planos.length === 0 && (
          <p className="text-sm text-on-surface-variant">
            Nenhum plano cadastrado. Crie um em Planos antes de contratar.
          </p>
        )}

        <div className="grid sm:grid-cols-3 gap-4 pt-2 border-t border-veu/5">
          <CampoVigencia
            id="vigencia-inicio"
            rotulo="Início da vigência"
            ajuda="Quando o plano passa a valer"
            tipo="date"
            valor={vigencia.inicio}
            aoMudar={(v) => setVigencia((s) => ({ ...s, inicio: v }))}
          />
          <CampoVigencia
            id="vigencia-fim"
            rotulo="Fim da vigência"
            ajuda={vigencia.fim ? "Encerra nesta data" : "Em branco: indeterminado"}
            tipo="date"
            valor={vigencia.fim}
            min={vigencia.inicio}
            aoMudar={(v) => setVigencia((s) => ({ ...s, fim: v }))}
          />
          <CampoVigencia
            id="vigencia-obs"
            rotulo="Observação"
            ajuda="Opcional — nº do contrato, condições"
            valor={vigencia.observacao}
            placeholder="Contrato 2026/014"
            aoMudar={(v) => setVigencia((s) => ({ ...s, observacao: v }))}
          />
        </div>

        <div className="flex justify-end">
          <button
            onClick={contratar}
            disabled={salvando || !escolhido || (!trocando && Boolean(assinatura))}
            className="px-6 py-3 rounded-full bg-gradient-to-br from-primary to-primary-container text-on-primary-container font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {salvando ? "Salvando…" : trocando ? "Trocar plano" : "Contratar plano"}
          </button>
        </div>
      </div>

      {/* ── Histórico ── */}
      {historico.length > 1 && (
        <div className="glass-panel rounded-3xl p-6 space-y-3">
          <h3 className="font-headline text-lg font-bold text-on-surface">
            Histórico de assinaturas
          </h3>
          <div className="space-y-2">
            {historico.map((h) => (
              <div key={h.id} className="flex items-center gap-3 text-sm py-2 border-t border-veu/5 first:border-0">
                <span className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold ${STATUS_STYLE[h.status] ?? ""}`}>
                  {h.status.toLowerCase()}
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
