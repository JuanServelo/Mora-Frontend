// src/pages/adm/GerenciarVagas.jsx
import { useState } from "react";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

// ─── enums / helpers ────────────────────────────────
const SPOT_STATUS = ["AVAILABLE", "OCCUPIED", "UNDER_MAINTENANCE", "INACTIVE"];

const statusConfig = {
  AVAILABLE: {
    label: "Disponível",
    color: "bg-primary/10 text-primary",
    icon: "check_circle",
  },
  OCCUPIED: {
    label: "Ocupada",
    color: "bg-tertiary/10 text-tertiary",
    icon: "directions_car",
  },
  UNDER_MAINTENANCE: {
    label: "Em Manutenção",
    color: "bg-error/10 text-error",
    icon: "construction",
  },
  INACTIVE: {
    label: "Inativa",
    color: "bg-outline/10 text-outline",
    icon: "block",
  },
};

const VAGAS_MOCK = [
  {
    id: 1,
    spotIdentifier: "Vaga 01 - Setor A",
    unitIdentifier: "Apto 101",
    status: "OCCUPIED",
  },
  {
    id: 2,
    spotIdentifier: "Vaga 02 - Setor A",
    unitIdentifier: "Apto 202",
    status: "AVAILABLE",
  },
  {
    id: 3,
    spotIdentifier: "Vaga 03 - Setor A",
    unitIdentifier: null,
    status: "AVAILABLE",
  },
  {
    id: 4,
    spotIdentifier: "Vaga 01 - Setor B",
    unitIdentifier: "Apto 305",
    status: "UNDER_MAINTENANCE",
  },
  {
    id: 5,
    spotIdentifier: "Vaga 02 - Setor B",
    unitIdentifier: null,
    status: "INACTIVE",
  },
];

// ════════════════════════════════════════════
export function GerenciarVagas() {
  const [vagas, setVagas] = useState(VAGAS_MOCK);
  const [criando, setCriando] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState({ spotIdentifier: "", unitIdentifier: "", status: "AVAILABLE" });

  const handleForm = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const criarVaga = (e) => {
    e.preventDefault();
    if (vagas.some((v) => v.spotIdentifier === form.spotIdentifier)) {
      alert("Já existe uma vaga com esse identificador.");
      return;
    }
    setVagas((prev) => [...prev, { id: Date.now(), ...form }]);
    setCriando(false);
    setForm({ spotIdentifier: "", unitIdentifier: "", status: "AVAILABLE" });
  };

  const mudarStatus = (id, novoStatus) => {
    setVagas((prev) =>
      prev.map((v) => (v.id === id ? { ...v, status: novoStatus } : v))
    );
  };

  const vagasFiltradas = vagas
    .filter((v) => filtroStatus === "TODOS" || v.status === filtroStatus)
    .filter(
      (v) =>
        busca === "" ||
        v.spotIdentifier.toLowerCase().includes(busca.toLowerCase()) ||
        (v.unitIdentifier ?? "").toLowerCase().includes(busca.toLowerCase())
    );

  const contadores = SPOT_STATUS.reduce(
    (acc, s) => ({ ...acc, [s]: vagas.filter((v) => v.status === s).length }),
    {}
  );

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
            <Botao onClick={() => setCriando(true)}>
              <span className="flex items-center gap-2">
                <Icone name="add" className="text-lg" /> Nova Vaga
              </span>
            </Botao>
          )}
        </header>

        {/* Cards resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPOT_STATUS.map((s) => {
            const cfg = statusConfig[s];
            return (
              <button
                key={s}
                onClick={() => setFiltroStatus(filtroStatus === s ? "TODOS" : s)}
                className={`glass-panel rounded-2xl p-4 flex items-center gap-3 cursor-pointer transition-all hover:scale-[1.02] text-left ${
                  filtroStatus === s ? "ring-2 ring-primary/40" : ""
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cfg.color}`}>
                  <Icone name={cfg.icon} className="text-lg" />
                </div>
                <div>
                  <p className="text-xl font-extrabold text-on-surface font-headline">
                    {contadores[s] ?? 0}
                  </p>
                  <p className="text-xs text-on-surface-variant leading-tight">{cfg.label}</p>
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
                  label="Identificador da vaga"
                  name="spotIdentifier"
                  value={form.spotIdentifier}
                  onChange={handleForm}
                  placeholder="Ex: Vaga 12 - Setor A"
                  required
                />
                <Campo
                  label="Unidade vinculada (opcional)"
                  name="unitIdentifier"
                  value={form.unitIdentifier}
                  onChange={handleForm}
                  placeholder="Ex: Apto 203"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                  Status inicial
                </label>
                <div className="relative w-fit">
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleForm}
                    className="appearance-none bg-surface-container-highest/50 border border-white/10 rounded-xl py-3 pl-4 pr-10 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all cursor-pointer"
                  >
                    {SPOT_STATUS.map((s) => (
                      <option key={s} value={s}>{statusConfig[s].label}</option>
                    ))}
                  </select>
                  <Icone name="expand_more" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg" />
                </div>
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCriando(false)}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-white/5 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <Botao type="submit">Cadastrar vaga</Botao>
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
            const cfg = statusConfig[vaga.status];
            return (
              <div key={vaga.id} className="glass-panel rounded-2xl p-5 space-y-4 flex flex-col">
                {/* Ícone + ID */}
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
                  <p className="font-semibold text-on-surface text-sm leading-tight">{vaga.spotIdentifier}</p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    {vaga.unitIdentifier ? (
                      <>
                        <Icone name="home" className="text-xs mr-1" />
                        {vaga.unitIdentifier}
                      </>
                    ) : (
                      <span className="opacity-50">Sem unidade vinculada</span>
                    )}
                  </p>
                </div>

                {/* Ações de status */}
                <div className="mt-auto pt-2 border-t border-white/5">
                  <p className="text-xs text-on-surface-variant mb-2">Alterar status:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {SPOT_STATUS.filter((s) => s !== vaga.status).map((s) => (
                      <button
                        key={s}
                        onClick={() => mudarStatus(vaga.id, s)}
                        className={`text-xs font-semibold px-2.5 py-1 rounded-lg border transition-all cursor-pointer hover:opacity-80 ${statusConfig[s].color} border-current/10`}
                        title={`Marcar como ${statusConfig[s].label}`}
                      >
                        {statusConfig[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {vagasFiltradas.length === 0 && (
          <div className="glass-panel rounded-2xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="local_parking" className="text-5xl opacity-30" />
            <p className="text-sm">Nenhuma vaga encontrada.</p>
          </div>
        )}
      </div>
    </div>
  );
}
