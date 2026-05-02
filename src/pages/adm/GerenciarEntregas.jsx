// src/pages/adm/GerenciarEntregas.jsx
import { useState, useEffect, useMemo } from "react";
import api from "../../services/api";
import { entregaApi } from "../../services/entregasApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
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
export function GerenciarEntregas() {
  const [entregas, setEntregas] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erroCriar, setErroCriar] = useState("");
  const [erroEditar, setErroEditar] = useState("");
  const [modalRetirada, setModalRetirada] = useState(null); // entrega | null

  // ─── filtros ─────────────────────────────
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroDestinatario, setFiltroDestinatario] = useState("");
  const [filtroBloco, setFiltroBloco] = useState("");
  const [filtroApartamento, setFiltroApartamento] = useState("");
  const [filtroRecebDe, setFiltroRecebDe] = useState("");
  const [filtroRecebAte, setFiltroRecebAte] = useState("");
  const [filtroRetDe, setFiltroRetDe] = useState("");
  const [filtroRetAte, setFiltroRetAte] = useState("");

  useEffect(() => {
    Promise.all([entregaApi.listarTodas(), api.get("/api/users")])
      .then(([resEntregas, resUsuarios]) => {
        setEntregas(resEntregas.data || []);
        setUsuarios(resUsuarios.data?.usuarios || []);
      })
      .catch((err) => console.error("Erro ao carregar dados:", err))
      .finally(() => setCarregando(false));
  }, []);

  const blocosUnicos = useMemo(
    () => [...new Set(entregas.map((e) => e.bloco).filter(Boolean))].sort(),
    [entregas],
  );
  const apartamentosUnicos = useMemo(
    () => [...new Set(entregas.map((e) => e.apartamento).filter(Boolean))].sort(),
    [entregas],
  );

  const temFiltro =
    filtroStatus !== "TODOS" ||
    filtroDestinatario ||
    filtroBloco ||
    filtroApartamento ||
    filtroRecebDe ||
    filtroRecebAte ||
    filtroRetDe ||
    filtroRetAte;

  function limparFiltros() {
    setFiltroStatus("TODOS");
    setFiltroDestinatario("");
    setFiltroBloco("");
    setFiltroApartamento("");
    setFiltroRecebDe("");
    setFiltroRecebAte("");
    setFiltroRetDe("");
    setFiltroRetAte("");
  }

  const filtradas = useMemo(() => {
    return entregas.filter((e) => {
      if (filtroStatus !== "TODOS" && e.status !== filtroStatus) return false;
      if (filtroDestinatario && !e.destinatarioNome?.toLowerCase().includes(filtroDestinatario.toLowerCase())) return false;
      if (filtroBloco && e.bloco !== filtroBloco) return false;
      if (filtroApartamento && e.apartamento !== filtroApartamento) return false;
      const receb = e.dataRecebimento?.split("T")[0] ?? "";
      const ret   = e.dataRetirada?.split("T")[0] ?? "";
      if (filtroRecebDe && receb < filtroRecebDe) return false;
      if (filtroRecebAte && receb > filtroRecebAte) return false;
      if (filtroRetDe && ret < filtroRetDe) return false;
      if (filtroRetAte && ret > filtroRetAte) return false;
      return true;
    });
  }, [entregas, filtroStatus, filtroDestinatario, filtroBloco, filtroApartamento, filtroRecebDe, filtroRecebAte, filtroRetDe, filtroRetAte]);

  // ─── handlers ────────────────────────────
  async function handleCriar(dados) {
    setErroCriar("");
    try {
      const res = await entregaApi.cadastrar(dados);
      setEntregas((prev) => [res.data, ...prev]);
      setCriando(false);
    } catch (err) {
      const d = err.response?.data;
      setErroCriar(d?.mensagem || d?.message || "Erro ao cadastrar entrega.");
    }
  }

  async function handleAtualizar(id, dados) {
    setErroEditar("");
    try {
      const res = await entregaApi.atualizar(id, dados);
      setEntregas((prev) => prev.map((e) => (e.id === id ? res.data : e)));
      setEditando(null);
    } catch (err) {
      const d = err.response?.data;
      setErroEditar(d?.mensagem || d?.message || "Erro ao atualizar entrega.");
    }
  }

  async function handleConfirmarRetirada(entrega, recebedorNome, dataRetirada) {
    try {
      const res = await entregaApi.atualizar(entrega.id, {
        ...entrega,
        status: "RETIRADA",
        dataRetirada,
        recebedorNome,
      });
      setEntregas((prev) => prev.map((e) => (e.id === entrega.id ? res.data : e)));
      setModalRetirada(null);
    } catch (err) {
      console.error("Erro ao marcar como retirada:", err);
    }
  }

  const contadores = {
    total: entregas.length,
    pendente: entregas.filter((e) => e.status === "PENDENTE").length,
    retirada: entregas.filter((e) => e.status === "RETIRADA").length,
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
              Gestão de{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Entregas
              </span>
            </h1>
          </div>
          <button
            onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); setErroCriar(""); }}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
              criando
                ? "border-error/30 text-error hover:bg-error/10"
                : "border-primary/30 text-primary hover:bg-primary/10"
            }`}
          >
            <Icone name={criando ? "close" : "add"} className="text-xl" />
            {criando ? "Cancelar" : "Nova Entrega"}
          </button>
        </header>

        {/* Stats */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Total",      value: contadores.total,    color: "text-on-surface" },
            { label: "Pendentes",  value: contadores.pendente, color: "text-secondary"  },
            { label: "Retiradas",  value: contadores.retirada, color: "text-primary"    },
          ].map((s) => (
            <div key={s.label} className="glass-panel rounded-2xl px-5 py-3 text-center min-w-[90px]">
              <p className={`text-2xl font-headline font-bold ${s.color}`}>{s.value}</p>
              <p className="text-on-surface-variant text-xs uppercase tracking-wider">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Form nova entrega */}
        {criando && (
          <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icone name="inventory_2" className="text-primary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Nova Entrega</h2>
            </div>
            <FormEntrega
              usuarios={usuarios}
              onSalvar={handleCriar}
              onCancelar={() => { setCriando(false); setErroCriar(""); }}
              erro={erroCriar}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="glass-panel rounded-3xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-2">
              <Icone name="filter_list" className="text-base" /> Filtros
            </p>
            {temFiltro && (
              <button
                onClick={limparFiltros}
                className="text-xs text-error hover:underline cursor-pointer"
              >
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Status</label>
              <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)} className={inputCls}>
                <option value="TODOS">Todos</option>
                <option value="PENDENTE">Pendente</option>
                <option value="RETIRADA">Retirada</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Bloco</label>
              <select value={filtroBloco} onChange={(e) => setFiltroBloco(e.target.value)} className={inputCls}>
                <option value="">Todos os blocos</option>
                {blocosUnicos.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Apartamento</label>
              <select value={filtroApartamento} onChange={(e) => setFiltroApartamento(e.target.value)} className={inputCls}>
                <option value="">Todos</option>
                {apartamentosUnicos.map((a) => <option key={a} value={a}>Apt {a}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Destinatário</label>
              <input
                type="text"
                placeholder="Nome..."
                value={filtroDestinatario}
                onChange={(e) => setFiltroDestinatario(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Recebimento — de</label>
              <input type="date" value={filtroRecebDe} onChange={(e) => setFiltroRecebDe(e.target.value)} className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Recebimento — até</label>
              <input type="date" value={filtroRecebAte} onChange={(e) => setFiltroRecebAte(e.target.value)} className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Retirada — de</label>
              <input type="date" value={filtroRetDe} onChange={(e) => setFiltroRetDe(e.target.value)} className={inputCls} />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Retirada — até</label>
              <input type="date" value={filtroRetAte} onChange={(e) => setFiltroRetAte(e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {temFiltro && (
          <p className="text-xs text-on-surface-variant -mt-4">
            Exibindo <strong className="text-on-surface">{filtradas.length}</strong> de {entregas.length} entregas
          </p>
        )}

        {/* Lista */}
        {carregando ? (
          <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Carregando...</div>
        ) : (
          <div className="space-y-3">
            {filtradas.length === 0 && (
              <div className="glass-panel rounded-3xl py-16 flex flex-col items-center gap-3 text-on-surface-variant">
                <Icone name="inventory_2" className="text-5xl opacity-30" />
                <p className="text-sm">Nenhuma entrega encontrada.</p>
              </div>
            )}

            {filtradas.map((entrega) => {
              const cfg = STATUS[entrega.status] ?? STATUS.PENDENTE;
              return (
                <div key={entrega.id} className="glass-panel rounded-3xl overflow-hidden">
                  <button
                    onClick={() => { setExpandido((p) => (p === entrega.id ? null : entrega.id)); setEditando(null); }}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${cfg.color}`}>
                      <Icone name={cfg.icon} className="text-xl" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-on-surface font-semibold truncate">{entrega.destinatarioNome || "—"}</p>
                      <p className="text-on-surface-variant text-sm truncate">
                        {[entrega.bloco, entrega.apartamento ? `Apt ${entrega.apartamento}` : null, entrega.descricao]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>

                    <div className="hidden sm:flex gap-6 text-sm shrink-0">
                      {[
                        { label: "Recebida",  value: fmtData(entrega.dataRecebimento) },
                        { label: "Retirada",  value: fmtData(entrega.dataRetirada)    },
                      ].map((col) => (
                        <div key={col.label} className="text-center">
                          <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                          <p className="text-on-surface font-semibold">{col.value}</p>
                        </div>
                      ))}
                    </div>

                    <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.color}`}>
                      {cfg.label}
                    </span>

                    <Icone
                      name="expand_more"
                      className={`text-outline shrink-0 transition-transform duration-300 ${expandido === entrega.id ? "rotate-180" : ""}`}
                    />
                  </button>

                  {expandido === entrega.id && (
                    <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                      {editando === entrega.id ? (
                        <FormEntrega
                          inicial={entrega}
                          usuarios={usuarios}
                          onSalvar={(dados) => handleAtualizar(entrega.id, dados)}
                          onCancelar={() => { setEditando(null); setErroEditar(""); }}
                          erro={erroEditar}
                        />
                      ) : (
                        <DetalhesEntrega
                          entrega={entrega}
                          onEditar={() => setEditando(entrega.id)}
                          onMarcarRetirada={() => setModalRetirada(entrega)}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de retirada */}
      {modalRetirada && (
        <PopupRetirada
          entrega={modalRetirada}
          usuarios={usuarios}
          onConfirmar={(recebedorNome, dataRetirada) =>
            handleConfirmarRetirada(modalRetirada, recebedorNome, dataRetirada)
          }
          onCancelar={() => setModalRetirada(null)}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════
// POPUP DE RETIRADA
// ════════════════════════════════════════════
function PopupRetirada({ entrega, usuarios, onConfirmar, onCancelar }) {
  const moradoresApartamento = useMemo(
    () =>
      usuarios.filter(
        (u) =>
          u.bloco === entrega.bloco &&
          u.apartamento === entrega.apartamento,
      ),
    [usuarios, entrega.bloco, entrega.apartamento],
  );

  const minData = entrega.dataRecebimento?.split("T")[0] || "";

  const [recebedorId, setRecebedorId] = useState(
    moradoresApartamento.find((u) => u.id === entrega.destinatarioId)?.id?.toString() ||
    moradoresApartamento[0]?.id?.toString() ||
    "",
  );
  const [dataRetirada, setDataRetirada] = useState(hoje());
  const [erro, setErro] = useState("");

  function handleConfirmar() {
    setErro("");
    if (!recebedorId) {
      setErro("Selecione quem retirou a encomenda.");
      return;
    }
    if (!dataRetirada) {
      setErro("Informe a data de retirada.");
      return;
    }
    if (dataRetirada > hoje()) {
      setErro("A data de retirada não pode ser futura.");
      return;
    }
    if (minData && dataRetirada < minData) {
      setErro("A data de retirada não pode ser anterior à data de recebimento.");
      return;
    }
    const recebedor = moradoresApartamento.find((u) => u.id.toString() === recebedorId);
    onConfirmar(recebedor?.nome || entrega.destinatarioNome, dataRetirada);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-panel rounded-3xl p-6 w-full max-w-md shadow-2xl border border-primary/20 space-y-5">
        {/* Título */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Icone name="check_circle" className="text-primary text-xl" />
          </div>
          <div>
            <h2 className="font-headline text-lg font-bold text-on-surface">Confirmar retirada</h2>
            <p className="text-on-surface-variant text-xs">
              {entrega.descricao || "Encomenda"} · {entrega.bloco}, Apt {entrega.apartamento}
            </p>
          </div>
        </div>

        {/* Quem retirou */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            Quem retirou <span className="text-error">*</span>
          </label>
          {moradoresApartamento.length === 0 ? (
            <p className="text-sm text-on-surface-variant bg-surface-container-highest/30 rounded-xl px-4 py-3">
              Nenhum morador vinculado ao apartamento {entrega.apartamento}.
            </p>
          ) : (
            <select
              value={recebedorId}
              onChange={(e) => setRecebedorId(e.target.value)}
              className={selectCls}
            >
              <option value="">Selecione o morador</option>
              {moradoresApartamento.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome}
                </option>
              ))}
            </select>
          )}
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
            onChange={(e) => { setDataRetirada(e.target.value); setErro(""); }}
            className={selectCls}
          />
          {minData && (
            <p className="text-xs text-on-surface-variant ml-1">
              Recebida em {fmtData(entrega.dataRecebimento)} — data de retirada não pode ser anterior.
            </p>
          )}
        </div>

        {erro && (
          <p className="text-error text-xs bg-error/10 rounded-xl px-4 py-2">{erro}</p>
        )}

        {/* Ações */}
        <div className="flex gap-3 pt-1">
          <Botao type="button" onClick={handleConfirmar} className="flex-1">
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

// ════════════════════════════════════════════
// FORMULÁRIO
// ════════════════════════════════════════════
function FormEntrega({ inicial, usuarios, onSalvar, onCancelar, erro }) {
  const [form, setForm] = useState({
    descricao:        inicial?.descricao        || "",
    remetente:        inicial?.remetente        || "",
    dataRecebimento:  inicial?.dataRecebimento?.split("T")[0] || hoje(),
    dataRetirada:     inicial?.dataRetirada?.split("T")[0]    || "",
    status:           inicial?.status           || "PENDENTE",
    observacoes:      inicial?.observacoes      || "",
    recebedorNome:    inicial?.recebedorNome    || "",
  });
  const [destinatarioId, setDestinatarioId] = useState(
    inicial?.destinatarioId?.toString() || "",
  );
  const [bloco, setBloco] = useState(inicial?.bloco || "");
  const [apartamento, setApartamento] = useState(inicial?.apartamento || "");
  const [erroLocal, setErroLocal] = useState("");

  useEffect(() => {
    if (!destinatarioId) { setBloco(""); setApartamento(""); return; }
    const user = usuarios.find((u) => u.id.toString() === destinatarioId);
    if (user) { setBloco(user.bloco || ""); setApartamento(user.apartamento || ""); }
  }, [destinatarioId, usuarios]);

  function set(field, value) {
    setErroLocal("");
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setErroLocal("");

    if (form.dataRecebimento > hoje()) {
      setErroLocal("A data de recebimento não pode ser uma data futura.");
      return;
    }

    if (form.status === "RETIRADA" && form.dataRetirada) {
      if (form.dataRetirada > hoje()) {
        setErroLocal("A data de retirada não pode ser uma data futura.");
        return;
      }
      if (form.dataRecebimento && form.dataRetirada < form.dataRecebimento) {
        setErroLocal("A data de retirada não pode ser anterior à data de recebimento.");
        return;
      }
    }

    const user = usuarios.find((u) => u.id.toString() === destinatarioId);
    onSalvar({
      ...form,
      destinatarioId:   destinatarioId ? Number(destinatarioId) : (inicial?.destinatarioId ?? null),
      destinatarioNome: user?.nome ?? inicial?.destinatarioNome ?? "",
      bloco,
      apartamento,
      dataRetirada:  form.dataRetirada || null,
      recebedorNome: form.status === "RETIRADA" ? (form.recebedorNome || null) : null,
    });
  }

  const isEdicao = Boolean(inicial);
  const erroExibido = erroLocal || erro;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Destinatário */}
        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            Destinatário <span className="text-error">*</span>
          </label>
          <select
            value={destinatarioId}
            onChange={(e) => setDestinatarioId(e.target.value)}
            required={!isEdicao}
            className={selectCls}
          >
            <option value="">Selecione um morador</option>
            {usuarios
              .filter((u) => u.bloco && u.apartamento)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nome} — {u.bloco}, Apt {u.apartamento}
                </option>
              ))}
          </select>
        </div>

        {/* Bloco e Apartamento (somente leitura) */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Bloco</label>
          <input
            value={bloco}
            readOnly
            placeholder="Preenchido automaticamente"
            className={`${selectCls} opacity-60 cursor-not-allowed`}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Apartamento</label>
          <input
            value={apartamento}
            readOnly
            placeholder="Preenchido automaticamente"
            className={`${selectCls} opacity-60 cursor-not-allowed`}
          />
        </div>

        {/* Descrição */}
        <Campo
          id="ent-desc"
          label="Descrição"
          placeholder="Ex: Caixa Amazon, envelope AR, etc."
          value={form.descricao}
          onChange={(e) => set("descricao", e.target.value)}
        />

        {/* Remetente */}
        <Campo
          id="ent-remetente"
          label="Remetente"
          placeholder="Ex: Correios, Mercado Livre, etc."
          value={form.remetente}
          onChange={(e) => set("remetente", e.target.value)}
        />

        {/* Data de recebimento */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            Data de recebimento <span className="text-error">*</span>
          </label>
          <input
            type="date"
            value={form.dataRecebimento}
            max={hoje()}
            onChange={(e) => set("dataRecebimento", e.target.value)}
            required
            className={selectCls}
          />
        </div>

        {/* Status — só na edição */}
        {isEdicao && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={selectCls}
            >
              <option value="PENDENTE">Pendente</option>
              <option value="RETIRADA">Retirada</option>
            </select>
          </div>
        )}

        {/* Data de retirada — só na edição quando status = RETIRADA */}
        {isEdicao && form.status === "RETIRADA" && (
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Data de retirada</label>
            <input
              type="date"
              value={form.dataRetirada}
              min={form.dataRecebimento || undefined}
              max={hoje()}
              onChange={(e) => set("dataRetirada", e.target.value)}
              className={selectCls}
            />
          </div>
        )}

        {/* Recebida por — só na edição quando status = RETIRADA */}
        {isEdicao && form.status === "RETIRADA" && (
          <div className="space-y-2 sm:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              Recebida por
            </label>
            {usuarios.filter((u) => u.bloco === bloco && u.apartamento === apartamento).length === 0 ? (
              <p className="text-sm text-on-surface-variant bg-surface-container-highest/30 rounded-xl px-4 py-3">
                Nenhum morador vinculado ao apartamento {apartamento}.
              </p>
            ) : (
              <select
                value={form.recebedorNome}
                onChange={(e) => set("recebedorNome", e.target.value)}
                className={selectCls}
              >
                <option value="">Selecione o morador</option>
                {usuarios
                  .filter((u) => u.bloco === bloco && u.apartamento === apartamento)
                  .map((u) => (
                    <option key={u.id} value={u.nome}>
                      {u.nome}
                    </option>
                  ))}
              </select>
            )}
          </div>
        )}

        {/* Observações */}
        <Campo
          id="ent-obs"
          label="Observações"
          placeholder="Opcional"
          value={form.observacoes}
          onChange={(e) => set("observacoes", e.target.value)}
        />
      </div>

      {erroExibido && <p className="text-error text-xs">{erroExibido}</p>}

      <div className="flex gap-3 pt-2">
        <Botao type="submit">{isEdicao ? "Salvar alterações" : "Cadastrar entrega"}</Botao>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 font-semibold transition-all cursor-pointer"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ════════════════════════════════════════════
// DETALHES
// ════════════════════════════════════════════
function DetalhesEntrega({ entrega, onEditar, onMarcarRetirada }) {
  const campos = [
    { label: "Destinatário",  value: entrega.destinatarioNome || "—" },
    { label: "Bloco",         value: entrega.bloco            || "—" },
    { label: "Apartamento",   value: entrega.apartamento ? `Apt ${entrega.apartamento}` : "—" },
    { label: "Remetente",     value: entrega.remetente        || "—" },
    { label: "Descrição",     value: entrega.descricao        || "—" },
    { label: "Recebida em",   value: fmtData(entrega.dataRecebimento) },
    { label: "Retirada em",   value: fmtData(entrega.dataRetirada)    },
    { label: "Observações",   value: entrega.observacoes      || "—" },
  ];

  if (entrega.status === "RETIRADA") {
    campos.push({ label: "Recebida por", value: entrega.recebedorNome || "—" });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {campos.map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-1 flex-wrap">
        <button
          onClick={onEditar}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
        >
          <Icone name="edit" className="text-lg" /> Editar
        </button>

        {entrega.status === "PENDENTE" && (
          <button
            onClick={onMarcarRetirada}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
          >
            <Icone name="check_circle" className="text-lg" /> Marcar como retirada
          </button>
        )}
      </div>
    </div>
  );
}
