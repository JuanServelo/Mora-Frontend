// src/pages/adm/GerenciarPlanos.jsx
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { planApi } from "../../services/planApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { idiomaAtual } from "../../i18n";
import { formatarReais } from "../../utils/dinheiro";

// ─── constantes ────────────────────────────────
const MODULES_DISPONIVEIS = [
  { slug: "portaria", label: "gerenciar.modulos.portaria", icon: "support_agent" },
  { slug: "reunioes", label: "gerenciar.modulos.reunioes", icon: "groups" },
  { slug: "vagas", label: "gerenciar.modulos.vagas", icon: "local_parking" },
  { slug: "entregas", label: "gerenciar.modulos.entregas", icon: "local_shipping" },
  { slug: "areas_comuns", label: "gerenciar.modulos.areas_comuns", icon: "deck" },
  { slug: "reclamacoes", label: "gerenciar.modulos.reclamacoes", icon: "report_problem" },
  { slug: "conhecimento", label: "gerenciar.modulos.conhecimento", icon: "menu_book" },
  { slug: "votacoes", label: "gerenciar.modulos.votacoes", icon: "how_to_vote" },
  { slug: "veiculos", label: "gerenciar.modulos.veiculos", icon: "directions_car" },
  { slug: "chaves", label: "gerenciar.modulos.chaves", icon: "vpn_key" },
];

const EMPTY_PLAN = {
  name: "",
  maxCondominiums: "",
  maxUsersPerCondominium: "",
  monthlyPrice: "",
  activeModules: [],
};

const fmtPreco = formatarReais;

