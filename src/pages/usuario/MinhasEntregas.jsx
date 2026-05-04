// src/pages/usuario/MinhasEntregas.jsx
import { useState, useEffect, useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { entregaApi } from "../../services/entregasApi";
import { Icone } from "../../components/icones/Icone";
import { Botao } from "../../components/botoes/Botao";

// ─── helpers ─────────────────────────────────
const STATUS = {
  PENDENTE: { label: "Pendente", color: "bg-secondary/10 text-secondary", icon: "schedule" },
  RETIRADA: { label: "Retirada", color: "bg-primary/10 text-primary",   icon: "check_circle" },
};

function fmtData(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
}

function hoje() {
  return new Date().toISOString().split("T")[0];
}

const inputCls =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface text-sm focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all";

const selectCls =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all";

// ════════════════════════════════════════════
export function MinhasEntregas() {
  const { usuario } = useAuth();
  const [todasEntregas, setTodasEntregas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [expandido, setExpandido] = useState(null);
  const [modalRetirada, setModalRetirada] = useState(null);
  const [erroRetirada, setErroRetirada] = useState("");

  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    entregaApi
      .listarTodas()
      .then((res) => setTodasEntregas(res.data || []))
      .catch((err) => console.error("Erro ao carregar entregas:", err))
      .finally(() => setCarregando(false));
  }, []);

  // Só as entregas deste usuário: por ID ou pelo mesmo apartamento/bloco
  const minhasEntregas = useMemo(() => {
    return todasEntregas.filter((e) => {
      const porId = usuario?.id && e.destinatarioId === usuario.id;
      const porApt =
        usuario?.bloco &&
        usuario?.apartamento &&
        e.bloco === usuario.bloco &&
        e.apartamento === usuario.apartamento;
      return porId || porApt;
    });
  }, [todasEntregas, usuario]);

  const filtradas = useMemo(() => {
    return minhasEntregas.filter((e) => {
      if (filtroStatus !== "TODOS" && e.status !== filtroStatus) return false;
      if (busca) {
        const q = busca.toLowerCase();
        if (
          !e.descricao?.toLowerCase().includes(q) &&
          !e.remetente?.toLowerCase().includes(q) &&
          !e.destinatarioNome?.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [minhasEntregas, filtroStatus, busca]);

  async function handleConfirmarRetirada(entrega, dataRetirada) {
    setErroRetirada("");
    try {
      const res = await entregaApi.atualizar(entrega.id, {
        ...entrega,
        status: "RETIRADA",
        dataRetirada,
        recebedorNome: usuario?.nome ?? entrega.destinatarioNome,
      });
      setTodasEntregas((prev) =>
        prev.map((e) => (e.id === entrega.id ? res.data : e)),
      );
      setModalRetirada(null);
      setExpandido(null);
    } catch (err) {
      setErroRetirada("Não foi possível marcar como retirada. Tente novamente.");
      console.error(err);
    }
  }

  const contadores = {
    total:    minhasEntregas.length,
    pendente: minhasEntregas.filter((e) => e.status === "PENDENTE").length,
    retirada: minhasEntregas.filter((e) => e.status === "RETIRADA").length,
  };

  const temFiltro = filtroStatus !== "TODOS" || busca;

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            Serviços
          </p>
          <h1 className="font-headline text-4xl font-extrabold tracking-tight text-on-surface">
            Minhas{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              Encomendas
            </span>
          </h1>
          {usuario?.bloco && usuario?.apartamento && (
            <p className="text-on-surface-variant text-sm mt-1">
              {usuario.bloco} · Apt {usuario.apartamento}
            </p>
          )}
        </header>

        {/* Stats */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Total",      value: contadores.total,    color: "text-on-surface" },
            { label: "Pendentes",  value: contadores.pendente, color: "text-secondary"  },
            { label: "Retiradas",  value: contadores.retirada, color: "text-primary"    },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-panel rounded-2xl px-5 py-3 text-center min-w-[90px]"
            >
              <p className={`text-2xl font-headline font-bold ${s.color}`}>{s.value}</p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="glass-panel rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              <Icone name="filter_list" className="text-base" /> Filtros
            </p>
            {temFiltro && (
              <button
                onClick={() => { setFiltroStatus("TODOS"); setBusca(""); }}
                className="text-xs text-error hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Busca */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Buscar
              </label>
              <div className="relative">
                <Icone
                  name="search"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant text-lg pointer-events-none"
                />
                <input
                  type="text"
                  placeholder="Descrição ou remetente..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className={`${inputCls} pl-10`}
                />
              </div>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">
                Status
              </label>
              <select
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className={inputCls}
              >
                <option value="TODOS">Todas</option>
                <option value="PENDENTE">Pendentes</option>
                <option value="RETIRADA">Retiradas</option>
              </select>
            </div>
          </div>
        </div>

        {temFiltro && (
          <p className="text-xs text-on-surface-variant -mt-4">
            Exibindo{" "}
            <strong className="text-on-surface">{filtradas.length}</strong> de{" "}
            {minhasEntregas.length} encomendas
          </p>
        )}

        {/* Lista */}
        {carregando ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">
            Carregando...
          </div>
        ) : minhasEntregas.length === 0 ? (
          <div className="glass-panel rounded-3xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
            <Icone name="inventory_2" className="text-5xl opacity-30" />
            <p className="text-sm font-semibold">Nenhuma encomenda encontrada.</p>
            <p className="text-xs opacity-60">
              Quando uma encomenda for registrada para o seu apartamento, ela aparecerá aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtradas.length === 0 && (
              <div className="glass-panel rounded-3xl py-12 flex flex-col items-center gap-2 text-on-surface-variant">
                <Icone name="search_off" className="text-4xl opacity-30" />
                <p className="text-sm">Nenhuma encomenda corresponde aos filtros.</p>
              </div>
            )}

            {filtradas.map((entrega) => {
              const cfg = STATUS[entrega.status] ?? STATUS.PENDENTE;
              return (
                <div key={entrega.id} className="glass-panel rounded-3xl overflow-hidden">
                  {/* Linha clicável */}
                  <button
                    onClick={() =>
                      setExpandido((p) => (p === entrega.id ? null : entrega.id))
                    }
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}
                    >
                      <Icone name={cfg.icon} className="text-xl" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-semibold truncate">
                        {entrega.descricao || "Encomenda"}
                      </p>
                      <p className="text-on-surface-variant text-sm truncate">
                        {[
                          entrega.remetente,
                          `Recebida em ${fmtData(entrega.dataRecebimento)}`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}
                    >
                      {cfg.label}
                    </span>

                    <Icone
                      name="expand_more"
                      className={`text-outline shrink-0 transition-transform duration-300 ${
                        expandido === entrega.id ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Painel expandido */}
                  {expandido === entrega.id && (
                    <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5 space-y-4">
                      {/* Detalhes */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { label: "Remetente",   value: entrega.remetente        || "—" },
                          { label: "Recebida em", value: fmtData(entrega.dataRecebimento) },
                          { label: "Retirada em", value: fmtData(entrega.dataRetirada)    },
                          { label: "Descrição",   value: entrega.descricao        || "—" },
                          { label: "Observações", value: entrega.observacoes      || "—" },
                          ...(entrega.status === "RETIRADA"
                            ? [{ label: "Recebida por", value: entrega.recebedorNome || "—" }]
                            : []),
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="bg-surface-container-highest/20 rounded-xl p-3"
                          >
                            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">
                              {item.label}
                            </p>
                            <p className="text-on-surface font-semibold text-sm">{item.value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Ação */}
                      {entrega.status === "PENDENTE" && (
                        <button
                          onClick={() => { setModalRetirada(entrega); setErroRetirada(""); }}
                          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
                        >
                          <Icone name="check_circle" className="text-lg" />
                          Marcar como retirada
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmação de retirada */}
      {modalRetirada && (
        <PopupConfirmarRetirada
          entrega={modalRetirada}
          usuarioNome={usuario?.nome}
          erro={erroRetirada}
          onConfirmar={(dataRetirada) =>
            handleConfirmarRetirada(modalRetirada, dataRetirada)
          }
          onCancelar={() => { setModalRetirada(null); setErroRetirada(""); }}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// POPUP DE CONFIRMAÇÃO
// ════════════════════════════════════════════
function PopupConfirmarRetirada({ entrega, usuarioNome, erro, onConfirmar, onCancelar }) {
  const minData = entrega.dataRecebimento?.split("T")[0] || "";
  const [dataRetirada, setDataRetirada] = useState(hoje());
  const [erroLocal, setErroLocal] = useState("");

  function handleConfirmar() {
    setErroLocal("");
    if (!dataRetirada) {
      setErroLocal("Informe a data de retirada.");
      return;
    }
    if (dataRetirada > hoje()) {
      setErroLocal("A data de retirada não pode ser futura.");
      return;
    }
    if (minData && dataRetirada < minData) {
      setErroLocal("A data de retirada não pode ser anterior à data de recebimento.");
      return;
    }
    onConfirmar(dataRetirada);
  }

  const erroExibido = erroLocal || erro;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-primary/20 space-y-5">
        {/* Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icone name="check_circle" className="text-primary text-xl" />
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">
              Confirmar retirada
            </h2>
            <p className="text-on-surface-variant text-xs">
              {entrega.descricao || "Encomenda"}
              {entrega.remetente ? ` · ${entrega.remetente}` : ""}
            </p>
          </div>
        </div>

        {/* Quem está retirando */}
        <div className="bg-surface-container-highest/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <Icone name="person" className="text-on-surface-variant text-lg shrink-0" />
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-wider">Retirada por</p>
            <p className="text-on-surface font-semibold text-sm">{usuarioNome || "—"}</p>
          </div>
        </div>

        {/* Data de retirada */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            Data de retirada <span className="text-error">*</span>
          </label>
          <input
            type="date"
            value={dataRetirada}
            min={minData}
            max={hoje()}
            onChange={(e) => { setDataRetirada(e.target.value); setErroLocal(""); }}
            className={selectCls}
          />
          {minData && (
            <p className="text-xs text-on-surface-variant ml-1">
              Recebida em {fmtData(entrega.dataRecebimento)} — data não pode ser anterior.
            </p>
          )}
        </div>

        {erroExibido && (
          <p className="text-error text-xs bg-error/10 rounded-xl px-4 py-2">{erroExibido}</p>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-1">
          <Botao type="button" onClick={handleConfirmar}>
            Confirmar retirada
          </Botao>
          <button
            type="button"
            onClick={onCancelar}
            className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 font-semibold text-sm transition-all cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
