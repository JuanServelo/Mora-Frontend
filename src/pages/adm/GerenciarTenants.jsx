// src/pages/adm/GerenciarTenants.jsx
// RF02 — Gerenciar Tenants (Super Admin)
import { useState, useEffect } from "react";
import {
  tenantApi,
  planoApi,
  TIPOS_TENANT_LABEL,
} from "../../services/plataformaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";

const selectCls =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";
const labelCls =
  "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

const STATUS_STYLE = {
  active: "bg-primary/10 text-primary",
  suspended: "bg-error/10 text-error",
};

const STATUS_LABEL = { active: "ativo", suspended: "suspenso" };

function formatarData(valor) {
  if (!valor) return "—";
  try {
    return new Date(valor).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

export function GerenciarTenants() {
  const toast = useToast();
  const confirm = useConfirm();
  const [tenants, setTenants] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [tipos, setTipos] = useState(Object.keys(TIPOS_TENANT_LABEL));
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    Promise.all([
      tenantApi.listar(),
      planoApi.listar().catch(() => ({ data: { planos: [] } })),
      tenantApi.tipos().catch(() => null),
    ])
      .then(([tenantsRes, planosRes, tiposRes]) => {
        setTenants(tenantsRes.data.tenants || []);
        setPlanos(planosRes.data.planos || []);
        if (tiposRes?.data?.tipos) setTipos(tiposRes.data.tipos);
      })
      .catch((err) =>
        toast.error(err.response?.data?.mensagem || "Erro ao carregar tenants."),
      )
      .finally(() => setCarregando(false));
  }, []);

  const planosAtivos = planos.filter((p) => p.isActive);

  function nomePlano(planId) {
    return planos.find((p) => p.id === planId)?.name || "—";
  }

  function toggleExpandir(id) {
    setExpandido((prev) => (prev === id ? null : id));
    setEditando(null);
  }

  async function criarTenant(dados) {
    const res = await tenantApi.criar(dados);
    setTenants((t) => [res.data.tenant, ...t]);
    setCriando(false);
    toast.success(res.data.mensagem || "Tenant cadastrado com sucesso.");
  }

  async function salvarEdicao(id, dados) {
    const res = await tenantApi.atualizar(id, dados);
    setTenants((ts) => ts.map((t) => (t.id === id ? res.data.tenant : t)));
    setEditando(null);
    toast.success(res.data.mensagem || "Alteração salva com sucesso.");
  }

  async function provisionar(tenant) {
    const ok = await confirm({
      titulo: "Provisionar tenant",
      mensagem:
        "O sistema publicará o evento de provisionamento para preparar a estrutura operacional do tenant.",
      confirmarTexto: "Provisionar",
      variante: "primary",
    });
    if (!ok) return;
    try {
      const res = await tenantApi.provisionar(tenant.id);
      setTenants((ts) => ts.map((t) => (t.id === tenant.id ? res.data.tenant : t)));
      toast.success(res.data.mensagem || "Tenant provisionado com sucesso.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao provisionar tenant.");
    }
  }

  async function alternarStatus(tenant) {
    const suspender = tenant.status === "active";
    const ok = await confirm({
      titulo: suspender ? "Suspender tenant" : "Reativar tenant",
      mensagem: suspender
        ? "O acesso do tenant será bloqueado temporariamente, sem apagar os dados."
        : "O tenant voltará a operar normalmente.",
      confirmarTexto: suspender ? "Suspender" : "Reativar",
      variante: suspender ? "danger" : "primary",
    });
    if (!ok) return;
    try {
      const res = suspender
        ? await tenantApi.suspender(tenant.id)
        : await tenantApi.reativar(tenant.id);
      setTenants((ts) => ts.map((t) => (t.id === tenant.id ? res.data.tenant : t)));
      toast.success(res.data.mensagem);
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao alterar status do tenant.");
    }
  }

  async function alterarPlano(id, planId) {
    const res = await tenantApi.alterarPlano(id, planId);
    setTenants((ts) => ts.map((t) => (t.id === id ? res.data.tenant : t)));
    toast.success(res.data.mensagem || "Plano alterado com sucesso.");
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando tenants...
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Plataforma
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Gerenciar{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Tenants
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-4 shrink-0 flex-wrap">
            <button
              onClick={() => {
                setCriando((c) => !c);
                setExpandido(null);
                setEditando(null);
              }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
                criando
                  ? "border-error/30 text-error hover:bg-error/10"
                  : "border-primary/30 text-primary hover:bg-primary/10"
              }`}
            >
              <Icone name={criando ? "close" : "add_business"} className="text-xl" />
              {criando ? "Cancelar" : "Novo Tenant"}
            </button>

            <div className="flex gap-3">
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-on-surface">
                  {tenants.length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                  Total
                </p>
              </div>
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-primary">
                  {tenants.filter((t) => t.status === "active").length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                  Ativos
                </p>
              </div>
            </div>
          </div>
        </header>

        {criando && (
          <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icone name="add_business" className="text-primary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Novo Tenant
              </h2>
            </div>
            {planosAtivos.length === 0 ? (
              <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-secondary/10 text-on-surface-variant text-sm">
                <Icone name="info" className="text-secondary text-base shrink-0 mt-0.5" />
                <span>
                  É necessário ter ao menos um plano ativo para cadastrar um tenant. Cadastre um
                  plano em "Planos" primeiro.
                </span>
              </div>
            ) : (
              <FormNovoTenant
                tipos={tipos}
                planosAtivos={planosAtivos}
                onSalvar={criarTenant}
                onCancelar={() => setCriando(false)}
              />
            )}
          </div>
        )}

        <div className="space-y-3">
          {tenants.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">
              Nenhum tenant cadastrado.
            </div>
          )}

          {tenants.map((tenant) => (
            <div key={tenant.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => toggleExpandir(tenant.id)}
                className="w-full flex items-center gap-4 p-5 text-left group hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="domain" className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{tenant.name}</p>
                  <p className="text-on-surface-variant text-sm truncate">
                    {TIPOS_TENANT_LABEL[tenant.type] || tenant.type} · {tenant.cnpj}
                  </p>
                </div>

                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "Plano", value: tenant.plano?.name || nomePlano(tenant.planId) },
                    { label: "Provisionado", value: tenant.provisioned ? "Sim" : "Não" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                        {col.label}
                      </p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>

                <span
                  className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    STATUS_STYLE[tenant.status] || "bg-secondary/10 text-secondary"
                  }`}
                >
                  {STATUS_LABEL[tenant.status] || tenant.status}
                </span>

                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${
                    expandido === tenant.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandido === tenant.id && (
                <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                  {editando === tenant.id ? (
                    <FormEdicaoTenant
                      tenant={tenant}
                      tipos={tipos}
                      onSalvar={(dados) => salvarEdicao(tenant.id, dados)}
                      onCancelar={() => setEditando(null)}
                    />
                  ) : (
                    <DetalhesTenant
                      tenant={tenant}
                      planosAtivos={planosAtivos}
                      nomePlano={nomePlano}
                      onEditar={() => setEditando(tenant.id)}
                      onProvisionar={
                        tenant.provisioned ? null : () => provisionar(tenant)
                      }
                      onAlternarStatus={() => alternarStatus(tenant)}
                      onAlterarPlano={(planId) => alterarPlano(tenant.id, planId)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetalhesTenant({
  tenant,
  planosAtivos,
  nomePlano,
  onEditar,
  onProvisionar,
  onAlternarStatus,
  onAlterarPlano,
}) {
  const [planId, setPlanId] = useState(tenant.planId);
  const [salvandoPlano, setSalvandoPlano] = useState(false);

  async function handleAlterarPlano() {
    if (!planId || planId === tenant.planId) return;
    setSalvandoPlano(true);
    try {
      await onAlterarPlano(Number(planId));
    } finally {
      setSalvandoPlano(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Tipo", value: TIPOS_TENANT_LABEL[tenant.type] || tenant.type, icon: "category" },
          { label: "CNPJ", value: tenant.cnpj, icon: "badge" },
          { label: "Schema", value: tenant.schemaName, icon: "dns" },
          { label: "Plano", value: tenant.plano?.name || nomePlano(tenant.planId), icon: "workspace_premium" },
          { label: "Status", value: STATUS_LABEL[tenant.status] || tenant.status, icon: "verified_user" },
          { label: "Provisionado", value: tenant.provisioned ? "Sim" : "Não", icon: "cloud_done" },
          { label: "Condomínios", value: tenant.condominiumCount ?? 0, icon: "apartment" },
          { label: "Criado em", value: formatarData(tenant.createdAt), icon: "event" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/30 rounded-2xl p-4">
            <Icone name={item.icon} className="text-primary text-xl mb-2" />
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">
              {item.label}
            </p>
            <p className="text-on-surface font-semibold text-sm break-words">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className={labelCls}>Trocar plano</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
            className={selectCls}
          >
            {planosAtivos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {!planosAtivos.some((p) => p.id === tenant.planId) && (
              <option value={tenant.planId}>
                {tenant.plano?.name || nomePlano(tenant.planId)} (atual)
              </option>
            )}
          </select>
          <button
            type="button"
            onClick={handleAlterarPlano}
            disabled={salvandoPlano || Number(planId) === tenant.planId}
            className="shrink-0 px-5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-all text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed py-3"
          >
            {salvandoPlano ? "Salvando…" : "Aplicar plano"}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEditar}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer"
        >
          <Icone name="edit" className="text-base" />
          Editar
        </button>
        {onProvisionar && (
          <button
            type="button"
            onClick={onProvisionar}
            className="flex items-center gap-2 text-sm font-semibold text-secondary hover:underline cursor-pointer"
          >
            <Icone name="rocket_launch" className="text-base" />
            Provisionar
          </button>
        )}
        <button
          type="button"
          onClick={onAlternarStatus}
          className={`flex items-center gap-2 text-sm font-semibold hover:underline cursor-pointer ${
            tenant.status === "active" ? "text-error" : "text-primary"
          }`}
        >
          <Icone
            name={tenant.status === "active" ? "pause_circle" : "play_circle"}
            className="text-base"
          />
          {tenant.status === "active" ? "Suspender" : "Reativar"}
        </button>
      </div>
    </div>
  );
}

function FormNovoTenant({ tipos, planosAtivos, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    name: "",
    type: tipos[0] || "",
    cnpj: "",
    schemaName: "",
    planId: planosAtivos[0]?.id ?? "",
  });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro(null);
    if (!form.name.trim() || !form.type || !form.cnpj.trim() || !form.schemaName.trim()) {
      setErro("Este campo é obrigatório.");
      return;
    }
    if (!form.planId) {
      setErro("Selecione um plano para continuar.");
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        name: form.name.trim(),
        type: form.type,
        cnpj: form.cnpj.trim(),
        schemaName: form.schemaName.trim(),
        planId: Number(form.planId),
      });
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao cadastrar tenant.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="tenant-nome"
          label="Nome *"
          placeholder="Ex: Administradora Alfa"
          icon="domain"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <div className="space-y-2">
          <label className={labelCls}>Tipo *</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            required
            className={selectCls}
          >
            {tipos.map((t) => (
              <option key={t} value={t}>
                {TIPOS_TENANT_LABEL[t] || t}
              </option>
            ))}
          </select>
        </div>
        <Campo
          id="tenant-cnpj"
          label="CNPJ *"
          placeholder="00.000.000/0000-00"
          icon="badge"
          value={form.cnpj}
          onChange={(e) => set("cnpj", e.target.value)}
        />
        <Campo
          id="tenant-schema"
          label="Identificador do schema *"
          placeholder="ex: tenant_alfa"
          icon="dns"
          value={form.schemaName}
          onChange={(e) => set("schemaName", e.target.value)}
        />
        <div className="space-y-2 sm:col-span-2">
          <label className={labelCls}>Plano *</label>
          <select
            value={form.planId}
            onChange={(e) => set("planId", e.target.value)}
            required
            className={selectCls}
          >
            <option value="">— Selecione —</option>
            {planosAtivos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
        <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
        <span>
          Após cadastrar, provisione o tenant para preparar a estrutura operacional (evento
          tenant.provisioned).
        </span>
      </div>

      {erro && (
        <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>
      )}

      <div className="flex gap-3 pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : "Cadastrar tenant"}
          <Icone name="check" className="text-xl" />
        </Botao>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

function FormEdicaoTenant({ tenant, tipos, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    name: tenant.name ?? "",
    type: tenant.type ?? tipos[0] ?? "",
    cnpj: tenant.cnpj ?? "",
    status: tenant.status ?? "active",
  });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSalvar() {
    setErro(null);
    if (!form.name.trim() || !form.cnpj.trim()) {
      setErro("Este campo é obrigatório.");
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        name: form.name.trim(),
        type: form.type,
        cnpj: form.cnpj.trim(),
        status: form.status,
      });
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao salvar tenant.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="tenant-edit-nome"
          label="Nome *"
          icon="domain"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <div className="space-y-2">
          <label className={labelCls}>Tipo</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className={selectCls}
          >
            {tipos.map((t) => (
              <option key={t} value={t}>
                {TIPOS_TENANT_LABEL[t] || t}
              </option>
            ))}
          </select>
        </div>
        <Campo
          id="tenant-edit-cnpj"
          label="CNPJ *"
          icon="badge"
          value={form.cnpj}
          onChange={(e) => set("cnpj", e.target.value)}
        />
        <div className="space-y-2">
          <label className={labelCls}>Status</label>
          <div className="flex gap-2 flex-wrap pt-1.5">
            {["active", "suspended"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("status", s)}
                className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all cursor-pointer border ${
                  form.status === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
                }`}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {erro && (
        <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Botao type="button" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar alterações"}
          <Icone name="check" className="text-xl" />
        </Botao>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
