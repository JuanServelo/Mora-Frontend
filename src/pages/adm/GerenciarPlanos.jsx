// src/pages/adm/GerenciarPlanos.jsx
import { useState, useEffect } from "react";
import { planApi } from "../../services/planApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";

// ─── constantes ────────────────────────────────
const MODULES_DISPONIVEIS = [
  { slug: "portaria", label: "Portaria", icon: "support_agent" },
  { slug: "reunioes", label: "Reuniões", icon: "groups" },
  { slug: "vagas", label: "Vagas", icon: "local_parking" },
  { slug: "entregas", label: "Entregas", icon: "local_shipping" },
  { slug: "areas_comuns", label: "Áreas Comuns", icon: "deck" },
  { slug: "reclamacoes", label: "Reclamações", icon: "report_problem" },
  { slug: "conhecimento", label: "Base de Conhecimento", icon: "menu_book" },
  { slug: "votacoes", label: "Votações", icon: "how_to_vote" },
  { slug: "veiculos", label: "Veículos", icon: "directions_car" },
  { slug: "chaves", label: "Chaves", icon: "vpn_key" },
];

const EMPTY_PLAN = {
  name: "",
  maxCondominiums: "",
  maxUsersPerCondominium: "",
  monthlyPrice: "",
  activeModules: [],
};

