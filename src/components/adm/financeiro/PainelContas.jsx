// src/components/adm/financeiro/PainelContas.jsx
import { useState, useEffect, useCallback } from "react";
import { Icone } from "../../icones/Icone";
import { useToast } from "../../../contexts/ToastContext";
import { formatarData, paraCampoData } from "../../../utils/datas";
import { useConfirm } from "../../../contexts/ConfirmContext";
import { useAuth } from "../../../contexts/AuthContext";
import { financeiroApi } from "../../../services/financeiroApi";
import { planApi } from "../../../services/planApi";
import { formatarBRL, centavosParaCampo } from "../../../utils/dinheiro";

const TIPOS = [
  { value: "AGUA", label: "Água", icone: "water_drop" },
  { value: "LUZ", label: "Luz/Energia", icone: "bolt" },
  { value: "GAS", label: "Gás", icone: "local_fire_department" },
  { value: "INTERNET", label: "Internet", icone: "wifi" },
  { value: "OUTRO", label: "Outro", icone: "receipt" },
];

const MODOS = [
  { value: "FRACAO_IDEAL", label: "Fração Ideal (proporcional à unidade)" },
  { value: "FIXO_POR_UNIDADE", label: "Fixo por Unidade (igual para todas)" },
];

const STATUS_BADGE = {
  PENDENTE: "bg-warning/15 text-warning",
  RATEADA: "bg-green-500/15 text-green-400",
  CANCELADA: "bg-error/10 text-error",
};

const mesAtual = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const VAZIO = {
  tipo: "AGUA",
  descricao: "",
  competencia: mesAtual(),
  valor: "",
  modoRateio: "FRACAO_IDEAL",
  vencimento: "",
};