function fmtData(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString(idiomaAtual(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ════════════════════════════════════════════
export function GerenciarPlanos() {
  const { t } = useTranslation("planos");
  const toast = useToast();
  const confirm = useConfirm();

  const [planos, setPlanos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // ─── carregar planos ─────────────────────
  const carregarPlanos = async () => {
    setCarregando(true);
    try {
      const res = await planApi.listar();
      setPlanos(res.data || []);
    } catch {
      toast.error(t("gerenciar.toast.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarPlanos();
  }, []);

  // ─── handlers ─────────────────────────────
  function handleForm(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    // Limpar erro do campo ao digitar
    if (fieldErrors[name]) {
      setFieldErrors((p) => ({ ...p, [name]: "" }));
    }
  }

  function toggleModule(slug) {
    setForm((p) => {
      const has = p.activeModules.includes(slug);
      return {
        ...p,
        activeModules: has
          ? p.activeModules.filter((m) => m !== slug)
          : [...p.activeModules, slug],
      };
    });
    if (fieldErrors.activeModules) {
      setFieldErrors((p) => ({ ...p, activeModules: "" }));
    }
  }

  function selectAllModules() {
    setForm((p) => ({
      ...p,
      activeModules: MODULES_DISPONIVEIS.map((m) => m.slug),
    }));
  }

  function deselectAllModules() {
    setForm((p) => ({ ...p, activeModules: [] }));
  }

  // ─── validação client-side ────────────────
  function validarForm() {
    const errors = {};
    if (!form.name.trim()) errors.name = t("gerenciar.validacao.obrigatorio");
    if (!form.maxCondominiums || Number(form.maxCondominiums) <= 0)
      errors.maxCondominiums = t("gerenciar.validacao.maiorQueZero");
    if (!form.maxUsersPerCondominium || Number(form.maxUsersPerCondominium) <= 0)
      errors.maxUsersPerCondominium = t("gerenciar.validacao.maiorQueZero");
    if (form.monthlyPrice === "" || form.monthlyPrice === null || form.monthlyPrice === undefined)
      errors.monthlyPrice = t("gerenciar.validacao.obrigatorio");
    else if (Number(form.monthlyPrice) < 0)
      errors.monthlyPrice = t("gerenciar.validacao.precoNegativo");
    if (!form.activeModules.length)
      errors.activeModules = t("gerenciar.validacao.selecioneModulo");
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── salvar (criar / editar) ──────────────
  async function salvarPlano(e) {
    e.preventDefault();
    if (!validarForm()) return;
    setSalvando(true);
    setErro("");
    try {
      const payload = {
        name: form.name.trim(),
        maxCondominiums: Number(form.maxCondominiums),
        maxUsersPerCondominium: Number(form.maxUsersPerCondominium),
        monthlyPrice: Number(form.monthlyPrice),
        activeModules: form.activeModules,
      };

      if (editandoId) {
        await planApi.atualizar(editandoId, payload);
        toast.success(t("gerenciar.toast.alteracaoSalva"));
      } else {
        await planApi.criar(payload);
        toast.success(t("gerenciar.toast.cadastrado"));
      }

      setForm(EMPTY_PLAN);
      setCriando(false);
      setEditandoId(null);
      setDetalhe(null);
      carregarPlanos();
    } catch (err) {
      const msg = err.response?.data?.message || t("gerenciar.toast.erroSalvar");
      setErro(msg);
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  // ─── editar ───────────────────────────────
  function iniciarEdicao(plano) {
    setEditandoId(plano.id);
    setForm({
      name: plano.name || "",
      maxCondominiums: String(plano.maxCondominiums || ""),
      maxUsersPerCondominium: String(plano.maxUsersPerCondominium || ""),
      monthlyPrice: String(plano.monthlyPrice || ""),
      activeModules: plano.activeModules || [],
    });
    setCriando(true);
    setErro("");
    setFieldErrors({});
    setTimeout(() => {
      const el = document.getElementById("form-plan-topo");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  // ─── toggle status ────────────────────────
  async function toggleStatus(plano) {
    const acao = plano.isActive ? "desativar" : "ativar";
    const ok = await confirm({
      titulo: t(`gerenciar.status.${acao}.titulo`),
      mensagem: t(`gerenciar.status.${acao}.mensagem`, { nome: plano.name }),
      confirmarTexto: t(`gerenciar.status.${acao}.botao`),
      variante: plano.isActive ? "danger" : "primary",
    });
    if (!ok) return;

    try {
      await planApi.toggleStatus(plano.id);
      toast.success(
        plano.isActive
          ? t("gerenciar.status.desativar.sucesso")
          : t("gerenciar.status.ativar.sucesso")
      );
      carregarPlanos();
      if (detalhe?.id === plano.id) {
        setDetalhe((p) => (p ? { ...p, isActive: !p.isActive } : p));
      }
    } catch {
      toast.error(t(`gerenciar.status.${acao}.erro`));
    }
  }

  // ─── render ───────────────────────────────
  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              {t("gerenciar.sobretitulo")}
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              {t("gerenciar.titulo")}{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                {t("gerenciar.tituloDestaque")}
              </span>
            </h1>
          </div>
        </header>

        {/* Toolbar */}
        <div className="glass-panel rounded-3xl p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-primary/10 text-primary">
                <Icone name="workspace_premium" className="text-xl" />
              </span>
              <div>
                <h2 className="font-headline text-xl font-bold text-on-surface">
                  {t("gerenciar.planos")}
                </h2>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  {t("gerenciar.contagem", { count: planos.length })}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={carregarPlanos}
                disabled={carregando}
                className="p-2.5 rounded-xl hover:bg-veu/5 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
                title={t("comum:acoes.atualizar")}
              >
                <Icone
                  name="refresh"
                  className={`text-lg ${carregando ? "animate-spin" : ""}`}
                />
              </button>
              <button
                onClick={() => {
                  if (criando) {
                    setForm(EMPTY_PLAN);
                    setEditandoId(null);
                    setFieldErrors({});
                  }
                  setCriando(!criando);
                  setErro("");
                }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition text-sm font-semibold cursor-pointer"
              >
                <Icone
                  name={criando ? "close" : "add"}
                  className="text-base"
                />
                {criando ? t("comum:acoes.cancelar") : t("gerenciar.novo")}
              </button>
            </div>
          </div>

          {/* ─── Formulário ─────────────────── */}
          {criando && (
            <form
              id="form-plan-topo"
              onSubmit={salvarPlano}
              className="bg-surface-container-highest/20 rounded-2xl p-5 space-y-5 border border-veu/10"
            >
              <div className="flex items-center justify-between border-b border-veu/5 pb-3">
                <h3 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <Icone
                    name={editandoId ? "edit" : "add_circle"}
                    className="text-primary"
                  />
                  {editandoId
                    ? t("gerenciar.form.editar", { id: editandoId })
                    : t("gerenciar.novo")}
                </h3>
                {editandoId && (
                  <button
                    type="button"
                    onClick={() => {
                      setForm(EMPTY_PLAN);
                      setEditandoId(null);
                      setCriando(false);
                      setFieldErrors({});
                    }}
                    className="text-primary hover:underline text-xs font-semibold cursor-pointer"
                  >
                    {t("gerenciar.form.descartar")}
                  </button>
                )}
              </div>

              {erro && (
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-error/10 border border-error/20 text-error text-xs font-semibold">
                  <Icone name="error_outline" className="text-sm shrink-0" />
                  {erro}
                </div>
              )}

              <Campo
                label={t("gerenciar.form.nome")}
                name="name"
                value={form.name}
                onChange={handleForm}
                placeholder={t("gerenciar.form.nomePlaceholder")}
                required
              />
              {fieldErrors.name && (
                <p className="text-error text-[11px] -mt-3 ml-1 font-medium">
                  {fieldErrors.name}
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Campo
                    label={t("gerenciar.form.maxCondominios")}
                    name="maxCondominiums"
                    type="number"
                    value={form.maxCondominiums}
                    onChange={handleForm}
                    placeholder={t("gerenciar.form.exemplo", { valor: "10" })}
                    min="1"
                    required
                  />
                  {fieldErrors.maxCondominiums && (
                    <p className="text-error text-[11px] mt-1 ml-1 font-medium">
                      {fieldErrors.maxCondominiums}
                    </p>
                  )}
                </div>
                <div>
                  <Campo
                    label={t("gerenciar.form.maxUsuarios")}
                    name="maxUsersPerCondominium"
                    type="number"
                    value={form.maxUsersPerCondominium}
                    onChange={handleForm}
                    placeholder={t("gerenciar.form.exemplo", { valor: "200" })}
                    min="1"
                    required
                  />
                  {fieldErrors.maxUsersPerCondominium && (
                    <p className="text-error text-[11px] mt-1 ml-1 font-medium">
                      {fieldErrors.maxUsersPerCondominium}
                    </p>
                  )}
                </div>
                <div>
                  <Campo
                    label={t("gerenciar.form.preco")}
                    name="monthlyPrice"
                    type="number"
                    step="0.01"
                    value={form.monthlyPrice}
                    onChange={handleForm}
                    placeholder={t("gerenciar.form.exemplo", { valor: "199.90" })}
                    min="0"
                    required
                  />
                  {fieldErrors.monthlyPrice && (
                    <p className="text-error text-[11px] mt-1 ml-1 font-medium">
                      {fieldErrors.monthlyPrice}
                    </p>
                  )}
                </div>
              </div>

              {/* Seleção de Módulos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                    {t("gerenciar.form.modulosAtivos")}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllModules}
                      className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      {t("gerenciar.form.selecionarTodos")}
                    </button>
                    <span className="text-on-surface-variant/30">|</span>
                    <button
                      type="button"
                      onClick={deselectAllModules}
                      className="text-[10px] text-on-surface-variant hover:text-error hover:underline font-semibold cursor-pointer"
                    >
                      {t("gerenciar.form.limpar")}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                  {MODULES_DISPONIVEIS.map((mod) => {
                    const selected = form.activeModules.includes(mod.slug);
                    return (
                      <button
                        key={mod.slug}
                        type="button"
                        onClick={() => toggleModule(mod.slug)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                          selected
                            ? "bg-primary/15 border-primary/30 text-primary shadow-sm shadow-primary/5"
                            : "bg-surface-container-highest/20 border-veu/5 text-on-surface-variant hover:border-primary/20 hover:text-on-surface"
                        }`}
                      >
                        <Icone
                          name={selected ? "check_circle" : mod.icon}
                          className={`text-base shrink-0 ${selected ? "text-primary" : ""}`}
                        />
                        <span className="truncate">{t(mod.label)}</span>
                      </button>
                    );
                  })}
                </div>
                {fieldErrors.activeModules && (
                  <p className="text-error text-[11px] ml-1 font-medium">
                    {fieldErrors.activeModules}
                  </p>
                )}
                <p className="text-[10px] text-on-surface-variant/60 ml-1">
                  {t("gerenciar.form.selecionados", { count: form.activeModules.length, total: MODULES_DISPONIVEIS.length })}
                </p>
              </div>

              {/* Botão Salvar */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-primary/20"
                >
                  <Icone
                    name={salvando ? "sync" : "save"}
                    className={`text-base ${salvando ? "animate-spin" : ""}`}
                  />
                  {salvando
                    ? t("geral.salvando")
                    : editandoId
                    ? t("gerenciar.form.salvarAlteracoes")
                    : t("gerenciar.form.cadastrar")}
                </button>
              </div>
            </form>
          )}

          {/* ─── Lista de Planos ────────────── */}
          {carregando ? (
            <div className="text-center py-12 text-on-surface-variant text-xs flex flex-col items-center justify-center gap-2">
              <Icone name="sync" className="text-2xl animate-spin text-primary" />
              {t("gerenciar.carregando")}
            </div>
          ) : planos.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant flex flex-col items-center justify-center gap-3 bg-veu/2 rounded-2xl border border-veu/5">
              <Icone
                name="inventory_2"
                className="text-4xl text-primary/30"
              />
              <p className="font-medium text-sm">
                {t("gerenciar.vazio")}
              </p>
              <p className="text-xs text-on-surface-variant/60">
                {t("gerenciar.vazioAjuda")}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className={`relative bg-surface-container-highest/20 hover:bg-surface-container-highest/30 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg overflow-hidden ${
                    plano.isActive
                      ? "border-veu/5"
                      : "border-error/15 opacity-75"
                  }`}
                >
                  {/* Header do card */}
                  <div className="p-4 pb-3 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0">
                        <h3
                          className="font-bold text-sm text-on-surface truncate"
                          title={plano.name}
                        >
                          {plano.name}
                        </h3>
                        <span className="text-[10px] text-on-surface-variant/60 block">
                          ID: #{plano.id}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                          plano.isActive
                            ? "bg-primary/10 text-primary"
                            : "bg-error/10 text-error"
                        }`}
                      >
                        {plano.isActive ? t("comum:estado.ativo") : t("comum:estado.inativo")}
                      </span>
                    </div>

                    {/* Preço */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                        {fmtPreco(plano.monthlyPrice)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        {t("geral.porMes")}
                      </span>
                    </div>

                    {/* Limites */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-veu/3 rounded-xl p-2.5 border border-veu/5">
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                          {t("gerenciar.card.condominios")}
                        </p>
                        <p className="text-sm font-bold text-on-surface flex items-center gap-1">
                          <Icone
                            name="apartment"
                            className="text-xs text-primary"
                          />
                          {plano.maxCondominiums}
                        </p>
                      </div>
                      <div className="bg-veu/3 rounded-xl p-2.5 border border-veu/5">
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                          {t("gerenciar.card.usuariosCond")}
                        </p>
                        <p className="text-sm font-bold text-on-surface flex items-center gap-1">
                          <Icone
                            name="group"
                            className="text-xs text-primary"
                          />
                          {plano.maxUsersPerCondominium}
                        </p>
                      </div>
                    </div>

                    {/* Módulos */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">
                        {t("gerenciar.card.modulos", { qtd: plano.activeModules?.length || 0 })}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(plano.activeModules || []).map((slug) => {
                          const mod = MODULES_DISPONIVEIS.find(
                            (m) => m.slug === slug
                          );
                          return (
                            <span
                              key={slug}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/8 text-primary text-[9px] font-semibold border border-primary/10"
                              title={mod ? t(mod.label) : slug}
                            >
                              <Icone
                                name={mod?.icon || "extension"}
                                className="text-[10px]"
                              />
                              {mod ? t(mod.label) : slug}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer do card */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-veu/5 bg-veu/2">
                    <span className="text-[9px] text-on-surface-variant/50 font-medium">
                      {t("gerenciar.card.criado", { data: fmtData(plano.createdAt) })}
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleStatus(plano)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition cursor-pointer ${
                          plano.isActive
                            ? "bg-error/10 text-error hover:bg-error/20"
                            : "bg-primary/10 text-primary hover:bg-primary/20"
                        }`}
                      >
                        <Icone
                          name={
                            plano.isActive
                              ? "toggle_off"
                              : "toggle_on"
                          }
                          className="text-sm"
                        />
                        {plano.isActive ? t("gerenciar.status.desativar.botao") : t("gerenciar.status.ativar.botao")}
                      </button>
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(plano)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                      >
                        <Icone name="edit" className="text-sm" />
                        {t("comum:acoes.editar")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetalhe(detalhe?.id === plano.id ? null : plano)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-veu/5 text-on-surface-variant hover:bg-veu/10 hover:text-on-surface transition cursor-pointer"
                      >
                        <Icone
                          name={
                            detalhe?.id === plano.id
                              ? "expand_less"
                              : "expand_more"
                          }
                          className="text-sm"
                        />
                        {detalhe?.id === plano.id ? t("comum:acoes.fechar") : t("gerenciar.card.detalhes")}
                      </button>
                    </div>
                  </div>

                  {/* Painel de detalhes expandido */}
                  {detalhe?.id === plano.id && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-veu/5 bg-veu/2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            {t("gerenciar.detalhe.nome")}
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {plano.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            {t("gerenciar.detalhe.status")}
                          </p>
                          <p
                            className={`text-xs font-bold ${
                              plano.isActive ? "text-primary" : "text-error"
                            }`}
                          >
                            {plano.isActive ? t("comum:estado.ativo") : t("comum:estado.inativo")}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            {t("gerenciar.detalhe.preco")}
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {fmtPreco(plano.monthlyPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            {t("gerenciar.form.maxCondominios")}
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {plano.maxCondominiums}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            {t("gerenciar.detalhe.maxUsuarios")}
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {plano.maxUsersPerCondominium}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            {t("gerenciar.detalhe.atualizadoEm")}
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {fmtData(plano.updatedAt)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-1.5">
                          {t("gerenciar.detalhe.todosModulos")}
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {MODULES_DISPONIVEIS.map((mod) => {
                            const ativo = (plano.activeModules || []).includes(
                              mod.slug
                            );
                            return (
                              <div
                                key={mod.slug}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border ${
                                  ativo
                                    ? "bg-primary/8 border-primary/15 text-primary"
                                    : "bg-veu/3 border-veu/5 text-on-surface-variant/40 line-through"
                                }`}
                              >
                                <Icone
                                  name={ativo ? "check_circle" : "cancel"}
                                  className="text-xs shrink-0"
                                />
                                {t(mod.label)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
