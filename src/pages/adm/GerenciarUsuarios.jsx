// src/pages/adm/GerenciarUsuarios.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const MES_ATUAL = MESES[new Date().getMonth()];

const STATUS_STYLE = {
  ativo: "bg-primary/10 text-primary",
  pendente: "bg-secondary/10 text-secondary",
  inativo: "bg-error/10 text-error",
};

// ─────────────────────────────────────────────
export function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    api
      .get("/api/users")
      .then((res) => {
        const lista = (res.data.usuarios || []).map((u) => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          role: u.role,
          provider: u.provider,
          bloco: u.bloco || "-",
          apartamento: u.apartamento || "-",
          vaga: u.vaga || null,
          logins: [u.email],
          status: u.role === "admin" ? "ativo" : "ativo",
          createdAt: u.createdAt,
          condominio: { valor: "R$ 1.240,00", pago: false, vencimento: "-" },
        }));
        setUsuarios(lista);
      })
      .catch((err) => console.error("Erro ao carregar usuarios:", err))
      .finally(() => setCarregando(false));
  }, []);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [criando, setCriando] = useState(false);
  const [aba, setAba] = useState("gerenciamento"); // gerenciamento | financeiro
  const [ordenacaoCond, setOrdenacaoCond] = useState("todos");
  const [sortCond, setSortCond] = useState("nome");

  const filtrados = usuarios.filter(
    (u) =>
      u.nome.toLowerCase().includes(busca.toLowerCase()) ||
      u.email.toLowerCase().includes(busca.toLowerCase()) ||
      u.bloco.toLowerCase().includes(busca.toLowerCase()) ||
      u.apartamento.includes(busca),
  );

  function toggleExpandir(id) {
    setExpandido((prev) => (prev === id ? null : id));
    setEditando(null);
  }

  async function salvarEdicao(id, dados) {
    try {
      const res = await api.put(`/api/users/${id}`, dados);
      const u = res.data.usuario;
      setUsuarios((us) =>
        us.map((usr) => (usr.id === id ? { ...usr, nome: u.nome, email: u.email, role: u.role, ...dados } : usr)),
      );
      setEditando(null);
    } catch (err) {
      console.error("Erro ao salvar:", err);
    }
  }

  async function criarUsuario(dados) {
    try {
      const res = await api.post("/api/users", {
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha || "123456",
        role: "user",
      });
      const u = res.data.usuario;
      setUsuarios((us) => [
        { id: u.id, nome: u.nome, email: u.email, role: u.role, provider: u.provider, bloco: dados.bloco || "-", apartamento: dados.apartamento || "-", vaga: dados.vaga || null, logins: [u.email], status: "ativo", createdAt: u.createdAt, condominio: { valor: "R$ 1.240,00", pago: false, vencimento: "-" } },
        ...us,
      ]);
      setCriando(false);
    } catch (err) {
      console.error("Erro ao criar:", err);
    }
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Gerenciar{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Usuários
              </span>
            </h1>
          </div>

          {/* Botão + Stats */}
          <div className="flex items-center gap-4 shrink-0 flex-wrap">
            {aba === "gerenciamento" && (
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
                <Icone
                  name={criando ? "close" : "person_add"}
                  className="text-xl"
                />
                {criando ? "Cancelar" : "Novo Usuário"}
              </button>
            )}

            <div className="flex gap-3">
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-on-surface">
                  {usuarios.length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                  Total
                </p>
              </div>
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-primary">
                  {usuarios.filter((u) => u.status === "ativo").length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                  Ativos
                </p>
              </div>
              <div className="glass-panel rounded-2xl px-5 py-3 text-center">
                <p className="text-2xl font-headline font-bold text-secondary">
                  {usuarios.filter((u) => u.status === "pendente").length}
                </p>
                <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                  Pendentes
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Sub-navbar de abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit">
          {[
            {
              id: "gerenciamento",
              label: "Gerenciamento",
              icon: "manage_accounts",
            },
            { id: "financeiro", label: "Financeiro", icon: "payments" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setAba(tab.id);
                setCriando(false);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-white/5"
              }`}
            >
              <Icone name={tab.icon} className="text-lg" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Aba: Gerenciamento ── */}
        {aba === "gerenciamento" && (
          <>
            {criando && (
              <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Icone name="person_add" className="text-primary" />
                  </div>
                  <h2 className="font-headline text-xl font-bold text-on-surface">
                    Novo Usuário
                  </h2>
                </div>
                <FormNovoUsuario
                  onSalvar={criarUsuario}
                  onCancelar={() => setCriando(false)}
                />
              </div>
            )}

            {/* ── Seção Condomínio (removida do fluxo principal — agora na aba Financeiro) ── */}

            {/* Barra de busca */}
            <div className="max-w-md">
              <Campo
                id="busca"
                placeholder="Buscar por nome, e-mail, bloco ou apt..."
                icon="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            {/* Lista de usuários */}
            <div className="space-y-3">
              {filtrados.length === 0 && (
                <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">
                  Nenhum usuário encontrado.
                </div>
              )}

              {filtrados.map((usuario) => (
                <div
                  key={usuario.id}
                  className="glass-panel rounded-3xl overflow-hidden"
                >
                  {/* Linha principal */}
                  <button
                    onClick={() => toggleExpandir(usuario.id)}
                    className="w-full flex items-center gap-4 p-5 text-left group hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icone name="person" className="text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-semibold truncate">
                        {usuario.nome}
                      </p>
                      <p className="text-on-surface-variant text-sm truncate">
                        {usuario.email}
                      </p>
                    </div>

                    <div className="hidden sm:flex gap-6 text-sm shrink-0">
                      {[
                        { label: "Bloco", value: usuario.bloco },
                        { label: "Apt", value: usuario.apartamento },
                        { label: "Vaga", value: usuario.vaga ?? "—" },
                      ].map((col) => (
                        <div key={col.label} className="text-center">
                          <p className="text-on-surface-variant text-xs uppercase tracking-wider">
                            {col.label}
                          </p>
                          <p className="text-on-surface font-semibold">
                            {col.value}
                          </p>
                        </div>
                      ))}
                    </div>

                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[usuario.status]}`}
                    >
                      {usuario.status}
                    </span>

                    <Icone
                      name="expand_more"
                      className={`text-outline shrink-0 transition-transform duration-300 ${expandido === usuario.id ? "rotate-180" : ""}`}
                    />
                  </button>

                  {/* Painel expandido */}
                  {expandido === usuario.id && (
                    <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                      {editando === usuario.id ? (
                        <FormEdicao
                          usuario={usuario}
                          onSalvar={(dados) => salvarEdicao(usuario.id, dados)}
                          onCancelar={() => setEditando(null)}
                        />
                      ) : (
                        <DetalhesUsuario
                          usuario={usuario}
                          onEditar={() => setEditando(usuario.id)}
                        />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Aba: Financeiro ── */}
        {aba === "financeiro" && (
          <SecaoCondominio
            usuarios={usuarios}
            filtro={ordenacaoCond}
            setFiltro={setOrdenacaoCond}
            sort={sortCond}
            setSort={setSortCond}
          />
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
function SecaoCondominio({ usuarios, filtro, setFiltro, sort, setSort }) {
  const [busca, setBusca] = useState("");
  const pagos = usuarios.filter((u) => u.condominio?.pago).length;
  const pendentes = usuarios.filter((u) => !u.condominio?.pago).length;

  const lista = usuarios
    .filter((u) => {
      if (filtro === "pago") return u.condominio?.pago;
      if (filtro === "pendente") return !u.condominio?.pago;
      return true;
    })
    .filter((u) => {
      if (!busca) return true;
      const q = busca.toLowerCase();
      return (
        u.nome.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.bloco.toLowerCase().includes(q) ||
        u.apartamento.includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "bloco")
        return `${a.bloco}${a.apartamento}`.localeCompare(
          `${b.bloco}${b.apartamento}`,
        );
      if (sort === "status")
        return a.condominio?.pago === b.condominio?.pago
          ? 0
          : a.condominio?.pago
            ? -1
            : 1;
      return a.nome.localeCompare(b.nome);
    });

  const FILTROS = [
    { id: "todos", label: "Todos", count: usuarios.length },
    { id: "pago", label: "Pagos", count: pagos },
    { id: "pendente", label: "Pendentes", count: pendentes },
  ];

  const SORTS = [
    { id: "nome", label: "Nome" },
    { id: "bloco", label: "Bloco / Apt" },
    { id: "status", label: "Status pag." },
  ];

  return (
    <div className="glass-panel rounded-3xl p-6 lg:p-8 space-y-5">
      {/* Header da seção */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center shrink-0">
            <Icone name="payments" className="text-secondary" />
          </div>
          <div>
            <h2 className="font-headline text-xl font-bold text-on-surface">
              Condomínio — {MES_ATUAL}
            </h2>
            <p className="text-on-surface-variant text-xs">
              {pagos} pagos · {pendentes} pendentes
            </p>
          </div>
        </div>

        {/* Mini-progress bar */}
        <div className="sm:w-48 shrink-0">
          <div className="flex justify-between text-xs text-on-surface-variant mb-1">
            <span>
              {Math.round((pagos / (usuarios.length || 1)) * 100)}% pagos
            </span>
            <span>
              {pagos}/{usuarios.length}
            </span>
          </div>
          <div className="h-2 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-tertiary transition-all duration-500"
              style={{ width: `${(pagos / (usuarios.length || 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Barra de busca */}
      <div className="max-w-md">
        <Campo
          id="busca-cond"
          placeholder="Buscar por nome, e-mail, bloco ou apt..."
          icon="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Controles: filtro + ordenação */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFiltro(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
                filtro === f.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
              }`}
            >
              {f.label}
              <span className="bg-surface-container-highest rounded-full px-1.5 py-0.5 text-[10px]">
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-on-surface-variant">
          <Icone name="sort" className="text-base" />
          <span className="shrink-0">Ordenar por:</span>
          <div className="flex gap-1">
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  sort === s.id
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="space-y-2">
        {lista.map((u) => {
          const pago = u.condominio?.pago;
          return (
            <div
              key={u.id}
              className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-all"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icone name="person" className="text-primary text-base" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-on-surface text-sm font-semibold truncate">
                  {u.nome}
                </p>
                <p className="text-on-surface-variant text-xs">
                  Bloco {u.bloco} · Apt {u.apartamento}
                </p>
              </div>

              <div className="hidden sm:block text-right shrink-0">
                <p className="text-on-surface text-sm font-bold">
                  {u.condominio?.valor}
                </p>
                <p className="text-on-surface-variant text-xs">
                  Venc. {u.condominio?.vencimento}
                </p>
              </div>

              {/* Badge pago/pendente (somente leitura) */}
              <div
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                  pago
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-error/30 bg-error/10 text-error"
                }`}
              >
                <Icone
                  name={pago ? "check_circle" : "cancel"}
                  className="text-base"
                  style={pago ? { fontVariationSettings: "'FILL' 1" } : {}}
                />
                {pago ? "Pago" : "Pendente"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
function DetalhesUsuario({ usuario, onEditar }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant mb-3">
          Logins vinculados ao apartamento
        </p>
        <div className="flex flex-wrap gap-2">
          {usuario.logins.map((login) => (
            <span
              key={login}
              className="flex items-center gap-1.5 bg-surface-container-highest/60 rounded-full px-3 py-1.5 text-sm text-on-surface"
            >
              <Icone
                name="alternate_email"
                className="text-primary text-base"
              />
              {login}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Bloco", value: usuario.bloco, icon: "domain" },
          {
            label: "Apartamento",
            value: usuario.apartamento,
            icon: "meeting_room",
          },
          {
            label: "Vaga",
            value: usuario.vaga ?? "Não vinculada",
            icon: "local_parking",
          },
          { label: "Status", value: usuario.status, icon: "verified_user" },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-surface-container-highest/30 rounded-2xl p-4"
          >
            <Icone name={item.icon} className="text-primary text-xl mb-2" />
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">
              {item.label}
            </p>
            <p className="text-on-surface font-semibold text-sm capitalize">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <button
        onClick={onEditar}
        className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline cursor-pointer transition-colors"
      >
        <Icone name="edit" className="text-base" />
        Editar vinculações
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
function FormEdicao({ usuario, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    bloco: usuario.bloco,
    apartamento: usuario.apartamento,
    vaga: usuario.vaga ?? "",
    status: usuario.status,
    novoLogin: "",
    logins: [...usuario.logins],
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function adicionarLogin() {
    const login = form.novoLogin.trim();
    if (login && !form.logins.includes(login)) {
      setForm((f) => ({ ...f, logins: [...f.logins, login], novoLogin: "" }));
    }
  }

  function removerLogin(login) {
    if (form.logins.length === 1) return;
    setForm((f) => ({ ...f, logins: f.logins.filter((l) => l !== login) }));
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Campo
          id="edit-bloco"
          label="Bloco"
          placeholder="A"
          icon="domain"
          value={form.bloco}
          onChange={(e) => set("bloco", e.target.value)}
        />
        <Campo
          id="edit-apt"
          label="Apartamento"
          placeholder="102"
          icon="meeting_room"
          value={form.apartamento}
          onChange={(e) => set("apartamento", e.target.value)}
        />
        <Campo
          id="edit-vaga"
          label="Vaga"
          placeholder="A-12 (opcional)"
          icon="local_parking"
          value={form.vaga}
          onChange={(e) => set("vaga", e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">
          Status do usuário
        </p>
        <div className="flex gap-2 flex-wrap">
          {["ativo", "pendente", "inativo"].map((s) => (
            <button
              key={s}
              onClick={() => set("status", s)}
              className={`px-4 py-2 rounded-full text-sm font-semibold capitalize transition-all cursor-pointer border ${
                form.status === s
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-outline-variant/20 text-on-surface-variant hover:border-primary/30"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant ml-1">
          Logins vinculados
        </p>
        <div className="flex flex-wrap gap-2 mb-2">
          {form.logins.map((login) => (
            <span
              key={login}
              className="flex items-center gap-1.5 bg-surface-container-highest/60 rounded-full pl-3 pr-1.5 py-1.5 text-sm text-on-surface"
            >
              <Icone
                name="alternate_email"
                className="text-primary text-base"
              />
              {login}
              <button
                onClick={() => removerLogin(login)}
                disabled={form.logins.length === 1}
                className="ml-1 text-outline hover:text-error transition-colors disabled:opacity-30 cursor-pointer"
              >
                <Icone name="close" className="text-base" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Campo
              id="novo-login"
              placeholder="adicionar@email.com"
              icon="add"
              value={form.novoLogin}
              onChange={(e) => set("novoLogin", e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && (e.preventDefault(), adicionarLogin())
              }
            />
          </div>
          <button
            onClick={adicionarLogin}
            className="shrink-0 px-4 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 transition-all text-sm font-semibold cursor-pointer"
          >
            Adicionar
          </button>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Botao
          type="button"
          onClick={() =>
            onSalvar({
              bloco: form.bloco,
              apartamento: form.apartamento,
              vaga: form.vaga || null,
              status: form.status,
              logins: form.logins,
            })
          }
        >
          Salvar Alterações
          <Icone name="check" className="text-xl" />
        </Botao>
        <button
          onClick={onCancelar}
          className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
function FormNovoUsuario({ onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    bloco: "",
    apartamento: "",
    vaga: "",
  });

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (
      !form.nome.trim() ||
      !form.email.trim() ||
      !form.bloco.trim() ||
      !form.apartamento.trim()
    )
      return;
    onSalvar({
      nome: form.nome.trim(),
      email: form.email.trim(),
      bloco: form.bloco.trim(),
      apartamento: form.apartamento.trim(),
      vaga: form.vaga.trim() || null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nome + E-mail */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="novo-nome"
          label="Nome Completo *"
          placeholder="Ex: João Silva"
          icon="person"
          value={form.nome}
          onChange={(e) => set("nome", e.target.value)}
        />
        <Campo
          id="novo-email"
          label="E-mail *"
          type="email"
          placeholder="joao@mora.com"
          icon="mail"
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
      </div>

      {/* Bloco + Apt + Vaga */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Campo
          id="novo-bloco"
          label="Bloco *"
          placeholder="A"
          icon="domain"
          value={form.bloco}
          onChange={(e) => set("bloco", e.target.value)}
        />
        <Campo
          id="novo-apt"
          label="Apartamento *"
          placeholder="102"
          icon="meeting_room"
          value={form.apartamento}
          onChange={(e) => set("apartamento", e.target.value)}
        />
        <Campo
          id="novo-vaga"
          label="Vaga"
          placeholder="A-12 (opcional)"
          icon="local_parking"
          value={form.vaga}
          onChange={(e) => set("vaga", e.target.value)}
        />
      </div>

      {/* Info */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
        <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
        <span>
          O usuário será criado com status{" "}
          <strong className="text-secondary">pendente</strong>. O e-mail
          informado será o login inicial e poderá ter outros logins adicionados
          depois.
        </span>
      </div>

      {/* Ações */}
      <div className="flex gap-3 pt-1">
        <Botao type="submit">
          Criar Usuário
          <Icone name="person_add" className="text-xl" />
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
