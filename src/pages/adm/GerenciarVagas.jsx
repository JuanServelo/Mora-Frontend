// src/pages/adm/GerenciarVagas.jsx
import { useState, useEffect } from "react";
import { vagaApi, apartamentoApi } from "../../services/estruturasApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

// ─── enums / helpers ────────────────────────────────
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

// ════════════════════════════════════════════
export function GerenciarVagas() {
  const [vagas, setVagas] = useState([]);
  const [apartamentos, setApartamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ numero: "", localizacao: "", tipo: "", apartamentoId: "" });
  const [erro, setErro] = useState(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      const [vagasRes, aptsRes] = await Promise.all([
        vagaApi.listarTodas(),
        apartamentoApi.listarTodos(),
      ]);
      setVagas(vagasRes.data || []);
      setApartamentos(aptsRes.data || []);
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setCarregando(false);
    }
  };

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const criarVaga = async (e) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const { apartamentoId, ...vagaData } = form;
      const res = await vagaApi.cadastrar(vagaData, apartamentoId || undefined);
      setVagas((prev) => [res.data, ...prev]);
      setCriando(false);
      setForm({ numero: "", localizacao: "", tipo: "", apartamentoId: "" });
    } catch (err) {
      setErro(err.response?.data?.mensagem ?? err.response?.data?.message ?? "Erro ao cadastrar vaga. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const mudarStatus = async (id, novoStatus) => {
    try {
      if (novoStatus) {
        await vagaApi.ativar(id);
      } else {
        await vagaApi.desativar(id);
      }
      setVagas((prev) =>
        prev.map((v) => (v.id === id ? { ...v, ativa: novoStatus } : v))
      );
    } catch (err) {
      console.error("Erro ao atualizar status:", err);
    }
  };

  const vagasFiltradas = vagas
    .filter((v) => filtroStatus === "TODOS" || (filtroStatus === "ativa" ? v.ativa : !v.ativa))
    .filter(
      (v) =>
        busca === "" ||
        v.numero.toLowerCase().includes(busca.toLowerCase()) ||
        v.localizacao?.toLowerCase().includes(busca.toLowerCase())
    );

  const contadores = {
    ativa: vagas.filter((v) => v.ativa).length,
    inativa: vagas.filter((v) => !v.ativa).length,
  };

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

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          {[
            { id: "ativa", label: "Ativas", color: "primary", icon: "check_circle" },
            { id: "inativa", label: "Inativas", color: "error", icon: "block" },
          ].map((s) => {
            return (
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
            );
          })}
        </div>

        {/* Formulário criar */}
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
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                    Tipo
                  </label>
                  <select
                    name="tipo"
                    value={form.tipo}
                    onChange={handleForm}
                    className="appearance-none bg-surface-container-highest/50 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Selecione um tipo</option>
                    <option value="Coberta">Coberta</option>
                    <option value="Descoberta">Descoberta</option>
                  </select>
                  <Icone name="expand_more" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                    Apartamento (opcional)
                  </label>
                  <select
                    name="apartamentoId"
                    value={form.apartamentoId}
                    onChange={handleForm}
                    className="appearance-none bg-surface-container-highest/50 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all cursor-pointer"
                  >
                    <option value="">Nenhum apartamento</option>
                    {apartamentos.map((apt) => (
                      <option key={apt.id} value={apt.id}>{apt.numero} - Bloco {apt.blocoNome}</option>
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

        {/* Busca */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 max-w-sm">
            <Icone name="search" className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por identificador ou unidade..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-surface-container-highest/40 border border-white/10 rounded-xl text-on-surface placeholder:text-outline-variant focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all text-sm"
            />
          </div>
          {filtroStatus !== "TODOS" && (
            <button
              onClick={() => setFiltroStatus("TODOS")}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl bg-surface-container-highest/40 text-on-surface-variant hover:text-on-surface transition-all cursor-pointer"
            >
              <span className={`w-2 h-2 rounded-full ${statusConfig[filtroStatus].color.split(" ")[0]}`} />
              {statusConfig[filtroStatus].label}
              <Icone name="close" className="text-sm" />
            </button>
          )}
        </div>

        {/* Grid de vagas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {vagasFiltradas.map((vaga) => {
            const cfg = statusConfig[vaga.ativa];
            const apartamento = apartamentos.find(apt => apt.id === vaga.apartamentoId);
            return (
              <div key={vaga.id} className="glass-panel rounded-2xl p-5 space-y-4 flex flex-col">
                {/* Ícone + Status */}
                <div className="flex items-start justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${cfg.color}`}>
                    <Icone name={cfg.icon} className="text-xl" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${cfg.color}`}>
                    {cfg.label}
                  </span>
                </div>

                {/* Infos */}
                <div>
                  <p className="font-semibold text-on-surface text-sm leading-tight">Vaga {vaga.numero}</p>
                  <p className="text-xs text-on-surface-variant mt-1">{vaga.localizacao}</p>
                  {vaga.tipo && (
                    <p className="text-xs text-on-surface-variant">{vaga.tipo}</p>
                  )}
                  {apartamento ? (
                    <p className="text-xs text-primary mt-2 font-semibold">
                      <Icone name="home" className="text-xs mr-1 inline" />
                      Apt {apartamento.numero}
                    </p>
                  ) : (
                    <p className="text-xs text-on-surface-variant mt-2 opacity-50">Sem apartamento</p>
                  )}
                </div>

                {/* Ações de status */}
                <div className="mt-auto pt-2 border-t border-white/5">
                  <p className="text-xs text-on-surface-variant mb-2">Mudar status:</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => mudarStatus(vaga.id, !vaga.ativa)}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer hover:opacity-80 ${statusConfig[!vaga.ativa].color} border-current/10`}
                      title={`Marcar como ${statusConfig[!vaga.ativa].label}`}
                    >
                      {statusConfig[!vaga.ativa].label}
                    </button>
                  </div>
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
