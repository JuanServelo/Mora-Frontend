// src/pages/adm/GerenciarPlanos.jsx
// RF01 — Gerenciar Planos SaaS (Super Admin)
import { useState, useEffect } from "react";
import { planoApi, MODULOS_LABEL } from "../../services/plataformaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";

const selectCls =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";
const labelCls =
  "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

function formatarPreco(valor) {
  const numero = Number(valor || 0);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function GerenciarPlanos() {
  const toast = useToast();
  const confirm = useConfirm();
  const [planos, setPlanos] = useState([]);
  const [modulosDisponiveis, setModulosDisponiveis] = useState(Object.keys(MODULOS_LABEL));
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);

  useEffect(() => {
    Promise.all([planoApi.listar(), planoApi.modulos().catch(() => null)])
      .then(([listaRes, modulosRes]) => {
        setPlanos(listaRes.data.planos || []);
        if (modulosRes?.data?.modulos) setModulosDisponiveis(modulosRes.data.modulos);
      })
      .catch((err) =>
        toast.error(err.response?.data?.mensagem || "Erro ao carregar planos."),
      )
      .finally(() => setCarregando(false));
  }, []);

  function toggleExpandir(id) {
    setExpandido((prev) => (prev === id ? null : id));
    setEditando(null);
  }

  async function criarPlano(dados) {
    const res = await planoApi.criar(dados);
    setPlanos((p) => [res.data.plano, ...p]);
    setCriando(false);
    toast.success(res.data.mensagem || "Plano cadastrado com sucesso.");
  }

  async function salvarEdicao(id, dados) {
    const res = await planoApi.atualizar(id, dados);
    setPlanos((ps) => ps.map((p) => (p.id === id ? res.data.plano : p)));
    setEditando(null);
    toast.success(res.data.mensagem || "Alteração salva com sucesso.");
  }

  async function alternarStatus(plano) {
    const ativar = !plano.isActive;
    const ok = await confirm({
      titulo: ativar ? "Ativar plano" : "Desativar plano",
      mensagem: ativar
        ? "O plano voltará a ficar disponível para contratação."
        : "O plano deixará de ser ofertado para novos tenants.",
      confirmarTexto: ativar ? "Ativar" : "Desativar",
      variante: ativar ? "primary" : "danger",
    });
    if (!ok) return;
    try {
      const res = ativar
        ? await planoApi.ativar(plano.id)
        : await planoApi.desativar(plano.id);
      setPlanos((ps) => ps.map((p) => (p.id === plano.id ? res.data.plano : p)));
      toast.success(res.data.mensagem);
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao alterar status do plano.");
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center text-on-surface-variant">
        Carregando planos...
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
                Planos
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
              <Icone name={criando ? "close" : "add"} className="text-xl" />
              {criando ? "Cancelar" : "Novo Plano"}
            </button>

            <div className="flex gap-3">
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-on-surface">
                  {planos.length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                  Total
                </p>
              </div>
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-primary">
                  {planos.filter((p) => p.isActive).length}
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
                <Icone name="workspace_premium" className="text-primary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Novo Plano
              </h2>
            </div>
            <FormPlano
              modulosDisponiveis={modulosDisponiveis}
              onSalvar={criarPlano}
              onCancelar={() => setCriando(false)}
              textoSalvar="Cadastrar plano"
            />
          </div>
        )}

        <div className="space-y-3">
          {planos.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">
              Nenhum plano cadastrado.
            </div>
          )}

          {planos.map((plano) => (
            <div key={plano.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => toggleExpandir(plano.id)}
                className="w-full flex items-center gap-4 p-5 text-left group hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="workspace_premium" className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{plano.name}</p>
                  <p className="text-on-surface-variant text-sm truncate">
                    {formatarPreco(plano.monthlyPrice)} / mês
                  </p>
                </div>

                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "Condomínios", value: plano.maxCondominiums },
                    { label: "Usuários/cond.", value: plano.maxUsersPerCondominium },
                    { label: "Módulos", value: (plano.activeModules || []).length },
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
                    plano.isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-error/10 text-error"
                  }`}
                >
                  {plano.isActive ? "ativo" : "inativo"}
                </span>

                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${
                    expandido === plano.id ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expandido === plano.id && (
                <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                  {editando === plano.id ? (
                    <FormPlano
                      plano={plano}
                      modulosDisponiveis={modulosDisponiveis}
                      onSalvar={(dados) => salvarEdicao(plano.id, dados)}
                      onCancelar={() => setEditando(null)}
                      textoSalvar="Salvar alterações"
                    />
                  ) : (
                    <DetalhesPlano
                      plano={plano}
                      onEditar={() => setEditando(plano.id)}
                      onAlternarStatus={() => alternarStatus(plano)}
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

function DetalhesPlano({ plano, onEditar, onAlternarStatus }) {
  const modulos = plano.activeModules || [];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Preço mensal", value: formatarPreco(plano.monthlyPrice), icon: "payments" },
          { label: "Máx. condomínios", value: plano.maxCondominiums, icon: "apartment" },
          { label: "Máx. usuários/cond.", value: plano.maxUsersPerCondominium, icon: "group" },
          { label: "Status", value: plano.isActive ? "Ativo" : "Inativo", icon: "verified" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/30 rounded-2xl p-4">
            <Icone name={item.icon} className="text-primary text-xl mb-2" />
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">
              {item.label}
            </p>
            <p className="text-on-surface font-semibold text-sm">{item.value}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
          Módulos ativos
        </p>
        <div className="flex flex-wrap gap-2">
          {modulos.length === 0 && (
            <span className="text-on-surface-variant text-sm">Nenhum módulo.</span>
          )}
          {modulos.map((m) => (
            <span
              key={m}
              className="flex items-center gap-1.5 bg-surface-container-highest/60 rounded-full px-3 py-1.5 text-sm text-on-surface"
            >
              <Icone name="check_circle" className="text-primary text-base" />
              {MODULOS_LABEL[m] || m}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onEditar}
          className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer"
        >
          <Icone name="edit" className="text-base" />
          Editar plano
        </button>
        <button
          type="button"
          onClick={onAlternarStatus}
          className={`flex items-center gap-2 text-sm font-semibold hover:underline cursor-pointer ${
            plano.isActive ? "text-error" : "text-primary"
          }`}
        >
          <Icone name={plano.isActive ? "block" : "check_circle"} className="text-base" />
          {plano.isActive ? "Desativar" : "Ativar"}
        </button>
      </div>
    </div>
  );
}

function FormPlano({ plano, modulosDisponiveis, onSalvar, onCancelar, textoSalvar }) {
  const [form, setForm] = useState({
    name: plano?.name ?? "",
    maxCondominiums: plano?.maxCondominiums ?? "",
    maxUsersPerCondominium: plano?.maxUsersPerCondominium ?? "",
    monthlyPrice: plano?.monthlyPrice ?? "",
  });
  const [modulos, setModulos] = useState(plano?.activeModules ?? []);
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleModulo(slug) {
    setModulos((ms) =>
      ms.includes(slug) ? ms.filter((m) => m !== slug) : [...ms, slug],
    );
  }

  async function handleSalvar() {
    setErro(null);
    if (
      !form.name.trim() ||
      form.maxCondominiums === "" ||
      form.maxUsersPerCondominium === "" ||
      form.monthlyPrice === ""
    ) {
      setErro("Este campo é obrigatório.");
      return;
    }
    if (modulos.length === 0) {
      setErro("Selecione um módulo.");
      return;
    }
    setSalvando(true);
    try {
      await onSalvar({
        name: form.name.trim(),
        maxCondominiums: Number(form.maxCondominiums),
        maxUsersPerCondominium: Number(form.maxUsersPerCondominium),
        monthlyPrice: Number(form.monthlyPrice),
        activeModules: modulos,
      });
    } catch (err) {
      setErro(err.response?.data?.mensagem || "Erro ao salvar plano.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="plano-nome"
          label="Nome *"
          placeholder="Ex: Starter"
          icon="badge"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <Campo
          id="plano-preco"
          label="Preço mensal (R$) *"
          type="number"
          min="0"
          step="0.01"
          placeholder="0,00"
          icon="payments"
          value={form.monthlyPrice}
          onChange={(e) => set("monthlyPrice", e.target.value)}
        />
        <Campo
          id="plano-cond"
          label="Máx. condomínios *"
          type="number"
          min="1"
          placeholder="1"
          icon="apartment"
          value={form.maxCondominiums}
          onChange={(e) => set("maxCondominiums", e.target.value)}
        />
        <Campo
          id="plano-users"
          label="Máx. usuários por condomínio *"
          type="number"
          min="1"
          placeholder="1"
          icon="group"
          value={form.maxUsersPerCondominium}
          onChange={(e) => set("maxUsersPerCondominium", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <p className={labelCls}>Módulos ativos *</p>
        <div className="flex flex-wrap gap-2">
          {modulosDisponiveis.map((slug) => {
            const ativo = modulos.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => toggleModulo(slug)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer border ${
                  ativo
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
                }`}
              >
                {MODULOS_LABEL[slug] || slug}
              </button>
            );
          })}
        </div>
      </div>

      {erro && (
        <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Botao type="button" onClick={handleSalvar} disabled={salvando}>
          {salvando ? "Salvando…" : textoSalvar}
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
