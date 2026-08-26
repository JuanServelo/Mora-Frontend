import { useState, useEffect } from "react";
import { condominiosApi } from "../../services/condominiosApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS } from "../../utils/perfis";
import { mascararCnpj, mascararTelefone, validarCnpj, validarTelefone } from "../../utils/masks";

const STATUS_STYLE = {
  active:   "bg-primary/10 text-primary",
  inactive: "bg-error/10 text-error",
};

export function GerenciarCondominios() {
  const toast = useToast();
  const confirm = useConfirm();
  const { usuario } = useAuth();
  const [condominios, setCondominios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [busca, setBusca] = useState("");

  const isGerente = [PERFIS.CONTRACTING_PROPERTY_MANAGER, PERFIS.CONTRACTING_SYNDIC].includes(usuario?.perfil);

  useEffect(() => {
    condominiosApi.listar()
      .then((res) => setCondominios(res.data.condominios || []))
      .catch(() => toast.error("Erro ao carregar clientes."))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = condominios.filter(
    (c) =>
      c.nome?.toLowerCase().includes(busca.toLowerCase()) ||
      c.id?.toLowerCase().includes(busca.toLowerCase()) ||
      c.cnpj?.includes(busca),
  );

  function toggleExpandir(id) {
    setExpandido((prev) => (prev === id ? null : id));
    setEditando(null);
  }

  async function criarCondominio(dados) {
    try {
      const res = await condominiosApi.criar(dados);
      setCondominios((cs) => [res.data.condominio, ...cs]);
      setCriando(false);
      toast.success("Cliente criado com sucesso.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao criar cliente.");
    }
  }

  async function salvarEdicao(id, dados) {
    try {
      const res = await condominiosApi.atualizar(id, dados);
      setCondominios((cs) => cs.map((c) => (c.id === id ? res.data.condominio : c)));
      setEditando(null);
      toast.success("Cliente atualizado.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao atualizar cliente.");
    }
  }

  async function toggleStatus(cond) {
    const desativando = cond.status === "active";
    const ok = await confirm({
      titulo: desativando ? "Desativar cliente" : "Reativar cliente",
      mensagem: desativando
        ? `Deseja desativar "${cond.nome}"? Os usuários vinculados perderão acesso.`
        : `Deseja reativar "${cond.nome}"?`,
      confirmarTexto: desativando ? "Desativar" : "Reativar",
      variante: desativando ? "danger" : "default",
    });
    if (!ok) return;
    try {
      const fn = desativando ? condominiosApi.desativar : condominiosApi.ativar;
      await fn(cond.id);
      setCondominios((cs) =>
        cs.map((c) => (c.id === cond.id ? { ...c, status: desativando ? "inactive" : "active" } : c)),
      );
      toast.success(desativando ? "Cliente desativado." : "Cliente reativado.");
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao alterar status.");
    }
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              Gerenciar{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Clientes
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full md:w-auto md:shrink-0">
            {isGerente && (
              <button
                onClick={() => { setCriando((c) => !c); setExpandido(null); }}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
                  criando
                    ? "border-error/30 text-error hover:bg-error/10"
                    : "border-primary/30 text-primary hover:bg-primary/10"
                }`}
              >
                <Icone name={criando ? "close" : "add_business"} className="text-xl" />
                {criando ? "Cancelar" : "Novo Cliente"}
              </button>
            )}

            <div className="flex gap-3">
              <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
                <p className="text-2xl font-headline font-bold text-on-surface">{condominios.length}</p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
              </div>
              <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
                <p className="text-2xl font-headline font-bold text-primary">
                  {condominios.filter((c) => c.status === "active").length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">Ativos</p>
              </div>
            </div>
          </div>
        </header>

        {/* Form de criação */}
        {criando && (
          <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-primary/15">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icone name="add_business" className="text-primary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Novo Cliente</h2>
            </div>
            <FormCondominio onSalvar={criarCondominio} onCancelar={() => setCriando(false)} isNovo />
          </div>
        )}

        {/* Busca */}
        <div className="max-w-md">
          <Campo
            id="busca-cond"
            placeholder="Buscar por nome, ID ou CNPJ..."
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {/* Lista */}
        {carregando && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="glass-panel rounded-3xl p-5 animate-pulse h-20" />
            ))}
          </div>
        )}

        {!carregando && filtrados.length === 0 && (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            Nenhum cliente encontrado.
          </div>
        )}

        <div className="space-y-3">
          {filtrados.map((cond) => (
            <div key={cond.id} className="glass-panel rounded-3xl overflow-hidden">
              {/* Linha principal */}
              <button
                onClick={() => toggleExpandir(cond.id)}
                className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left group hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="domain" className="text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{cond.nome}</p>
                  <p className="text-on-surface-variant text-sm font-mono truncate">{cond.id}</p>
                </div>

                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "CNPJ", value: cond.cnpj || "—" },
                    { label: "E-mail", value: cond.email || "—" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold text-sm truncate max-w-[140px]">{col.value}</p>
                    </div>
                  ))}
                </div>

                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[cond.status]}`}>
                  {cond.status === "active" ? "ativo" : "inativo"}
                </span>

                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === cond.id ? "rotate-180" : ""}`}
                />
              </button>

              {/* Painel expandido */}
              {expandido === cond.id && (
                <div className="border-t border-outline-variant/15 px-4 sm:px-5 pb-6 pt-5">
                  {editando === cond.id ? (
                    <FormCondominio
                      inicial={cond}
                      onSalvar={(dados) => salvarEdicao(cond.id, dados)}
                      onCancelar={() => setEditando(null)}
                    />
                  ) : (
                    <DetalhesCondominio
                      cond={cond}
                      isGerente={isGerente}
                      onEditar={() => setEditando(cond.id)}
                      onToggleStatus={() => toggleStatus(cond)}
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

// ─────────────────────────────────────────────
function DetalhesCondominio({ cond, isGerente, onEditar, onToggleStatus }) {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState(null);
  const [carregandoUsers, setCarregandoUsers] = useState(false);
  const [mostrarUsuarios, setMostrarUsuarios] = useState(false);
  const [novoUserId, setNovoUserId] = useState("");
  const [vinculando, setVinculando] = useState(false);

  async function carregarUsuarios() {
    if (usuarios !== null) { setMostrarUsuarios(true); return; }
    setCarregandoUsers(true);
    setMostrarUsuarios(true);
    try {
      const res = await condominiosApi.listarUsuarios(cond.id);
      setUsuarios(res.data.usuarios || []);
    } catch {
      toast.error("Erro ao carregar usuários do cliente.");
      setMostrarUsuarios(false);
    } finally {
      setCarregandoUsers(false);
    }
  }

  async function vincularUsuario() {
    if (!novoUserId.trim()) return;
    setVinculando(true);
    try {
      await condominiosApi.vincularUsuario(cond.id, Number(novoUserId.trim()));
      toast.success("Usuário vinculado ao cliente.");
      setNovoUserId("");
      setUsuarios(null); // recarrega na próxima vez
    } catch (err) {
      toast.error(err.response?.data?.mensagem || "Erro ao vincular usuário.");
    } finally {
      setVinculando(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Detalhes */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "ID / Slug", value: cond.id, icon: "tag" },
          { label: "CNPJ", value: cond.cnpj || "—", icon: "badge" },
          { label: "Telefone", value: cond.telefone || "—", icon: "call" },
          { label: "E-mail", value: cond.email || "—", icon: "mail" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/30 rounded-2xl p-4">
            <Icone name={item.icon} className="text-primary text-xl mb-2" />
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{item.label}</p>
            <p className="text-on-surface font-semibold text-sm truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {cond.endereco && (
        <p className="text-sm text-on-surface-variant flex items-center gap-2">
          <Icone name="location_on" className="text-primary text-base" />
          {cond.endereco}
        </p>
      )}

      {/* Usuários do condomínio */}
      <div>
        <button
          onClick={carregarUsuarios}
          className="flex items-center gap-2 text-sm font-semibold text-tertiary hover:underline cursor-pointer mb-3"
        >
          <Icone name={mostrarUsuarios ? "expand_less" : "group"} className="text-base" />
          {mostrarUsuarios ? "Ocultar usuários" : "Ver usuários"}
        </button>

        {mostrarUsuarios && (
          <div className="space-y-3">
            {carregandoUsers && (
              <div className="h-12 glass-panel rounded-2xl animate-pulse" />
            )}
            {!carregandoUsers && usuarios?.length === 0 && (
              <p className="text-on-surface-variant text-sm">Nenhum usuário vinculado a este cliente.</p>
            )}
            {!carregandoUsers && usuarios?.map((u) => (
              <div key={u.id} className="flex items-center gap-3 bg-surface-container-highest/30 rounded-2xl px-4 py-3">
                <Icone name="person" className="text-primary text-base shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface text-sm font-semibold truncate">{u.nome}</p>
                  <p className="text-on-surface-variant text-xs truncate">{u.email} · {u.perfil}</p>
                </div>
              </div>
            ))}

            {/* Vincular usuário */}
            {isGerente && (
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <Campo
                    id="novo-user-id"
                    placeholder="ID do usuário (número)"
                    icon="person_add"
                    value={novoUserId}
                    onChange={(e) => setNovoUserId(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), vincularUsuario())}
                  />
                </div>
                <button
                  onClick={vincularUsuario}
                  disabled={vinculando || !novoUserId.trim()}
                  className="shrink-0 px-4 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-all text-sm font-semibold cursor-pointer disabled:opacity-40"
                >
                  {vinculando ? "…" : "Vincular"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ações */}
      <div className="flex flex-wrap gap-3 pt-1">
        {isGerente && (
          <button
            onClick={onEditar}
            className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer"
          >
            <Icone name="edit" className="text-base" />
            Editar
          </button>
        )}
        {isGerente && (
          <button
            onClick={onToggleStatus}
            className={`flex items-center gap-2 text-sm font-semibold hover:underline cursor-pointer ${
              cond.status === "active" ? "text-error" : "text-primary"
            }`}
          >
            <Icone name={cond.status === "active" ? "block" : "check_circle"} className="text-base" />
            {cond.status === "active" ? "Desativar" : "Reativar"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
function FormCondominio({ inicial, onSalvar, onCancelar, isNovo }) {
  const [form, setForm] = useState({
    id: inicial?.id ?? "",
    nome: inicial?.nome ?? "",
    cnpj: inicial?.cnpj ? mascararCnpj(inicial.cnpj) : "",
    endereco: inicial?.endereco ?? "",
    telefone: inicial?.telefone ? mascararTelefone(inicial.telefone) : "",
    email: inicial?.email ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErros((e) => ({ ...e, [field]: undefined }));
  }

  function validar() {
    const novosErros = {};
    if (isNovo && !form.id.trim()) novosErros.id = "ID é obrigatório.";
    if (!form.nome.trim()) novosErros.nome = "Nome é obrigatório.";
    if (form.cnpj.trim()) {
      const digits = form.cnpj.replace(/\D/g, "");
      if (digits.length !== 14) novosErros.cnpj = "CNPJ incompleto (14 dígitos).";
      else if (!validarCnpj(form.cnpj)) novosErros.cnpj = "CNPJ inválido.";
    }
    if (form.telefone.trim() && !validarTelefone(form.telefone)) {
      novosErros.telefone = "Telefone inválido (10 ou 11 dígitos).";
    }
    return novosErros;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validar();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }
    setErros({});
    setSalvando(true);
    try {
      await onSalvar({
        id: form.id.trim().toLowerCase(),
        nome: form.nome.trim(),
        cnpj: form.cnpj.trim() || undefined,
        endereco: form.endereco.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        email: form.email.trim() || undefined,
      });
    } catch {
      // erro tratado pelo pai
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isNovo && (
          <Campo
            id="cond-id"
            label="ID / Slug *"
            placeholder="ex: cond-jardim-europa"
            icon="tag"
            value={form.id}
            error={erros.id}
            onChange={(e) => set("id", e.target.value.toLowerCase().replace(/\s/g, "-"))}
          />
        )}
        <Campo
          id="cond-nome"
          label="Nome do Cliente *"
          placeholder="Condomínio Jardim Europa"
          icon="domain"
          value={form.nome}
          error={erros.nome}
          onChange={(e) => set("nome", e.target.value)}
        />
        <Campo
          id="cond-cnpj"
          label="CNPJ"
          placeholder="00.000.000/0000-00"
          icon="badge"
          value={form.cnpj}
          error={erros.cnpj}
          inputMode="numeric"
          onChange={(e) => set("cnpj", mascararCnpj(e.target.value))}
        />
        <Campo
          id="cond-email"
          label="E-mail"
          type="email"
          placeholder="contato@condominio.com"
          icon="mail"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
        <Campo
          id="cond-telefone"
          label="Telefone"
          placeholder="(11) 99999-9999"
          icon="call"
          value={form.telefone}
          error={erros.telefone}
          inputMode="numeric"
          onChange={(e) => set("telefone", mascararTelefone(e.target.value))}
        />
      </div>
      <Campo
        id="cond-endereco"
        label="Endereço"
        placeholder="Rua das Flores, 100 — São Paulo, SP"
        icon="location_on"
        value={form.endereco}
        onChange={(e) => set("endereco", e.target.value)}
      />

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : isNovo ? "Criar Cliente" : "Salvar Alterações"}
          <Icone name={isNovo ? "add_business" : "check"} className="text-xl" />
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