export function PainelContas() {
  const toast = useToast();
  const confirm = useConfirm();
  const { usuario } = useAuth();

  const [competencia, setCompetencia] = useState(mesAtual());
  const [contas, setContas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [fechando, setFechando] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [assinatura, setAssinatura] = useState(null);

  useEffect(() => {
    if (!usuario?.condominioId) return;
    planApi.assinaturaVigente(usuario.condominioId)
      .then(({ data }) => setAssinatura(data))
      .catch(() => {});
  }, [usuario?.condominioId]);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const { data } = await financeiroApi.listarContasConsumo(competencia);
      setContas(data.itens ?? []);
    } catch {
      toast.error("Não foi possível carregar as contas.");
    } finally {
      setCarregando(false);
    }
  }, [competencia]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    if (!competencia) return;
    financeiroApi.previewCompetencia(competencia)
      .then(({ data }) => setPreviewData(data))
      .catch(() => setPreviewData(null));
  }, [competencia, contas]);

  function abrirNova() {
    setEditando(null);
    setForm({ ...VAZIO, competencia });
    setModalAberto(true);
  }

  function abrirEdicao(conta) {
    setEditando(conta.id);
    setForm({
      tipo: conta.tipo,
      descricao: conta.descricao ?? "",
      competencia: String(conta.competencia).slice(0, 7),
      valor: centavosParaCampo(conta.valorTotalCentavos),
      modoRateio: conta.modoRateio,
      // <input type="date"> so aceita YYYY-MM-DD; o ISO completo deixa
      // o campo vazio sem avisar.
      vencimento: paraCampoData(conta.vencimento),
    });
    setModalAberto(true);
  }

  async function salvar() {
    if (!form.valor || !form.vencimento) {
      toast.warning("Preencha valor e vencimento.");
      return;
    }
    setSalvando(true);
    try {
      const payload = {
        tipo: form.tipo,
        descricao: form.descricao || null,
        competencia: form.competencia,
        valor: form.valor,
        modoRateio: form.modoRateio,
        vencimento: form.vencimento,
      };
      if (editando) {
        await financeiroApi.atualizarContaConsumo(editando, payload);
        toast.success("Conta atualizada.");
      } else {
        await financeiroApi.criarContaConsumo(payload);
        toast.success("Conta criada.");
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao salvar conta.");
    } finally {
      setSalvando(false);
    }
  }

  async function cancelarConta(id) {
    const ok = await confirm({
      titulo: "Cancelar conta",
      mensagem: "A conta será marcada como cancelada. Esta ação não pode ser desfeita.",
      confirmarTexto: "Cancelar conta",
      variante: "danger",
    });
    if (!ok) return;
    try {
      await financeiroApi.cancelarContaConsumo(id);
      toast.success("Conta cancelada.");
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao cancelar.");
    }
  }

  async function ratear(id) {
    const ok = await confirm({
      titulo: "Ratear conta",
      mensagem: "O valor será distribuído entre as unidades com fração ideal cadastrada. Continuar?",
      confirmarTexto: "Ratear",
    });
    if (!ok) return;
    try {
      const { data } = await financeiroApi.ratearContaConsumo(id);
      toast.success(`Conta rateada em ${data.unidadesRateadas} unidades.`);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao ratear.");
    }
  }

  async function fecharCompetencia() {
    const ok = await confirm({
      titulo: "Fechar competência",
      mensagem: `Serão geradas faturas para todas as unidades da competência ${competencia}. Unidades que já têm fatura não serão duplicadas. Continuar?`,
      confirmarTexto: "Fechar competência",
    });
    if (!ok) return;
    setFechando(true);
    try {
      const { data } = await financeiroApi.fecharCompetencia(competencia);
      toast.success(`Fechamento concluído. ${data.faturasCriadas} fatura(s) criada(s).`);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao fechar competência.");
    } finally {
      setFechando(false);
    }
  }

  const tipoInfo = (tipo) => TIPOS.find((t) => t.value === tipo) ?? TIPOS[4];

  return (
    <div className="space-y-6">
      {/* Header de filtro + botão */}
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
            Competência
          </label>
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            className="bg-veu/5 border border-veu/10 rounded-xl px-3 py-1.5 text-sm text-on-surface focus:outline-none focus:border-primary/50"
          />
        </div>
        <button
          onClick={abrirNova}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/15 text-primary font-semibold text-sm hover:bg-primary/25 transition cursor-pointer"
        >
          <Icone name="add" className="text-lg" />
          Nova Conta
        </button>
      </div>

      {/* Preview do fechamento */}
      {previewData?.ok && (
        <div className="glass-panel rounded-2xl p-4 flex flex-wrap gap-6 text-sm">
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Unidades</p>
            <p className="font-bold text-on-surface text-lg">{previewData.unidades}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Faturas novas</p>
            <p className="font-bold text-primary text-lg">{previewData.faturasNovas}</p>
          </div>
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider mb-1">Contas pendentes</p>
            <p className="font-bold text-on-surface text-lg">{previewData.contasDeConsumo}</p>
          </div>
          <div className="ml-auto flex items-center">
            <button
              onClick={fecharCompetencia}
              disabled={fechando}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-tertiary text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
            >
              <Icone name={fechando ? "sync" : "play_arrow"} className={`text-lg ${fechando ? "animate-spin" : ""}`} />
              {fechando ? "Fechando..." : "Fechar Competência"}
            </button>
          </div>
        </div>
      )}

      {/* Mensalidade do plano — automática */}
      {assinatura?.vigente && (
        <div className="rounded-2xl p-4 flex flex-wrap gap-4 items-center border border-yellow-500/25 bg-yellow-500/5">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="p-2 rounded-xl bg-yellow-500/15 text-yellow-400">
              <Icone name="workspace_premium" className="text-xl" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-yellow-300">
                Plataforma Mora — {assinatura.planNome}
              </p>
              <p className="text-xs text-yellow-500/70">
                Mensalidade do plano • gerada automaticamente
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">
              {Number(assinatura.mensalidade).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-yellow-500/60">/mês</p>
          </div>
        </div>
      )}

      {/* Lista de contas */}
      {carregando ? (
        <div className="flex items-center justify-center py-12 text-on-surface-variant">
          <Icone name="sync" className="text-3xl animate-spin mr-3" />
          <span>Carregando contas...</span>
        </div>
      ) : contas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 gap-3 text-on-surface-variant text-sm">
          <Icone name="receipt_long" className="text-4xl opacity-30" />
          <p>Nenhuma conta cadastrada para {competencia}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contas.map((conta) => {
            const info = tipoInfo(conta.tipo);
            return (
              <div key={conta.id} className="glass-panel rounded-2xl p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Icone name={info.icone} className="text-xl" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface text-sm truncate">
                      {info.label}{conta.descricao ? `: ${conta.descricao}` : ""}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {conta.modoRateio === "FRACAO_IDEAL" ? "Fração ideal" : "Fixo por unidade"} • Venc. {formatarData(conta.vencimento)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-bold text-on-surface">{formatarBRL(conta.valorTotalCentavos)}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[conta.status]}`}>
                    {conta.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {conta.status === "PENDENTE" && (
                    <>
                      <button
                        onClick={() => ratear(conta.id)}
                        title="Ratear entre unidades"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition cursor-pointer"
                      >
                        <Icone name="splitscreen" className="text-lg" />
                      </button>
                      <button
                        onClick={() => abrirEdicao(conta)}
                        title="Editar"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition cursor-pointer"
                      >
                        <Icone name="edit" className="text-lg" />
                      </button>
                      <button
                        onClick={() => cancelarConta(conta.id)}
                        title="Cancelar"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-error hover:bg-error/10 transition cursor-pointer"
                      >
                        <Icone name="delete" className="text-lg" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Nova / Editar conta */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl p-6 space-y-5" style={{ background: "rgba(18,18,28,0.98)", backdropFilter: "blur(32px)", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 24px 64px rgba(0,0,0,0.7)" }}>
            <h3 className="font-headline text-xl font-bold text-on-surface">
              {editando ? "Editar Conta" : "Nova Conta de Consumo"}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {TIPOS.map((t) => (
                <button
                  key={t.value}
                  onClick={() => setForm((f) => ({ ...f, tipo: t.value }))}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition cursor-pointer text-sm font-medium ${
                    form.tipo === t.value
                      ? "border-primary/60 bg-primary/20 text-primary"
                      : "border-veu/15 text-on-surface-variant hover:bg-veu/8 hover:border-veu/25"
                  }`}
                >
                  <Icone name={t.icone} className="text-lg" />
                  {t.label}
                </button>
              ))}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Descrição (opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Conta de novembro"
                value={form.descricao}
                onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                className="w-full bg-veu/8 border border-veu/15 rounded-xl px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Competência
                </label>
                <input
                  type="month"
                  value={form.competencia}
                  onChange={(e) => setForm((f) => ({ ...f, competencia: e.target.value }))}
                  className="w-full bg-veu/5 border border-veu/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                  Vencimento
                </label>
                <input
                  type="date"
                  value={form.vencimento}
                  onChange={(e) => setForm((f) => ({ ...f, vencimento: e.target.value }))}
                  className="w-full bg-veu/5 border border-veu/10 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Valor Total (R$)
              </label>
              <input
                type="text"
                placeholder="0,00"
                value={form.valor}
                onChange={(e) => setForm((f) => ({ ...f, valor: e.target.value }))}
                className="w-full bg-veu/8 border border-veu/15 rounded-xl px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
                Modo de Rateio
              </label>
              <select
                value={form.modoRateio}
                onChange={(e) => setForm((f) => ({ ...f, modoRateio: e.target.value }))}
                className="w-full bg-veu/8 border border-veu/15 rounded-xl px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60"
              >
                {MODOS.map((m) => (
                  <option key={m.value} value={m.value} className="bg-[#1a1825]">{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setModalAberto(false)}
                className="flex-1 py-2.5 rounded-xl border border-veu/10 text-on-surface-variant text-sm font-semibold hover:bg-veu/5 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-tertiary text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition cursor-pointer"
              >
                {salvando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
