// src/pages/adm/GerenciarEstruturas.jsx
import { useState, useEffect } from "react";
import { blocoApi, apartamentoApi, areaComunApi } from "../../services/estruturasApi";
import { vagaApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";

const TIPOS_AREA = ["PISCINA", "SALAO_FESTAS", "ACADEMIA", "CHURRASQUEIRA", "QUADRA", "PLAYGROUND", "OUTRO"];

// ─── helpers ────────────────────────────────
const statusStyle = (ativo) =>
  ativo ? "bg-primary/10 text-primary" : "bg-error/10 text-error";

// ════════════════════════════════════════════
export function GerenciarEstruturas() {
  const [aba, setAba] = useState("blocos"); // blocos | apartamentos | areas-comuns | vagas

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
              Estruturas{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                Físicas
              </span>
            </h1>
          </div>
        </header>

        {/* Sub-navbar de abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex gap-1 w-fit flex-wrap">
          {[
            { id: "blocos", label: "Blocos", icon: "apartment" },
            { id: "apartamentos", label: "Apartamentos", icon: "door_front" },
            { id: "areas-comuns", label: "Áreas Comuns", icon: "pool" },
            { id: "vagas", label: "Vagas", icon: "local_parking" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
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

        {/* Conteúdo por aba */}
        {aba === "blocos" && <AbaBlocos />}
        {aba === "apartamentos" && <AbaApartamentos />}
        {aba === "areas-comuns" && <AbaAreasComuns />}
        {aba === "vagas" && <AbaVagas />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: BLOCOS
// ════════════════════════════════════════════
function AbaBlocos() {
  const [blocos, setBlocos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    blocoApi
      .listarTodos()
      .then((res) => setBlocos(res.data))
      .catch((err) => console.error("Erro ao carregar blocos:", err))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = blocos.filter((b) =>
    b.nome.toLowerCase().includes(busca.toLowerCase()) ||
    b.descricao?.toLowerCase().includes(busca.toLowerCase()),
  );

  async function handleCriar(dados) {
    try {
      const res = await blocoApi.cadastrar(dados);
      setBlocos((prev) => [res.data, ...prev]);
      setCriando(false);
    } catch (err) {
      console.error("Erro ao criar bloco:", err);
    }
  }

  async function handleAtualizar(id, dados) {
    try {
      const res = await blocoApi.atualizar(id, dados);
      setBlocos((prev) => prev.map((b) => (b.id === id ? res.data : b)));
      setEditando(null);
    } catch (err) {
      console.error("Erro ao atualizar bloco:", err);
    }
  }

  async function handleToggleAtivo(bloco) {
    try {
      if (bloco.ativo) {
        await blocoApi.desativar(bloco.id);
      } else {
        await blocoApi.ativar(bloco.id);
      }
      setBlocos((prev) =>
        prev.map((b) => (b.id === bloco.id ? { ...b, ativo: !b.ativo } : b)),
      );
    } catch (err) {
      console.error("Erro ao alterar status do bloco:", err);
    }
  }

  return (
    <>
      {/* Stats + botão */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-on-surface">{blocos.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-primary">{blocos.filter((b) => b.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Ativos</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-error">{blocos.filter((b) => !b.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Inativos</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? "Cancelar" : "Novo Bloco"}
        </button>
      </div>

      {/* Form novo bloco */}
      {criando && (
        <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="apartment" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Novo Bloco</h2>
          </div>
          <FormBloco onSalvar={handleCriar} onCancelar={() => setCriando(false)} />
        </div>
      )}

      {/* Busca */}
      <div className="max-w-md">
        <Campo
          id="busca-bloco"
          placeholder="Buscar por nome ou descrição..."
          icon="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Nenhum bloco encontrado.</div>
          )}
          {filtrados.map((bloco) => (
            <div key={bloco.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === bloco.id ? null : bloco.id)); setEditando(null); }}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="apartment" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{bloco.nome}</p>
                  <p className="text-on-surface-variant text-sm truncate">{bloco.descricao}</p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "Andares", value: bloco.andares ?? "—" },
                    { label: "Apts/Andar", value: bloco.apartamentosPorAndar ?? "—" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(bloco.ativo)}`}>
                  {bloco.ativo ? "ativo" : "inativo"}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === bloco.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === bloco.id && (
                <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                  {editando === bloco.id ? (
                    <FormBloco
                      inicial={bloco}
                      onSalvar={(dados) => handleAtualizar(bloco.id, dados)}
                      onCancelar={() => setEditando(null)}
                    />
                  ) : (
                    <DetalhesBloco bloco={bloco} onEditar={() => setEditando(bloco.id)} onToggleAtivo={() => handleToggleAtivo(bloco)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FormBloco({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    nome: inicial?.nome || "",
    descricao: inicial?.descricao || "",
    andares: inicial?.andares || "",
    apartamentosPorAndar: inicial?.apartamentosPorAndar || "",
  });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSalvar({
      ...form,
      andares: form.andares ? Number(form.andares) : null,
      apartamentosPorAndar: form.apartamentosPorAndar ? Number(form.apartamentosPorAndar) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="bloco-nome" label="Nome" placeholder="Ex: Bloco A" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
        <Campo id="bloco-descricao" label="Descrição" placeholder="Ex: Torre principal" required value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
        <Campo id="bloco-andares" label="Andares" type="number" placeholder="Ex: 10" value={form.andares} onChange={(e) => set("andares", e.target.value)} />
        <Campo id="bloco-aptsandar" label="Aptos por andar" type="number" placeholder="Ex: 4" value={form.apartamentosPorAndar} onChange={(e) => set("apartamentosPorAndar", e.target.value)} />
      </div>
      <div className="flex gap-3 pt-2">
        <Botao type="submit">{inicial ? "Salvar alterações" : "Cadastrar bloco"}</Botao>
        <button type="button" onClick={onCancelar} className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 font-semibold transition-all cursor-pointer">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function DetalhesBloco({ bloco, onEditar, onToggleAtivo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Nome", value: bloco.nome },
          { label: "Descrição", value: bloco.descricao },
          { label: "Andares", value: bloco.andares ?? "—" },
          { label: "Apts/Andar", value: bloco.apartamentosPorAndar ?? "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onEditar} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
          <Icone name="edit" className="text-lg" /> Editar
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            bloco.ativo ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={bloco.ativo ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {bloco.ativo ? "Desativar" : "Ativar"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: APARTAMENTOS
// ════════════════════════════════════════════
function AbaApartamentos() {
  const [apartamentos, setApartamentos] = useState([]);
  const [blocos, setBlocos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroBlocoId, setFiltroBlocoId] = useState("todos");
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erroCriar, setErroCriar] = useState("");
  const [erroEditar, setErroEditar] = useState("");

  useEffect(() => {
    Promise.all([apartamentoApi.listarTodos(), blocoApi.listar()])
      .then(([resApts, resBlocos]) => {
        setApartamentos(resApts.data);
        setBlocos(resBlocos.data);
      })
      .catch((err) => console.error("Erro ao carregar apartamentos:", err))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = apartamentos.filter((a) => {
    const q = busca.toLowerCase();
    const matchBusca = a.numero.toLowerCase().includes(q) || String(a.andar).includes(q);
    const matchBloco = filtroBlocoId === "todos" || a.blocoId === filtroBlocoId;
    return matchBusca && matchBloco;
  });

  async function handleCriar(dados, blocoId) {
    setErroCriar("");
    console.log("[cadastrar] payload:", { ...dados, blocoId });
    try {
      const res = await apartamentoApi.cadastrar(dados, blocoId);
      setApartamentos((prev) => [res.data, ...prev]);
      setCriando(false);
    } catch (err) {
      const d = err.response?.data;
      console.error("[cadastrar] erro backend:", d);
      setErroCriar(d?.erro || (d?.erros ? Object.values(d.erros).join("; ") : null) || "Erro ao criar apartamento.");
    }
  }

  async function handleAtualizar(id, dados, blocoId) {
    setErroEditar("");
    try {
      const res = await apartamentoApi.atualizar(id, dados, blocoId);
      setApartamentos((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      setEditando(null);
    } catch (err) {
      const d = err.response?.data;
      setErroEditar(d?.erro || (d?.erros ? Object.values(d.erros).join("; ") : null) || "Erro ao atualizar apartamento.");
    }
  }

  async function handleToggleAtivo(apt) {
    try {
      if (apt.ativo) {
        await apartamentoApi.desativar(apt.id);
      } else {
        await apartamentoApi.ativar(apt.id);
      }
      setApartamentos((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, ativo: !a.ativo } : a)),
      );
    } catch (err) {
      console.error("Erro ao alterar status do apartamento:", err);
    }
  }

  return (
    <>
      {/* Stats + botão */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-on-surface">{apartamentos.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-primary">{apartamentos.filter((a) => a.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Ativos</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-error">{apartamentos.filter((a) => !a.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Inativos</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); setErroCriar(""); setErroEditar(""); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? "Cancelar" : "Novo Apartamento"}
        </button>
      </div>

      {/* Form novo apartamento */}
      {criando && (
        <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="door_front" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Novo Apartamento</h2>
          </div>
          <FormApartamento blocos={blocos} onSalvar={handleCriar} onCancelar={() => { setCriando(false); setErroCriar(""); }} erro={erroCriar} />
        </div>
      )}

      {/* Filtro por bloco + busca */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <Campo
            id="busca-apt"
            placeholder="Buscar por número ou andar..."
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="shrink-0">
          <select
            value={filtroBlocoId}
            onChange={(e) => setFiltroBlocoId(e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            <option value="todos">Todos os blocos</option>
            {blocos.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Nenhum apartamento encontrado.</div>
          )}
          {filtrados.map((apt) => (
            <div key={apt.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === apt.id ? null : apt.id)); setEditando(null); }}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="door_front" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">Apt {apt.numero}</p>
                  <p className="text-on-surface-variant text-sm truncate">{apt.blocoNome ?? "—"}</p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "Andar", value: apt.andar ?? "—" },
                    { label: "Quartos", value: apt.quartos ?? "—" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(apt.ativo)}`}>
                  {apt.ativo ? "ativo" : "inativo"}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === apt.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === apt.id && (
                <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                  {editando === apt.id ? (
                    <FormApartamento
                      inicial={apt}
                      blocos={blocos}
                      onSalvar={(dados, blocoId) => handleAtualizar(apt.id, dados, blocoId)}
                      onCancelar={() => { setEditando(null); setErroEditar(""); }}
                      erro={erroEditar}
                    />
                  ) : (
                    <DetalhesApartamento apt={apt} onEditar={() => setEditando(apt.id)} onToggleAtivo={() => handleToggleAtivo(apt)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FormApartamento({ inicial, blocos, onSalvar, onCancelar, erro }) {
  const [form, setForm] = useState({
    numero: inicial?.numero || "",
    andar: inicial?.andar || "",
    quartos: inicial?.quartos || "",
    areaMxComTotal: inicial?.areaMxComTotal || "",
    observacoes: inicial?.observacoes || "",
  });
  const [blocoId, setBlocoId] = useState(inicial?.blocoId || (blocos[0]?.id ?? ""));

  useEffect(() => {
    if (!blocoId && blocos.length > 0) {
      setBlocoId(blocos[0].id);
    }
  }, [blocos]);

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSalvar(
      {
        ...form,
        andar: form.andar ? Number(form.andar) : null,
        quartos: form.quartos ? Number(form.quartos) : null,
        areaMxComTotal: form.areaMxComTotal ? Number(form.areaMxComTotal) : null,
      },
      blocoId,
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Bloco</label>
          <select
            value={blocoId}
            onChange={(e) => setBlocoId(e.target.value)}
            required
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            {blocos.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>
        <Campo id="apt-numero" label="Número" placeholder="Ex: 101" required value={form.numero} onChange={(e) => set("numero", e.target.value)} />
        <Campo id="apt-andar" label="Andar" type="number" placeholder="Ex: 1" required value={form.andar} onChange={(e) => set("andar", e.target.value)} />
        <Campo id="apt-quartos" label="Quartos" type="number" placeholder="Ex: 2" value={form.quartos} onChange={(e) => set("quartos", e.target.value)} />
        <Campo id="apt-area" label="Área total (m²)" type="number" placeholder="Ex: 65.5" value={form.areaMxComTotal} onChange={(e) => set("areaMxComTotal", e.target.value)} />
        <Campo id="apt-obs" label="Observações" placeholder="Opcional" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </div>
      {erro && <p className="text-error text-xs">{erro}</p>}
      <div className="flex gap-3 pt-2">
        <Botao type="submit">{inicial ? "Salvar alterações" : "Cadastrar apartamento"}</Botao>
        <button type="button" onClick={onCancelar} className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 font-semibold transition-all cursor-pointer">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function DetalhesApartamento({ apt, onEditar, onToggleAtivo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Bloco", value: apt.blocoNome ?? "—" },
          { label: "Número", value: apt.numero },
          { label: "Andar", value: apt.andar ?? "—" },
          { label: "Quartos", value: apt.quartos ?? "—" },
          { label: "Área (m²)", value: apt.areaMxComTotal ?? "—" },
          { label: "Observações", value: apt.observacoes || "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onEditar} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
          <Icone name="edit" className="text-lg" /> Editar
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            apt.ativo ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={apt.ativo ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {apt.ativo ? "Desativar" : "Ativar"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: ÁREAS COMUNS
// ════════════════════════════════════════════
function AbaAreasComuns() {
  const [areas, setAreas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);

  useEffect(() => {
    areaComunApi
      .listarTodas()
      .then((res) => setAreas(res.data))
      .catch((err) => console.error("Erro ao carregar áreas comuns:", err))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = areas.filter((a) => {
    const q = busca.toLowerCase();
    const matchBusca = a.nome.toLowerCase().includes(q) || a.localizacao?.toLowerCase().includes(q);
    const matchTipo = filtroTipo === "todos" || a.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  async function handleCriar(dados) {
    try {
      const res = await areaComunApi.cadastrar(dados);
      setAreas((prev) => [res.data, ...prev]);
      setCriando(false);
    } catch (err) {
      console.error("Erro ao criar área comum:", err);
    }
  }

  async function handleAtualizar(id, dados) {
    try {
      const res = await areaComunApi.atualizar(id, dados);
      setAreas((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      setEditando(null);
    } catch (err) {
      console.error("Erro ao atualizar área comum:", err);
    }
  }

  async function handleToggleAtivo(area) {
    try {
      if (area.ativo) {
        await areaComunApi.desativar(area.id);
      } else {
        await areaComunApi.ativar(area.id);
      }
      setAreas((prev) =>
        prev.map((a) => (a.id === area.id ? { ...a, ativo: !a.ativo } : a)),
      );
    } catch (err) {
      console.error("Erro ao alterar status da área comum:", err);
    }
  }

  const tiposPresentes = [...new Set(areas.map((a) => a.tipo))];

  return (
    <>
      {/* Stats + botão */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-on-surface">{areas.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-primary">{areas.filter((a) => a.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Ativas</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-secondary">{areas.filter((a) => a.podeReservar).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Reserváveis</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? "Cancelar" : "Nova Área Comum"}
        </button>
      </div>

      {/* Form nova área comum */}
      {criando && (
        <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="pool" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Nova Área Comum</h2>
          </div>
          <FormAreaComum onSalvar={handleCriar} onCancelar={() => setCriando(false)} />
        </div>
      )}

      {/* Filtro por tipo + busca */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <Campo
            id="busca-area"
            placeholder="Buscar por nome ou localização..."
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="shrink-0">
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            <option value="todos">Todos os tipos</option>
            {tiposPresentes.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Nenhuma área comum encontrada.</div>
          )}
          {filtrados.map((area) => (
            <div key={area.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === area.id ? null : area.id)); setEditando(null); }}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <Icone name="pool" className="text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{area.nome}</p>
                  <p className="text-on-surface-variant text-sm truncate">{area.tipo?.replace(/_/g, " ")} {area.localizacao ? `· ${area.localizacao}` : ""}</p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "Capacidade", value: area.capacidadeMaxima ?? "—" },
                    { label: "Área (m²)", value: area.area ?? "—" },
                    { label: "Reservável", value: area.podeReservar ? "Sim" : "Não" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(area.ativo)}`}>
                  {area.ativo ? "ativa" : "inativa"}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === area.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === area.id && (
                <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                  {editando === area.id ? (
                    <FormAreaComum
                      inicial={area}
                      onSalvar={(dados) => handleAtualizar(area.id, dados)}
                      onCancelar={() => setEditando(null)}
                    />
                  ) : (
                    <DetalhesAreaComum area={area} onEditar={() => setEditando(area.id)} onToggleAtivo={() => handleToggleAtivo(area)} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FormAreaComum({ inicial, onSalvar, onCancelar }) {
  const [form, setForm] = useState({
    nome: inicial?.nome || "",
    tipo: inicial?.tipo || TIPOS_AREA[0],
    descricao: inicial?.descricao || "",
    localizacao: inicial?.localizacao || "",
    capacidadeMaxima: inicial?.capacidadeMaxima || "",
    area: inicial?.area || "",
    podeReservar: inicial?.podeReservar ?? false,
    observacoes: inicial?.observacoes || "",
  });

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSalvar({
      ...form,
      capacidadeMaxima: form.capacidadeMaxima ? Number(form.capacidadeMaxima) : null,
      area: form.area ? Number(form.area) : null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="area-nome" label="Nome" placeholder="Ex: Piscina Principal" required value={form.nome} onChange={(e) => set("nome", e.target.value)} />
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            {TIPOS_AREA.map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <Campo id="area-desc" label="Descrição" placeholder="Opcional" value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
        <Campo id="area-local" label="Localização" placeholder="Ex: Térreo, ao lado da portaria" value={form.localizacao} onChange={(e) => set("localizacao", e.target.value)} />
        <Campo id="area-cap" label="Capacidade máxima" type="number" placeholder="Ex: 50" value={form.capacidadeMaxima} onChange={(e) => set("capacidadeMaxima", e.target.value)} />
        <Campo id="area-m2" label="Área (m²)" type="number" placeholder="Ex: 120" value={form.area} onChange={(e) => set("area", e.target.value)} />
        <Campo id="area-obs" label="Observações" placeholder="Opcional" value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={() => set("podeReservar", !form.podeReservar)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${form.podeReservar ? "bg-primary" : "bg-outline-variant/40"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${form.podeReservar ? "left-7" : "left-1"}`} />
          </button>
          <span className="text-sm text-on-surface-variant font-medium">Permite reservas</span>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <Botao type="submit">{inicial ? "Salvar alterações" : "Cadastrar área comum"}</Botao>
        <button type="button" onClick={onCancelar} className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-white/5 font-semibold transition-all cursor-pointer">
          Cancelar
        </button>
      </div>
    </form>
  );
}

function DetalhesAreaComum({ area, onEditar, onToggleAtivo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Nome", value: area.nome },
          { label: "Tipo", value: area.tipo?.replace(/_/g, " ") },
          { label: "Localização", value: area.localizacao || "—" },
          { label: "Capacidade", value: area.capacidadeMaxima ?? "—" },
          { label: "Área (m²)", value: area.area ?? "—" },
          { label: "Reservável", value: area.podeReservar ? "Sim" : "Não" },
          { label: "Descrição", value: area.descricao || "—" },
          { label: "Observações", value: area.observacoes || "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        <button onClick={onEditar} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
          <Icone name="edit" className="text-lg" /> Editar
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            area.ativo ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={area.ativo ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {area.ativo ? "Desativar" : "Ativar"}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: VAGAS
// ════════════════════════════════════════════
function AbaVagas() {
  const [vagas, setVagas] = useState([]);
  const [apartamentos, setApartamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroAptId, setFiltroAptId] = useState("todos");
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erroCriar, setErroCriar] = useState("");
  const [erroEditar, setErroEditar] = useState("");

  useEffect(() => {
    Promise.all([vagaApi.listarTodas(), apartamentoApi.listarTodos()])
      .then(([resVagas, resApts]) => {
        setVagas(resVagas.data);
        setApartamentos(resApts.data);
      })
      .catch((err) => console.error("Erro ao carregar vagas:", err))
      .finally(() => setCarregando(false));
  }, []);

  const filtrados = vagas.filter((v) => {
    const q = busca.toLowerCase();
    const matchBusca =
      v.numero.toLowerCase().includes(q) ||
      v.localizacao?.toLowerCase().includes(q);
    const matchApt =
      filtroAptId === "todos" ||
      (filtroAptId === "sem-apt" ? !v.apartamentoId : v.apartamentoId === filtroAptId);
    return matchBusca && matchApt;
  });

  async function handleCriar(dados, aptId) {
    setErroCriar("");
    try {
      const res = await vagaApi.cadastrar(dados, aptId || undefined);
      setVagas((prev) => [res.data, ...prev]);
      setCriando(false);
    } catch (err) {
      const d = err.response?.data;
      setErroCriar(d?.mensagem || d?.message || "Erro ao criar vaga.");
    }
  }

  async function handleAtualizar(id, dados, aptId) {
    setErroEditar("");
    try {
      const res = await vagaApi.atualizar(id, dados, aptId);
      setVagas((prev) => prev.map((v) => (v.id === id ? res.data : v)));
      setEditando(null);
    } catch (err) {
      const d = err.response?.data;
      setErroEditar(d?.mensagem || d?.message || "Erro ao atualizar vaga.");
    }
  }

  async function handleToggleAtivo(vaga) {
    try {
      if (vaga.ativa) {
        await vagaApi.desativar(vaga.id);
      } else {
        await vagaApi.ativar(vaga.id);
      }
      setVagas((prev) =>
        prev.map((v) => (v.id === vaga.id ? { ...v, ativa: !vaga.ativa } : v)),
      );
    } catch (err) {
      console.error("Erro ao alterar status da vaga:", err);
    }
  }

  return (
    <>
      {/* Stats + botão */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-3 flex-wrap">
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-on-surface">{vagas.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Total</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-primary">{vagas.filter((v) => v.ativa).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Ativas</p>
          </div>
          <div className="glass-panel rounded-2xl px-5 py-3 text-center">
            <p className="text-2xl font-headline font-bold text-error">{vagas.filter((v) => !v.ativa).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">Inativas</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); setErroCriar(""); setErroEditar(""); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? "Cancelar" : "Nova Vaga"}
        </button>
      </div>

      {/* Form nova vaga */}
      {criando && (
        <div className="glass-panel rounded-3xl p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="local_parking" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">Nova Vaga</h2>
          </div>
          <FormVaga
            apartamentos={apartamentos}
            onSalvar={handleCriar}
            onCancelar={() => { setCriando(false); setErroCriar(""); }}
            erro={erroCriar}
          />
        </div>
      )}

      {/* Filtro por apartamento + busca */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <Campo
            id="busca-vaga"
            placeholder="Buscar por número ou localização..."
            icon="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="shrink-0">
          <select
            value={filtroAptId}
            onChange={(e) => setFiltroAptId(e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            <option value="todos">Todos</option>
            <option value="sem-apt">Sem apartamento</option>
            {apartamentos.map((a) => (
              <option key={a.id} value={a.id}>Apt {a.numero} · {a.blocoNome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-10 text-center text-on-surface-variant">Nenhuma vaga encontrada.</div>
          )}
          {filtrados.map((vaga) => (
            <div key={vaga.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === vaga.id ? null : vaga.id)); setEditando(null); }}
                className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="local_parking" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">Vaga {vaga.numero}</p>
                  <p className="text-on-surface-variant text-sm truncate">
                    {vaga.apartamentoNumero ? `Apt ${vaga.apartamentoNumero}` : "Sem apartamento"}
                    {vaga.localizacao ? ` · ${vaga.localizacao}` : ""}
                  </p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: "Tipo", value: vaga.tipo || "—" },
                    { label: "Apartamento", value: vaga.apartamentoNumero ? `Apt ${vaga.apartamentoNumero}` : "—" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(vaga.ativa)}`}>
                  {vaga.ativa ? "ativa" : "inativa"}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === vaga.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === vaga.id && (
                <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5">
                  {editando === vaga.id ? (
                    <FormVaga
                      inicial={vaga}
                      apartamentos={apartamentos}
                      onSalvar={(dados, aptId) => handleAtualizar(vaga.id, dados, aptId)}
                      onCancelar={() => { setEditando(null); setErroEditar(""); }}
                      erro={erroEditar}
                    />
                  ) : (
                    <DetalhesVaga
                      vaga={vaga}
                      onEditar={() => setEditando(vaga.id)}
                      onToggleAtivo={() => handleToggleAtivo(vaga)}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FormVaga({ inicial, apartamentos, onSalvar, onCancelar, erro }) {
  const [form, setForm] = useState({
    numero: inicial?.numero || "",
    localizacao: inicial?.localizacao || "",
    tipo: inicial?.tipo || "",
  });
  const [aptId, setAptId] = useState(inicial?.apartamentoId?.toString() || "");

  function set(field, value) { setForm((f) => ({ ...f, [field]: value })); }

  function handleSubmit(e) {
    e.preventDefault();
    onSalvar(form, aptId);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="vaga-numero"
          label="Número"
          placeholder="Ex: 12"
          required
          value={form.numero}
          onChange={(e) => set("numero", e.target.value)}
        />
        <Campo
          id="vaga-local"
          label="Localização"
          placeholder="Ex: Setor A - Térreo"
          value={form.localizacao}
          onChange={(e) => set("localizacao", e.target.value)}
        />
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Tipo</label>
          <select
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            <option value="">Selecione um tipo</option>
            <option value="Coberta">Coberta</option>
            <option value="Descoberta">Descoberta</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">Apartamento (opcional)</label>
          <select
            value={aptId}
            onChange={(e) => setAptId(e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            <option value="">Sem apartamento</option>
            {apartamentos.map((a) => (
              <option key={a.id} value={a.id}>Apt {a.numero} · {a.blocoNome}</option>
            ))}
          </select>
        </div>
      </div>
      {erro && <p className="text-error text-xs">{erro}</p>}
      <div className="flex gap-3 pt-2">
        <Botao type="submit">{inicial ? "Salvar alterações" : "Cadastrar vaga"}</Botao>
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

function DetalhesVaga({ vaga, onEditar, onToggleAtivo }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Número", value: vaga.numero },
          { label: "Tipo", value: vaga.tipo || "—" },
          { label: "Localização", value: vaga.localizacao || "—" },
          { label: "Apartamento", value: vaga.apartamentoNumero ? `Apt ${vaga.apartamentoNumero}` : "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-3 pt-1">
        <button
          onClick={onEditar}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
        >
          <Icone name="edit" className="text-lg" /> Editar
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            vaga.ativa ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={vaga.ativa ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {vaga.ativa ? "Desativar" : "Ativar"}
        </button>
      </div>
    </div>
  );
}
