// src/pages/adm/GerenciarVagas.jsx
import { useState, useEffect } from "react";
import { vagaApi, apartamentoApi, blocoApi } from "../../services/estruturasApi";
import { condominiosApi } from "../../services/condominiosApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS } from "../../utils/perfis";

const statusConfig = {
  true: {
    label: "Ativa",
    color: "bg-primary/10 text-primary",
    icon: "check_circle",
  },
  false: {
    label: "Inativa",
    color: "bg-error/10 text-error",
    icon: "block",
  },
};

const selectCls =
  "w-full appearance-none bg-surface-container-highest/50 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all cursor-pointer";

export function GerenciarVagas() {
  const { usuario } = useAuth();
  const isGerente = [PERFIS.CONTRACTING_PROPERTY_MANAGER, PERFIS.CONTRACTING_SYNDIC].includes(
    usuario?.perfil,
  );

  const [condominios, setCondominios] = useState([]);
  const [condominioId, setCondominioId] = useState(null);
  const [vagas, setVagas] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [apartamentos, setApartamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({
    numero: "",
    localizacao: "",
    tipo: "",
    blocoId: "",
    apartamentoId: "",
  });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isGerente) {
      condominiosApi
        .listar()
        .then((res) => {
          const lista = (res.data.condominios || []).filter((c) => c.status === "active");
          setCondominios(lista);
          if (lista.length > 0) setCondominioId(lista[0].id);
          else setCondominioId(usuario?.condominioId ?? null);
        })
        .catch(() => setCondominioId(usuario?.condominioId ?? null));
    } else {
      setCondominioId(usuario?.condominioId ?? null);
    }
  }, [isGerente, usuario]);

  useEffect(() => {
    if (!condominioId) {
      setCarregando(false);
      return;
    }
    carregarDados(condominioId);
  }, [condominioId]);

  async function carregarDados(condId) {
    setCarregando(true);
    try {
      const [vagasRes, aptsRes, blocosRes] = await Promise.all([
        vagaApi.listarTodas(),
        apartamentoApi.listarTodos(condId),
        blocoApi.listarTodos(condId),
      ]);
      const aptIds = new Set((aptsRes.data || []).map((a) => a.id));
      setVagas((vagasRes.data || []).filter((v) => !v.apartamentoId || aptIds.has(v.apartamentoId)));
      setApartamentos(aptsRes.data || []);
      setBlocos(blocosRes.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setCarregando(false);
    }
  }

  const aptsDoBloco = form.blocoId
    ? apartamentos.filter((a) => String(a.blocoId) === String(form.blocoId))
    : [];

  function handleForm(e) {
    const { name, value } = e.target;
    if (name === "blocoId") {
      setForm((f) => ({ ...f, blocoId: value, apartamentoId: "" }));
      return;
    }
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function criarVaga(e) {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const { apartamentoId, blocoId: _bloco, ...vagaData } = form;
      const res = await vagaApi.cadastrar(vagaData, apartamentoId || undefined);
      setVagas((prev) => [res.data, ...prev]);
      setCriando(false);
      setForm({ numero: "", localizacao: "", tipo: "", blocoId: "", apartamentoId: "" });
    } catch (err) {
      setErro(
        err.response?.data?.mensagem ??
          err.response?.data?.message ??
          "Erro ao cadastrar vaga. Tente novamente.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function mudarStatus(id, novoStatus) {
    try {
      if (novoStatus) await vagaApi.ativar(id);
      else await vagaApi.desativar(id);
      setVagas((prev) => prev.map((v) => (v.id === id ? { ...v, ativa: novoStatus } : v)));
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  }

  const vagasFiltradas = vagas
    .filter((v) => filtroStatus === "TODOS" || (filtroStatus === "ativa" ? v.ativa : !v.ativa))
    .filter(
      (v) =>
        busca === "" ||
        v.numero.toLowerCase().includes(busca.toLowerCase()) ||
        v.localizacao?.toLowerCase().includes(busca.toLowerCase()),
    );

  const contadores = {
    ativa: vagas.filter((v) => v.ativa).length,
    inativa: vagas.filter((v) => !v.ativa).length,
  };

  if (!condominioId) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-6 flex items-center justify-center">
        <div className="glass-panel rounded-3xl p-10 text-center max-w-md">
          <Icone name="domain" className="text-primary text-4xl mb-4" />
          <h2 className="font-headline text-xl font-bold text-on-surface mb-2">Nenhum cliente encontrado</h2>
          <p className="text-on-surface-variant text-sm">
            Crie um cliente antes de gerenciar vagas de garagem.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              Painel Administrativo
            </p>
            <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
              Vagas de{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Garagem
              </span>
            </h1>
          </div>
          {!criando && (
            <Botao onClick={() => { setCriando(true); setErro(null); }}>
              <span className="flex items-center gap-2">
                <Icone name="add" className="text-lg" /> Nova Vaga
              </span>
            </Botao>
          )}
        </header>

        {isGerente && condominios.length > 1 && (
          <div className="glass-panel rounded-2xl p-4 flex items-center gap-4">
            <Icone name="domain" className="text-primary" />
            <select
              value={condominioId}
              onChange={(e) => setCondominioId(e.target.value)}
              className={selectCls}
            >
              {condominios.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          {[
            { id: "ativa", label: "Ativas", color: "primary", icon: "check_circle" },
            { id: "inativa", label: "Inativas", color: "error", icon: "block" },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => setFiltroStatus(filtroStatus === s.id ? "TODOS" : s.id)}
              className={`glass-panel rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] text-left ${
                filtroStatus === s.id ? "ring-2 ring-primary/40" : ""
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${s.color}/10 text-${s.color}`}>
                <Icone name={s.icon} className="text-lg" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-on-surface font-headline">
                  {contadores[s.id] ?? 0}
                </p>
                <p className="text-xs text-on-surface-variant leading-tight">{s.label}</p>
              </div>
            </button>
          ))}
        </div>

        {criando && (
          <div className="glass-panel rounded-2xl p-6 space-y-5">
            <h2 className="font-headline text-xl font-bold text-on-surface">Cadastrar Nova Vaga</h2>
            <form onSubmit={criarVaga} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo
                  label="Número da vaga"
                  name="numero"
                  value={form.numero}
                  onChange={handleForm}
                  placeholder="Ex: 12"
                  required
                />
                <Campo
                  label="Localização"
                  name="localizacao"
                  value={form.localizacao}
                  onChange={handleForm}
                  placeholder="Ex: Setor A - Térreo"
                />
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                    Tipo
                  </label>
                  <select name="tipo" value={form.tipo} onChange={handleForm} className={selectCls}>
                    <option value="">Selecione um tipo</option>
                    <option value="Coberta">Coberta</option>
                    <option value="Descoberta">Descoberta</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                    Bloco
                  </label>
                  <select name="blocoId" value={form.blocoId} onChange={handleForm} className={selectCls}>
                    <option value="">Selecione o bloco</option>
                    {blocos.map((b) => (
                      <option key={b.id} value={b.id}>{b.nome}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                    Apartamento
                  </label>
                  <select
                    name="apartamentoId"
                    value={form.apartamentoId}
                    onChange={handleForm}
                    disabled={!form.blocoId}
                    className={`${selectCls} disabled:opacity-40`}
                  >
                    <option value="">
                      {form.blocoId ? "Selecione o apartamento" : "Escolha um bloco primeiro"}
                    </option>
                    {aptsDoBloco.map((apt) => (
                      <option key={apt.id} value={apt.id}>
                        Apt {apt.numero}{apt.blocoNome ? ` · ${apt.blocoNome}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {erro && (
                <p className="text-sm text-error bg-error/10 rounded-xl px-4 py-2">{erro}</p>
              )}
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => { setCriando(false); setErro(null); }}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <Botao type="submit" disabled={salvando}>
                  {salvando ? "Cadastrando..." : "Cadastrar vaga"}
                </Botao>
              </div>
            </form>
          </div>
        )}

        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Icone
              name="search"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none"
            />
            <input
              type="text"
              placeholder="Buscar por identificador ou localização..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-surface-container-highest/40 border border-white/10 rounded-xl text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {vagasFiltradas.map((vaga) => {
            const cfg = statusConfig[vaga.ativa];
            const apartamento = apartamentos.find((apt) => apt.id === vaga.apartamentoId);
            return (
              <div key={vaga.id} className="glass-panel rounded-2xl p-5 space-y-4 flex flex-col">
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                    <Icone name={cfg.icon} className="text-xl" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-on-surface text-sm leading-tight">Vaga {vaga.numero}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{vaga.localizacao}</p>
                  {vaga.tipo && <p className="text-xs text-on-surface-variant">{vaga.tipo}</p>}
                  {apartamento ? (
                    <p className="text-xs text-primary mt-2 font-semibold">
                      <Icone name="home" className="text-xs mr-1 inline" />
                      Apt {apartamento.numero}
                      {apartamento.blocoNome ? ` · ${apartamento.blocoNome}` : ""}
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface-variant mt-2 opacity-50">Sem apartamento</p>
                  )}
                </div>
                <div className="mt-auto pt-2 border-t border-white/5">
                  <button
                    onClick={() => mudarStatus(vaga.id, !vaga.ativa)}
                    className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer hover:opacity-80 ${statusConfig[!vaga.ativa].color} border-current/10`}
                  >
                    {statusConfig[!vaga.ativa].label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {vagasFiltradas.length === 0 && !carregando && (
          <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="local_parking" className="text-5xl opacity-30" />
            <p className="text-sm">Nenhuma vaga encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