function fmtPreco(valor) {
  if (valor == null) return "—";
  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function fmtData(dt) {
  if (!dt) return "—";
  return new Date(dt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ════════════════════════════════════════════
export function GerenciarPlanos() {
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
      toast.error("Erro ao carregar planos.");
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
    if (!form.name.trim()) errors.name = "Este campo é obrigatório.";
    if (!form.maxCondominiums || Number(form.maxCondominiums) <= 0)
      errors.maxCondominiums = "Informe valores maiores que zero.";
    if (!form.maxUsersPerCondominium || Number(form.maxUsersPerCondominium) <= 0)
      errors.maxUsersPerCondominium = "Informe valores maiores que zero.";
    if (form.monthlyPrice === "" || form.monthlyPrice === null || form.monthlyPrice === undefined)
      errors.monthlyPrice = "Este campo é obrigatório.";
    else if (Number(form.monthlyPrice) < 0)
      errors.monthlyPrice = "O preço não pode ser negativo.";
    if (!form.activeModules.length)
      errors.activeModules = "Selecione um módulo.";
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
        toast.success("Alteração salva com sucesso.");
      } else {
        await planApi.criar(payload);
        toast.success("Plano cadastrado com sucesso.");
      }

      setForm(EMPTY_PLAN);
      setCriando(false);
      setEditandoId(null);
      setDetalhe(null);
      carregarPlanos();
    } catch (err) {
      const msg = err.response?.data?.message || "Erro ao salvar plano.";
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
      titulo: `${plano.isActive ? "Desativar" : "Ativar"} plano`,
      mensagem: `Deseja ${acao} o plano "${plano.name}"?`,
      confirmarTexto: plano.isActive ? "Desativar" : "Ativar",
      variante: plano.isActive ? "danger" : "primary",
    });
    if (!ok) return;

    try {
      await planApi.toggleStatus(plano.id);
      toast.success(
        plano.isActive
          ? "Plano desativado com sucesso."
          : "Plano ativado com sucesso."
      );
      carregarPlanos();
      if (detalhe?.id === plano.id) {
        setDetalhe((p) => (p ? { ...p, isActive: !p.isActive } : p));
      }
    } catch {
      toast.error(`Erro ao ${acao} plano.`);
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
              Super Admin
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Gestão de{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Planos SaaS
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
                  Planos
                </h2>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">
                  {planos.length} plano{planos.length !== 1 ? "s" : ""}{" "}
                  cadastrado{planos.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={carregarPlanos}
                disabled={carregando}
                className="p-2.5 rounded-xl hover:bg-white/5 text-on-surface-variant hover:text-on-surface transition cursor-pointer"
                title="Atualizar"
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
                {criando ? "Cancelar" : "Novo Plano"}
              </button>
            </div>
          </div>

          {/* ─── Formulário ─────────────────── */}
          {criando && (
            <form
              id="form-plan-topo"
              onSubmit={salvarPlano}
              className="bg-surface-container-highest/20 rounded-2xl p-5 space-y-5 border border-white/10"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h3 className="font-semibold text-on-surface text-sm flex items-center gap-2">
                  <Icone
                    name={editandoId ? "edit" : "add_circle"}
                    className="text-primary"
                  />
                  {editandoId
                    ? `Editar Plano #${editandoId}`
                    : "Novo Plano"}
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
                    Descartar Edição
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
                label="Nome do Plano"
                name="name"
                value={form.name}
                onChange={handleForm}
                placeholder="Ex: Plano Essencial"
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
                    label="Máx. Condomínios"
                    name="maxCondominiums"
                    type="number"
                    value={form.maxCondominiums}
                    onChange={handleForm}
                    placeholder="Ex: 10"
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
                    label="Máx. Usuários / Condomínio"
                    name="maxUsersPerCondominium"
                    type="number"
                    value={form.maxUsersPerCondominium}
                    onChange={handleForm}
                    placeholder="Ex: 200"
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
                    label="Preço Mensal (R$)"
                    name="monthlyPrice"
                    type="number"
                    step="0.01"
                    value={form.monthlyPrice}
                    onChange={handleForm}
                    placeholder="Ex: 199.90"
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
                    Módulos Ativos
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllModules}
                      className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-on-surface-variant/30">|</span>
                    <button
                      type="button"
                      onClick={deselectAllModules}
                      className="text-[10px] text-on-surface-variant hover:text-error hover:underline font-semibold cursor-pointer"
                    >
                      Limpar
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
                            : "bg-surface-container-highest/20 border-white/5 text-on-surface-variant hover:border-primary/20 hover:text-on-surface"
                        }`}
                      >
                        <Icone
                          name={selected ? "check_circle" : mod.icon}
                          className={`text-base shrink-0 ${selected ? "text-primary" : ""}`}
                        />
                        <span className="truncate">{mod.label}</span>
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
                  {form.activeModules.length} de {MODULES_DISPONIVEIS.length}{" "}
                  módulos selecionados
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
                    ? "Salvando..."
                    : editandoId
                    ? "Salvar Alterações"
                    : "Cadastrar Plano"}
                </button>
              </div>
            </form>
          )}

          {/* ─── Lista de Planos ────────────── */}
          {carregando ? (
            <div className="text-center py-12 text-on-surface-variant text-xs flex flex-col items-center justify-center gap-2">
              <Icone name="sync" className="text-2xl animate-spin text-primary" />
              Carregando planos...
            </div>
          ) : planos.length === 0 ? (
            <div className="text-center py-16 text-on-surface-variant flex flex-col items-center justify-center gap-3 bg-white/2 rounded-2xl border border-white/5">
              <Icone
                name="inventory_2"
                className="text-4xl text-primary/30"
              />
              <p className="font-medium text-sm">
                Nenhum plano cadastrado.
              </p>
              <p className="text-xs text-on-surface-variant/60">
                Clique em "Novo Plano" para começar.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {planos.map((plano) => (
                <div
                  key={plano.id}
                  className={`relative bg-surface-container-highest/20 hover:bg-surface-container-highest/30 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-lg overflow-hidden ${
                    plano.isActive
                      ? "border-white/5"
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
                        {plano.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </div>

                    {/* Preço */}
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                        {fmtPreco(plano.monthlyPrice)}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-medium">
                        /mês
                      </span>
                    </div>

                    {/* Limites */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/3 rounded-xl p-2.5 border border-white/5">
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                          Condomínios
                        </p>
                        <p className="text-sm font-bold text-on-surface flex items-center gap-1">
                          <Icone
                            name="apartment"
                            className="text-xs text-primary"
                          />
                          {plano.maxCondominiums}
                        </p>
                      </div>
                      <div className="bg-white/3 rounded-xl p-2.5 border border-white/5">
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                          Usuários/Cond.
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
                        Módulos ({plano.activeModules?.length || 0})
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
                              title={mod?.label || slug}
                            >
                              <Icone
                                name={mod?.icon || "extension"}
                                className="text-[10px]"
                              />
                              {mod?.label || slug}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Footer do card */}
                  <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-white/5 bg-white/2">
                    <span className="text-[9px] text-on-surface-variant/50 font-medium">
                      Criado: {fmtData(plano.createdAt)}
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
                        {plano.isActive ? "Desativar" : "Ativar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(plano)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition cursor-pointer"
                      >
                        <Icone name="edit" className="text-sm" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetalhe(detalhe?.id === plano.id ? null : plano)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold bg-white/5 text-on-surface-variant hover:bg-white/10 hover:text-on-surface transition cursor-pointer"
                      >
                        <Icone
                          name={
                            detalhe?.id === plano.id
                              ? "expand_less"
                              : "expand_more"
                          }
                          className="text-sm"
                        />
                        {detalhe?.id === plano.id ? "Fechar" : "Detalhes"}
                      </button>
                    </div>
                  </div>

                  {/* Painel de detalhes expandido */}
                  {detalhe?.id === plano.id && (
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/5 bg-white/2">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            Nome
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {plano.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            Status
                          </p>
                          <p
                            className={`text-xs font-bold ${
                              plano.isActive ? "text-primary" : "text-error"
                            }`}
                          >
                            {plano.isActive ? "Ativo" : "Inativo"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            Preço Mensal
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {fmtPreco(plano.monthlyPrice)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            Máx. Condomínios
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {plano.maxCondominiums}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            Máx. Usuários/Cond.
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {plano.maxUsersPerCondominium}
                          </p>
                        </div>
                        <div>
                          <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-0.5">
                            Atualizado em
                          </p>
                          <p className="text-xs text-on-surface font-medium">
                            {fmtData(plano.updatedAt)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold mb-1.5">
                          Todos os Módulos
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
                                    : "bg-white/3 border-white/5 text-on-surface-variant/40 line-through"
                                }`}
                              >
                                <Icone
                                  name={ativo ? "check_circle" : "cancel"}
                                  className="text-xs shrink-0"
                                />
                                {mod.label}
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
