import { useEffect, useState, useCallback } from "react";
import { Icone } from "../../components/icones/Icone";
import { chaveApi } from "../../services/portariaApi";
import { acessoApi } from "../../services/acessoApi";
import { useToast } from "../../contexts/ToastContext";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR");
}
function fmtHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
function fmtDataHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function hoje() {
  return new Date().toISOString().slice(0, 10);
}

// ── Modal: retirar chave ──────────────────────────────────────────────────────

function ModalRetirar({ chave, onClose, onSalvo }) {
  const [tipo, setTipo] = useState("MORADOR");
  const [responsavelId, setResponsavelId] = useState("");
  const [opcoes, setOpcoes] = useState([]);
  const [loadingOpcoes, setLoadingOpcoes] = useState(false);
  const [erroOpcoes, setErroOpcoes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const toast = useToast();

  useEffect(() => {
    setResponsavelId("");
    setOpcoes([]);
    setErroOpcoes(null);
    setLoadingOpcoes(true);
    acessoApi.listarUsuariosCondominio()
      .then((res) => {
        const todos = res.data?.usuarios || [];
        const filtrados = todos.filter((u) => {
          if (u.status !== "active") return false;
          if (tipo === "MORADOR") return u.perfil === "MORADOR";
          return u.perfil === "PORTEIRO" || u.perfil === "GERENTE" || u.perfil === "FUNCIONARIO";
        });
        const lista = filtrados.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        setOpcoes(lista);
      })
      .catch((err) => {
        console.error("Erro ao carregar usuários:", err);
        setErroOpcoes(err?.response?.data?.mensagem || err?.response?.data?.message || "Não foi possível carregar a lista.");
      })
      .finally(() => setLoadingOpcoes(false));
  }, [tipo]);

  async function confirmar(e) {
    e.preventDefault();
    if (!responsavelId) { setErro("Selecione o responsável."); return; }
    const selecionado = opcoes.find((o) => o.id === responsavelId);
    const nomeResponsavel = selecionado?.nome || "";
    setLoading(true);
    try {
      await chaveApi.retirar(chave.id, responsavelId, tipo, nomeResponsavel);
      toast.success(`Retirada de "${chave.nomeChave}" registrada.`);
      onSalvo();
    } catch (err) {
      setErro(err?.response?.data?.message || "Não foi possível registrar a retirada.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-md border border-outline-variant/20 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">Registrar Retirada</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          Chave: <span className="font-semibold text-on-surface">{chave.nomeChave}</span>
          {chave.localNome && <span className="text-xs ml-1 text-on-surface-variant/60">· {chave.localNome}</span>}
        </p>
        <form onSubmit={confirmar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              Tipo de responsável
            </label>
            <div className="flex gap-2">
              {["MORADOR", "FUNCIONARIO"].map((t) => (
                <button key={t} type="button"
                  onClick={() => { setTipo(t); setErro(null); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    tipo === t
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/20"
                  }`}>
                  {t === "MORADOR" ? "Morador" : "Funcionário"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              {tipo === "MORADOR" ? "Morador" : "Funcionário"}
            </label>
            {loadingOpcoes ? (
              <p className="text-sm text-on-surface-variant/60 py-2 italic">
                {tipo === "MORADOR" ? "Carregando moradores…" : "Carregando funcionários…"}
              </p>
            ) : erroOpcoes ? (
              <p className="text-red-500 text-xs py-2">{erroOpcoes}</p>
            ) : opcoes.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60 py-2">
                {tipo === "MORADOR" ? "Nenhum morador cadastrado." : "Nenhum funcionário cadastrado."}
              </p>
            ) : (
              <select value={responsavelId} onChange={(e) => { setResponsavelId(e.target.value); setErro(null); }}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">Selecione…</option>
                {opcoes.map((o) => {
                  const loc = [o.bloco, o.apartamento].filter(Boolean).join(" / ");
                  const label = loc ? `${o.nome} — ${loc}` : o.nome;
                  return <option key={o.id} value={o.id}>{label}</option>;
                })}
              </select>
            )}
            {erro && <p className="text-red-500 text-xs mt-1">{erro}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-semibold text-on-surface-variant border border-outline-variant/30 hover:bg-surface-variant/20 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={loading || !responsavelId}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-amber-500 text-white hover:opacity-90 transition-opacity disabled:opacity-60">
              {loading ? "Registrando…" : "Confirmar Retirada"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Aba 1: Cadastro ───────────────────────────────────────────────────────────

function AbaCadastro({ chaves, onAtualizar }) {
  const [locais, setLocais] = useState([]);
  const [form, setForm] = useState({ localId: "", tipoLocal: "", nomeChave: "", descricao: "" });
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalRetirar, setModalRetirar] = useState(null);
  const toast = useToast();

  useEffect(() => {
    chaveApi.listarLocais()
      .then((res) => setLocais(res.data || []))
      .catch(() => {});
  }, []);

  function onLocalChange(e) {
    const localId = e.target.value;
    if (!localId) { setForm((f) => ({ ...f, localId: "", tipoLocal: "" })); return; }
    const local = locais.find((l) => l.id === localId);
    setForm((f) => ({ ...f, localId, tipoLocal: local?.tipo || "" }));
    setErro(null);
  }

  async function cadastrar(e) {
    e.preventDefault();
    if (!form.localId) { setErro("Selecione o local."); return; }
    if (!form.nomeChave.trim()) { setErro("Informe o nome da chave."); return; }
    setLoading(true);
    try {
      await chaveApi.cadastrar({
        localId: form.localId,
        tipoLocal: form.tipoLocal,
        nomeChave: form.nomeChave.trim(),
        descricao: form.descricao.trim() || null,
      });
      toast.success("Chave cadastrada.");
      setForm({ localId: "", tipoLocal: "", nomeChave: "", descricao: "" });
      onAtualizar();
    } catch (err) {
      setErro(err?.response?.data?.message || "Não foi possível cadastrar a chave.");
    } finally {
      setLoading(false);
    }
  }

  async function deletar(chave) {
    if (!window.confirm(`Excluir a chave "${chave.nomeChave}"?`)) return;
    try {
      await chaveApi.deletar(chave.id);
      toast.success("Chave excluída.");
      onAtualizar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Não foi possível excluir a chave.");
    }
  }

  async function devolver(chave) {
    try {
      await chaveApi.devolver(chave.id);
      toast.success(`Devolução de "${chave.nomeChave}" registrada.`);
      onAtualizar();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao registrar devolução.");
    }
  }

  const blocos = locais.filter((l) => l.tipo === "BLOCO");
  const areas = locais.filter((l) => l.tipo === "AREA_COMUM");

  return (
    <div className="space-y-8">
      {/* Formulário */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/15">
        <h2 className="font-headline font-bold text-on-surface text-base mb-4">Nova Chave</h2>
        <form onSubmit={cadastrar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Local <span className="text-red-500">*</span>
              </label>
              <select value={form.localId} onChange={onLocalChange}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">Selecione o local…</option>
                {blocos.length > 0 && (
                  <optgroup label="Blocos">
                    {blocos.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </optgroup>
                )}
                {areas.length > 0 && (
                  <optgroup label="Áreas Comuns">
                    {areas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Nome da chave <span className="text-red-500">*</span>
              </label>
              <input value={form.nomeChave} onChange={(e) => { setForm((f) => ({ ...f, nomeChave: e.target.value })); setErro(null); }}
                placeholder="Ex: Original, Cópia 1, Reserva…"
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Descrição (opcional)
              </label>
              <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder="Observações adicionais…"
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
            </div>
          </div>

          {erro && (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-500 text-sm px-4 py-2.5 rounded-xl">
              <Icone name="error" className="text-base" />
              {erro}
            </div>
          )}

          <div className="flex justify-end">
            <button type="submit" disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60">
              <Icone name="add" className="text-base" />
              {loading ? "Cadastrando…" : "Cadastrar Chave"}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de chaves */}
      <div>
        <h2 className="font-headline font-bold text-on-surface text-base mb-3">
          Chaves do Condomínio
          <span className="ml-2 text-xs font-normal text-on-surface-variant">({chaves.length})</span>
        </h2>
        {chaves.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15">
            <Icone name="key" className="text-on-surface-variant/30 text-4xl mb-2" />
            <p className="text-sm text-on-surface-variant">Nenhuma chave cadastrada.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {chaves.map((c) => (
              <div key={c.id} className="glass-panel rounded-2xl p-4 border border-outline-variant/15 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icone name="key" className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-on-surface text-sm truncate">{c.nomeChave}</p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {c.tipoLocal === "BLOCO" ? "Bloco" : "Área Comum"} · {c.localNome || "—"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    c.disponivel
                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}>
                    <Icone name={c.disponivel ? "check_circle" : "key_off"} className="text-sm" />
                    {c.disponivel ? "Disponível" : "Retirada"}
                  </span>
                </div>

                {!c.disponivel && c.possuidorNome && (
                  <div className="bg-amber-500/8 rounded-xl px-3 py-2 text-xs text-on-surface-variant space-y-0.5">
                    <p><span className="font-semibold">Com:</span> {c.possuidorNome} ({c.possuidorPerfil})</p>
                    <p><span className="font-semibold">Desde:</span> {fmtDataHora(c.retiradaEm)}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {c.disponivel ? (
                    <>
                      <button onClick={() => setModalRetirar(c)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors">
                        <Icone name="key_off" className="text-sm" />Retirar
                      </button>
                      <button onClick={() => deletar(c)}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title="Excluir">
                        <Icone name="delete" className="text-sm" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => devolver(c)}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 transition-colors">
                      <Icone name="check_circle" className="text-sm" />Registrar Devolução
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalRetirar && (
        <ModalRetirar
          chave={modalRetirar}
          onClose={() => setModalRetirar(null)}
          onSalvo={() => { setModalRetirar(null); onAtualizar(); }}
        />
      )}
    </div>
  );
}

// ── Aba 2: Histórico ──────────────────────────────────────────────────────────

const PERFIS_OPCOES = ["Morador", "Funcionário"];

function AbaHistorico({ chaves, onAtualizar }) {
  const [chaveId, setChaveId] = useState("");
  const [chaveAtual, setChaveAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: hoje(),
    dataFim: hoje(),
    quemRetirou: "",
    perfil: "",
    status: "",
  });
  const [erroFiltro, setErroFiltro] = useState(null);
  const toast = useToast();

  const carregarHistorico = useCallback(async (id, f) => {
    if (!id) return;
    const params = {};
    if (f.dataInicio) params.dataInicio = f.dataInicio;
    if (f.dataFim) params.dataFim = f.dataFim;
    if (f.quemRetirou) params.quemRetirou = f.quemRetirou;
    if (f.perfil) params.perfil = f.perfil;
    if (f.status) params.status = f.status;

    setLoadingHist(true);
    try {
      const res = await chaveApi.historico(id, params);
      setHistorico(res.data || []);
    } catch (err) {
      const msg = err?.response?.data?.message;
      if (msg) setErroFiltro(msg);
      else toast.error("Não foi possível carregar o histórico.");
      setHistorico([]);
    } finally {
      setLoadingHist(false);
    }
  }, []);

  useEffect(() => {
    if (!chaveId) { setHistorico([]); setChaveAtual(null); return; }
    const c = chaves.find((x) => x.id === chaveId) || null;
    setChaveAtual(c);
    setErroFiltro(null);
    carregarHistorico(chaveId, filtros);
  }, [chaveId, chaves]);

  function aplicarFiltros(e) {
    e.preventDefault();
    setErroFiltro(null);
    carregarHistorico(chaveId, filtros);
  }

  function limparFiltros() {
    const pad = { dataInicio: hoje(), dataFim: hoje(), quemRetirou: "", perfil: "", status: "" };
    setFiltros(pad);
    setErroFiltro(null);
    carregarHistorico(chaveId, pad);
  }

  function setF(key, val) {
    setFiltros((f) => ({ ...f, [key]: val }));
  }

  async function devolver(mov) {
    try {
      await chaveApi.devolver(chaveId);
      toast.success("Devolução registrada.");
      onAtualizar();
      carregarHistorico(chaveId, filtros);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Erro ao registrar devolução.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Seletor de chave (RN-06) */}
      <div className="glass-panel rounded-2xl p-5 border border-outline-variant/15">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          Selecionar Chave
        </label>
        <select value={chaveId} onChange={(e) => setChaveId(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">Selecione uma chave…</option>
          {chaves.map((c) => (
            <option key={c.id} value={c.id}>
              {c.localNome ? `${c.localNome} — ` : ""}{c.nomeChave}
              {!c.disponivel ? " 🔒" : ""}
            </option>
          ))}
        </select>
      </div>

      {!chaveId ? (
        <div className="glass-panel rounded-2xl p-10 flex flex-col items-center text-center gap-3 border border-outline-variant/15">
          <Icone name="manage_search" className="text-on-surface-variant/30 text-5xl" />
          <p className="font-semibold text-on-surface">Selecione uma chave acima</p>
          <p className="text-sm text-on-surface-variant">O status atual e as movimentações serão exibidos aqui.</p>
        </div>
      ) : (
        <>
          {/* Status atual (RN-07) */}
          {chaveAtual && (
            <div className={`rounded-2xl px-5 py-4 border flex items-center gap-3 ${
              chaveAtual.disponivel
                ? "bg-green-500/10 border-green-500/20"
                : "bg-amber-500/10 border-amber-500/20"
            }`}>
              <Icone name={chaveAtual.disponivel ? "check_circle" : "key_off"}
                className={`text-2xl ${chaveAtual.disponivel ? "text-green-500" : "text-amber-500"}`} />
              <div>
                <p className={`font-semibold text-sm ${chaveAtual.disponivel ? "text-green-700 dark:text-green-300" : "text-amber-700 dark:text-amber-300"}`}>
                  {chaveAtual.disponivel
                    ? "Disponível"
                    : `Em posse de ${chaveAtual.possuidorNome || "—"} (${chaveAtual.possuidorPerfil || "—"}) desde ${fmtDataHora(chaveAtual.retiradaEm)}`
                  }
                </p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {chaveAtual.localNome} · {chaveAtual.nomeChave}
                </p>
              </div>
            </div>
          )}

          {/* Filtros (RN-09, RN-10) */}
          <form onSubmit={aplicarFiltros} className="glass-panel rounded-2xl p-5 border border-outline-variant/15 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Filtros</h3>
              <button type="button" onClick={limparFiltros}
                className="text-xs text-primary font-semibold hover:underline">
                Limpar filtros
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Data inicial</label>
                <input type="date" value={filtros.dataInicio} onChange={(e) => setF("dataInicio", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Data final</label>
                <input type="date" value={filtros.dataFim} onChange={(e) => setF("dataFim", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Quem retirou</label>
                <input type="text" value={filtros.quemRetirou} onChange={(e) => setF("quemRetirou", e.target.value)}
                  placeholder="Busca parcial…"
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Perfil</label>
                <select value={filtros.perfil} onChange={(e) => setF("perfil", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                  <option value="">Todos</option>
                  {PERFIS_OPCOES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">Status</label>
                <select value={filtros.status} onChange={(e) => setF("status", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                  <option value="">Todos</option>
                  <option value="EM_ABERTO">Em aberto</option>
                  <option value="DEVOLVIDA">Devolvida</option>
                </select>
              </div>
            </div>
            {erroFiltro && (
              <p className="text-red-500 text-xs">{erroFiltro}</p>
            )}
            <div className="flex justify-end">
              <button type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-semibold hover:opacity-90 transition-opacity">
                <Icone name="filter_list" className="text-sm" />
                Aplicar
              </button>
            </div>
          </form>

          {/* Tabela de histórico (RN-08) */}
          {loadingHist ? (
            <div className="flex items-center justify-center py-10 text-on-surface-variant gap-2">
              <Icone name="sync" className="text-2xl animate-spin" />Carregando…
            </div>
          ) : historico.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15">
              <Icone name="inbox" className="text-on-surface-variant/30 text-4xl mb-2" />
              <p className="text-sm text-on-surface-variant">Nenhuma movimentação encontrada para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                      {["Quem retirou", "Perfil", "Data retirada", "Hora ret.", "Data devolução", "Hora dev.", "Status", "Registrado por", ""].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historico.map((mov, i) => {
                      const emAberto = mov.status === "EM_ABERTO";
                      return (
                        <tr key={mov.id}
                          className={`border-b border-outline-variant/10 transition-colors hover:bg-surface-variant/10 ${
                            emAberto ? "bg-amber-500/5" : ""
                          }`}>
                          <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{mov.nomeResponsavel || "—"}</td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{mov.perfilResponsavel || "—"}</td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtData(mov.dataRetirada)}</td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtHora(mov.dataRetirada)}</td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtData(mov.dataDevolucao)}</td>
                          <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtHora(mov.dataDevolucao)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                              emAberto
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-green-500/15 text-green-600 dark:text-green-400"
                            }`}>
                              {emAberto ? "Em aberto" : "Devolvida"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">{mov.registradoPorNome || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {emAberto && (
                              <button onClick={() => devolver(mov)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 transition-colors">
                                <Icone name="check_circle" className="text-sm" />
                                Devolver
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export function Chaves() {
  const [aba, setAba] = useState("cadastro");
  const [chaves, setChaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chaveApi.listar();
      setChaves(res.data || []);
    } catch {
      toast.error("Não foi possível carregar as chaves.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const disponiveis = chaves.filter((c) => c.disponivel).length;
  const retiradas = chaves.filter((c) => !c.disponivel).length;

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Portaria
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Controle de Chaves
            </span>
          </h1>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", valor: chaves.length, icon: "key", cls: "text-primary bg-primary/10" },
            { label: "Disponíveis", valor: disponiveis, icon: "check_circle", cls: "text-green-600 dark:text-green-400 bg-green-500/10" },
            { label: "Retiradas", valor: retiradas, icon: "key_off", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
          ].map((s) => (
            <div key={s.label} className="glass-panel rounded-2xl p-4 border border-outline-variant/15 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl ${s.cls} flex items-center justify-center shrink-0`}>
                <Icone name={s.icon} className="text-lg" />
              </div>
              <div>
                <p className="text-xl font-bold text-on-surface leading-none">{s.valor}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Abas */}
        <div className="flex gap-1 border-b border-outline-variant/20">
          {[
            { key: "cadastro", label: "Cadastro de Chaves", icon: "add_circle" },
            { key: "historico", label: "Histórico", icon: "history" },
          ].map((t) => (
            <button key={t.key} onClick={() => setAba(t.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                aba === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}>
              <Icone name={t.icon} className="text-base" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-on-surface-variant gap-2">
            <Icone name="sync" className="text-3xl animate-spin" />
            Carregando…
          </div>
        ) : aba === "cadastro" ? (
          <AbaCadastro chaves={chaves} onAtualizar={carregar} />
        ) : (
          <AbaHistorico chaves={chaves} onAtualizar={carregar} />
        )}

      </div>
    </div>
  );
}
