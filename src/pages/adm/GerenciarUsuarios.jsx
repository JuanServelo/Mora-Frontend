// src/pages/adm/GerenciarUsuarios.jsx
import { useState, useEffect } from "react";
import api from "../../services/api";
import { blocoApi, apartamentoApi, vagaApi } from "../../services/estruturasApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

const STATUS_STYLE = {
  ativo: "bg-primary/10 text-primary",
  pendente: "bg-secondary/10 text-secondary",
  inativo: "bg-error/10 text-error",
};

// ─────────────────────────────────────────────
export function GerenciarUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [apartamentos, setApartamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    Promise.all([api.get("/api/users"), blocoApi.listar(), apartamentoApi.listar()])
      .then(([usersRes, blocosRes, aptsRes]) => {
        const lista = (usersRes.data.usuarios || []).map((u) => ({
          id: u.id,
          nome: u.nome,
          email: u.email,
          role: u.role,
          provider: u.provider,
          bloco: u.bloco ?? "",
          apartamento: u.apartamento ?? "",
          vaga: u.vaga ?? null,
          logins: [u.email],
          status: u.role === "admin" ? "ativo" : "ativo",
          createdAt: u.createdAt,
        }));
        setUsuarios(lista);
        setBlocos(blocosRes.data);
        setApartamentos(aptsRes.data);
      })
      .catch((err) => console.error("Erro ao carregar dados:", err))
      .finally(() => setCarregando(false));
  }, []);
  const [editando, setEditando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [criando, setCriando] = useState(false);
  const [aba, setAba] = useState("gerenciamento"); // gerenciamento | financeiro
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
  const { status: _st, logins: _lg, ...payload } = dados;

  try {
    console.log("PAYLOAD ENVIADO:", payload);

    const res = await api.put(`/api/users/${id}`, payload);

    console.log("RESPOSTA API:", res.data);

    const u = res.data.usuario;

    if (!u) {
      throw new Error("Resposta da API inválida");
    }

    setUsuarios((us) =>
      us.map((usr) =>
        usr.id === id
          ? {
              ...usr,
              nome: u.nome,
              email: u.email,
              role: u.role,
              bloco: u.bloco ?? "",
              apartamento: u.apartamento ?? "",
              vaga: u.vaga ?? null,
            }
          : usr
      )
    );

    setEditando(null);

  } catch (err) {
    console.error("Erro ao salvar edição:", err);
    throw err;
  }
}

  async function criarUsuario(dados) {
    try {
      const res = await api.post("/api/users", {
        nome: dados.nome,
        email: dados.email,
        senha: dados.senha,
        role: "user",
        bloco: dados.bloco || undefined,
        apartamento: dados.apartamento || undefined,
        vaga: dados.vaga || undefined,
      });
      const u = res.data.usuario;
      setUsuarios((us) => [
        {
          id: u.id,
          nome: u.nome,
          email: u.email,
          role: u.role,
          provider: u.provider,
          bloco: u.bloco ?? "",
          apartamento: u.apartamento ?? "",
          vaga: u.vaga ?? null,
          logins: [u.email],
          status: "ativo",
          createdAt: u.createdAt,
        },
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
                  blocos={blocos}
                  apartamentos={apartamentos}
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
                        { label: "Bloco", value: usuario.bloco || "—" },
                        { label: "Apt", value: usuario.apartamento || "—" },
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
                          blocos={blocos}
                          apartamentos={apartamentos}
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
        {aba === "financeiro" && <SecaoCondominio />}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
function SecaoCondominio() {
  return (
    <div className="glass-panel rounded-3xl p-8 lg:p-10 text-center max-w-2xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
        <Icone name="payments" className="text-secondary text-3xl" />
      </div>
      <h2 className="font-headline text-lg font-bold text-on-surface mb-2">Financeiro</h2>
      <p className="text-on-surface-variant text-sm leading-relaxed">
        Valores de condomínio e status de pagamento serão carregados aqui após integração com o módulo de cobranças. Esta sprint não utiliza valores financeiros fictícios no código do frontend.
      </p>
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
          { label: "Bloco", value: usuario.bloco || "—", icon: "domain" },
          {
            label: "Apartamento",
            value: usuario.apartamento || "—",
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
function FormEdicao({ usuario, blocos, apartamentos, onSalvar, onCancelar }) {
  const blocoInicial = blocos.find((b) => b.nome === usuario.bloco);
  const [blocoId, setBlocoId] = useState(blocoInicial?.id ?? "");
  const [aptId, setAptId] = useState(() => {
    if (!blocoInicial) return "";
    return apartamentos.find((a) => a.numero === usuario.apartamento && a.blocoId === blocoInicial.id)?.id ?? "";
  });
  const [vagas, setVagas] = useState([]);
  const [vagaId, setVagaId] = useState("");
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    status: usuario.status,
    novoLogin: "",
    logins: [...usuario.logins],
  });

  // Resolve initial selections when data loads after mount
  useEffect(() => {
    if (!blocoId && blocos.length > 0) {
      const b = blocos.find((b) => b.nome === usuario.bloco);
      if (b) setBlocoId(b.id);
    }
  }, [blocos]);

  useEffect(() => {
    if (blocoId && !aptId && apartamentos.length > 0) {
      const a = apartamentos.find((a) => a.numero === usuario.apartamento && a.blocoId === blocoId);
      if (a) setAptId(a.id);
    }
  }, [blocoId, apartamentos]);

  // Carrega vagas do apartamento selecionado
  useEffect(() => {
    if (!aptId) {
      setVagas([]);
      setVagaId("");
      return;
    }
    let cancelado = false;
    vagaApi.listarPorApartamento(aptId)
      .then((res) => {
        if (cancelado) return;
        const lista = res.data || [];
        setVagas(lista);
        const match = lista.find((v) => v.numero === usuario.vaga);
        setVagaId(match?.id ?? "");
      })
      .catch(() => {
        if (!cancelado) { setVagas([]); setVagaId(""); }
      });
    return () => { cancelado = true; };
  }, [aptId]);

  const aptsFiltrados = blocoId ? apartamentos.filter((a) => a.blocoId === blocoId) : apartamentos;

  function handleBlocoChange(newBlocoId) {
    setBlocoId(newBlocoId);
    setAptId("");
  }

  function handleAptChange(newAptId) {
    setAptId(newAptId);
    if (newAptId) {
      const apt = apartamentos.find((a) => a.id === newAptId);
      if (apt?.blocoId) setBlocoId(apt.blocoId);
    }
  }

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

  async function handleSalvar() {
  setErro(null);
  setSalvando(true);

  try {
    const blocoSel = blocos.find((b) => b.id === blocoId);
    const aptSel = apartamentos.find((a) => a.id === aptId);
    const vagaSel = vagas.find((v) => v.id === vagaId);

    const novoBloco = blocoSel?.nome ?? "";
    const novoApt = aptSel?.numero ?? "";
    const novaVaga = vagaSel?.numero ?? null;

    const houveMudanca =
      usuario.bloco !== novoBloco ||
      usuario.apartamento !== novoApt ||
      usuario.vaga !== novaVaga;

    if (!houveMudanca) {
      setErro("Nenhuma alteração foi realizada.");
      return;
    }

    console.log("ENVIANDO:", {
      bloco: novoBloco,
      apartamento: novoApt,
      vaga: novaVaga,
    });

    await onSalvar({
      bloco: novoBloco,
      apartamento: novoApt,
      vaga: novaVaga,
      status: form.status,
      logins: form.logins,
    });

  } catch (err) {
    console.error("ERRO AO SALVAR:", err);

    let mensagem = "Erro ao salvar.";

    if (err.response) {
      mensagem =
        err.response.data?.mensagem ||
        err.response.data?.message ||
        `Erro ${err.response.status}`;
    } else if (err.request) {
      mensagem = "Servidor não respondeu.";
    } else {
      mensagem = err.message;
    }

    setErro(mensagem);

  } finally {
    setSalvando(false);
  }
}

  const selectCls = "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className={labelCls}>Bloco</label>
          <select value={blocoId} onChange={(e) => handleBlocoChange(e.target.value)} className={selectCls}>
            <option value="">— Sem vínculo —</option>
            {blocos.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Apartamento</label>
          <select
            value={aptId}
            onChange={(e) => handleAptChange(e.target.value)}
            disabled={aptsFiltrados.length === 0}
            className={selectCls}
          >
            <option value="">— Selecione —</option>
            {aptsFiltrados.map((a) => (
              <option key={a.id} value={a.id}>Apto {a.numero}{a.andar != null ? ` · ${a.andar}º andar` : ""}</option>
            ))}
          </select>
          {blocoId && aptsFiltrados.length === 0 && (
            <p className="text-xs text-error ml-1">Nenhum apartamento neste bloco</p>
          )}
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Vaga</label>
          <select
            value={vagaId}
            onChange={(e) => setVagaId(e.target.value)}
            disabled={!aptId || vagas.length === 0}
            className={selectCls}
          >
            <option value="">— Sem vaga —</option>
            {vagas.filter((v) => v.ativa || v.id === vagaId).map((v) => (
              <option key={v.id} value={v.id}>
                Vaga {v.numero}{v.localizacao ? ` · ${v.localizacao}` : ""}
              </option>
            ))}
          </select>
          {aptId && vagas.length === 0 && (
            <p className="text-xs text-on-surface-variant ml-1">Nenhuma vaga neste apartamento</p>
          )}
        </div>
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

      {erro && (
        <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>
      )}

      <div className="flex gap-3 pt-2">
        <Botao
          type="button"
          onClick={handleSalvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar Alterações"}
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
function FormNovoUsuario({ blocos, apartamentos, onSalvar, onCancelar }) {
  const [form, setForm] = useState({ nome: "", email: "", senha: "" });
  const [blocoId, setBlocoId] = useState("");
  const [aptId, setAptId] = useState("");
  const [vagas, setVagas] = useState([]);
  const [vagaId, setVagaId] = useState("");

  useEffect(() => {
    if (!blocoId && blocos.length > 0) setBlocoId(blocos[0].id);
  }, [blocos]);

  // Carrega vagas quando apartamento muda
  useEffect(() => {
    if (!aptId) { setVagas([]); setVagaId(""); return; }
    let cancelado = false;
    vagaApi.listarPorApartamento(aptId)
      .then((res) => { if (!cancelado) { setVagas(res.data || []); setVagaId(""); } })
      .catch(() => { if (!cancelado) { setVagas([]); setVagaId(""); } });
    return () => { cancelado = true; };
  }, [aptId]);

  const aptsFiltrados = blocoId ? apartamentos.filter((a) => a.blocoId === blocoId) : apartamentos;

  function handleBlocoChange(newBlocoId) {
    setBlocoId(newBlocoId);
    setAptId("");
  }

  function handleAptChange(newAptId) {
    setAptId(newAptId);
    if (newAptId) {
      const apt = apartamentos.find((a) => a.id === newAptId);
      if (apt?.blocoId) setBlocoId(apt.blocoId);
    }
  }

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || !form.senha.trim() || form.senha.trim().length < 6 || !blocoId || !aptId)
      return;
    const blocoSel = blocos.find((b) => b.id === blocoId);
    const aptSel = apartamentos.find((a) => a.id === aptId);
    const vagaSel = vagas.find((v) => v.id === vagaId);
    onSalvar({
      nome: form.nome.trim(),
      email: form.email.trim(),
      senha: form.senha.trim(),
      bloco: blocoSel?.nome ?? "",
      apartamento: aptSel?.numero ?? "",
      vaga: vagaSel?.numero ?? null,
    });
  }

  const selectCls = "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nome + E-mail + Senha */}
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
        <Campo
          id="novo-senha"
          label="Senha inicial *"
          type="password"
          placeholder="Mínimo 6 caracteres"
          icon="lock"
          value={form.senha}
          onChange={(e) => set("senha", e.target.value)}
          autoComplete="new-password"
        />
      </div>

      {/* Bloco + Apt + Vaga */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className={labelCls}>Bloco *</label>
          <select value={blocoId} onChange={(e) => handleBlocoChange(e.target.value)} required className={selectCls}>
            <option value="">— Selecione o bloco —</option>
            {blocos.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Apartamento *</label>
          <select
            value={aptId}
            onChange={(e) => handleAptChange(e.target.value)}
            required
            disabled={aptsFiltrados.length === 0}
            className={selectCls}
          >
            <option value="">— Selecione o apt —</option>
            {aptsFiltrados.map((a) => (
              <option key={a.id} value={a.id}>Apto {a.numero}{a.andar != null ? ` · ${a.andar}º andar` : ""}</option>
            ))}
          </select>
          {blocoId && aptsFiltrados.length === 0 && (
            <p className="text-xs text-error ml-1">Nenhum apartamento neste bloco</p>
          )}
        </div>
        <div className="space-y-2">
          <label className={labelCls}>Vaga</label>
          <select
            value={vagaId}
            onChange={(e) => setVagaId(e.target.value)}
            disabled={!aptId || vagas.length === 0}
            className={selectCls}
          >
            <option value="">— Sem vaga —</option>
            {vagas.filter((v) => v.ativa).map((v) => (
              <option key={v.id} value={v.id}>
                Vaga {v.numero}{v.localizacao ? ` · ${v.localizacao}` : ""}
              </option>
            ))}
          </select>
          {aptId && vagas.length === 0 && (
            <p className="text-xs text-on-surface-variant ml-1">Nenhuma vaga neste apartamento</p>
          )}
        </div>
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
