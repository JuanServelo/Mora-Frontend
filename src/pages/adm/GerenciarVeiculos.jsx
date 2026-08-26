import { useState, useEffect, useCallback } from "react";
import { veiculoApi, moradorApi, vagaApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS, podeAcessarAdmin } from "../../utils/perfis";

const CATEGORIAS = [
  { value: "CARRO", label: "Carro", icon: "directions_car" },
  { value: "MOTO", label: "Moto", icon: "two_wheeler" },
  { value: "VEICULO_SERVICO", label: "Veículo de Serviço", icon: "local_shipping" },
];

const STATUS_STYLE = {
  DENTRO: "bg-primary/10 text-primary",
  SAIU: "bg-outline-variant/20 text-on-surface-variant",
};

function badgeCategoria(categoria) {
  const cat = CATEGORIAS.find((c) => c.value === categoria);
  return cat ? cat.label : categoria;
}

function iconeCategoria(categoria) {
  const cat = CATEGORIAS.find((c) => c.value === categoria);
  return cat ? cat.icon : "directions_car";
}

function formatarPlaca(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}

// ─── Formulário de cadastro / edição ─────────────────────────────
function FormVeiculo({ moradores, vagas, categorias, inicial, onSalvar, onCancelar, salvando }) {
  const [form, setForm] = useState(
    inicial ?? {
      placa: "",
      modelo: "",
      categoria: categorias[0]?.value ?? "CARRO",
      proprietarioId: "",
      vagaId: "",
    }
  );
  const [erros, setErros] = useState({});

  const isServico = form.categoria === "VEICULO_SERVICO";

  const vagasFiltradas = form.proprietarioId
    ? vagas.filter((v) => {
        const morador = moradores.find((m) => m.id === form.proprietarioId);
        return morador ? v.apartamentoId === morador.apartamentoId : true;
      })
    : vagas;

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "proprietarioId") next.vagaId = "";
      if (field === "categoria" && value === "VEICULO_SERVICO") {
        next.proprietarioId = "";
        next.vagaId = "";
      }
      return next;
    });
    setErros((e) => ({ ...e, [field]: undefined }));
  }

  function validar() {
    const e = {};
    if (!form.placa.trim()) e.placa = "Placa é obrigatória.";
    if (!isServico) {
      if (!form.proprietarioId) e.proprietarioId = "Proprietário é obrigatório.";
      if (!form.vagaId) e.vagaId = "Vaga é obrigatória.";
    }
    setErros(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) return;
    onSalvar({
      placa: form.placa,
      modelo: form.modelo,
      categoria: form.categoria,
      proprietarioId: isServico ? undefined : form.proprietarioId || undefined,
      vagaId: isServico ? undefined : form.vagaId || undefined,
    });
  }

  const selectCls =
    "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";
  const labelCls =
    "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Categoria */}
      <div className="space-y-2">
        <label className={labelCls}>Categoria *</label>
        <div className="flex gap-2 flex-wrap">
          {categorias.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => set("categoria", c.value)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                form.categoria === c.value
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "border-outline-variant/20 text-on-surface-variant hover:border-primary/20"
              }`}
            >
              <Icone name={c.icon} className="text-base" />
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Placa + Modelo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Campo
            id="placa"
            label="Placa *"
            placeholder="ABC1D23"
            icon="credit_card"
            value={form.placa}
            onChange={(e) => set("placa", formatarPlaca(e.target.value))}
            maxLength={7}
            className={erros.placa ? "ring-2 ring-error/60" : ""}
          />
          {erros.placa && <p className="text-error text-xs mt-1 ml-1">{erros.placa}</p>}
        </div>
        <Campo
          id="modelo"
          label="Modelo"
          placeholder="Ex: Fiat Uno, Honda CB500"
          icon="directions_car"
          value={form.modelo}
          onChange={(e) => set("modelo", e.target.value)}
        />
      </div>

      {/* Proprietário + Vaga (apenas para não-serviço) */}
      {!isServico && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className={labelCls}>Proprietário (Morador) *</label>
            <select
              value={form.proprietarioId}
              onChange={(e) => set("proprietarioId", e.target.value)}
              className={`${selectCls} ${erros.proprietarioId ? "ring-2 ring-error/60" : ""}`}
            >
              <option value="">— Selecione —</option>
              {moradores.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome} {m.apartamentoNumero ? `· Apto ${m.apartamentoNumero}` : ""}
                </option>
              ))}
            </select>
            {erros.proprietarioId && (
              <p className="text-error text-xs ml-1">{erros.proprietarioId}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Vaga *</label>
            <select
              value={form.vagaId}
              onChange={(e) => set("vagaId", e.target.value)}
              disabled={!form.proprietarioId && vagasFiltradas.length === 0}
              className={`${selectCls} ${erros.vagaId ? "ring-2 ring-error/60" : ""}`}
            >
              <option value="">— Selecione —</option>
              {vagasFiltradas.map((v) => (
                <option key={v.id} value={v.id}>
                  Vaga {v.numero}
                  {v.localizacao ? ` · ${v.localizacao}` : ""}
                  {v.apartamentoNumero ? ` · Apto ${v.apartamentoNumero}` : ""}
                </option>
              ))}
            </select>
            {erros.vagaId && <p className="text-error text-xs ml-1">{erros.vagaId}</p>}
            {form.proprietarioId && vagasFiltradas.length === 0 && (
              <p className="text-xs text-on-surface-variant ml-1">
                Nenhuma vaga vinculada ao apartamento deste morador.
              </p>
            )}
          </div>
        </div>
      )}

      {isServico && (
        <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
          <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
          <span>
            Veículos de serviço não precisam de proprietário nem vaga. A entrada pode ser
            registrada a qualquer momento.
          </span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? "Salvando…" : inicial ? "Salvar Alterações" : "Cadastrar Veículo"}
          <Icone name={inicial ? "check" : "add"} className="text-xl" />
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

// ─── Modal de alterar vaga ───────────────────────────────────────
function ModalAlterarVaga({ veiculo, vagas, moradores, onSalvar, onFechar, salvando }) {
  const [vagaId, setVagaId] = useState(veiculo.vagaId ?? "");

  const vagasFiltradas = veiculo.proprietarioId
    ? vagas.filter((v) => {
        const morador = moradores.find((m) => m.id === veiculo.proprietarioId);
        return morador ? v.apartamentoId === morador.apartamentoId : true;
      })
    : vagas;

  const selectCls =
    "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-headline text-lg font-bold text-on-surface min-w-0">
            Alterar Vaga — {veiculo.placa}
          </h3>
          <button onClick={onFechar} className="shrink-0 text-on-surface-variant hover:text-on-surface cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            Nova Vaga
          </label>
          <select value={vagaId} onChange={(e) => setVagaId(e.target.value)} className={selectCls}>
            {veiculo.categoria === "VEICULO_SERVICO" && <option value="">— Sem vaga —</option>}
            {vagasFiltradas.map((v) => (
              <option key={v.id} value={v.id}>
                Vaga {v.numero}
                {v.localizacao ? ` · ${v.localizacao}` : ""}
                {v.apartamentoNumero ? ` · Apto ${v.apartamentoNumero}` : ""}
              </option>
            ))}
          </select>
          {vagasFiltradas.length === 0 && (
            <p className="text-xs text-on-surface-variant ml-1">
              Nenhuma vaga disponível para o apartamento deste proprietário.
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Botao onClick={() => onSalvar(vagaId)} disabled={salvando}>
            {salvando ? "Salvando…" : "Confirmar"}
            <Icone name="check" className="text-xl" />
          </Botao>
          <button
            onClick={onFechar}
            className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cartão de veículo ───────────────────────────────────────────
function CartaoVeiculo({ veiculo, onEntrada, onSaida, onAlterarVaga, onEditar }) {
  const dentro = veiculo.status === "DENTRO";
  const semVaga = !veiculo.vagaId && veiculo.categoria !== "VEICULO_SERVICO";

  return (
    <div className="glass-panel rounded-3xl overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Ícone categoria */}
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icone name={iconeCategoria(veiculo.categoria)} className="text-primary text-2xl" />
        </div>

        {/* Info principal */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-headline text-lg font-bold text-on-surface">{veiculo.placa}</p>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[veiculo.status]}`}
            >
              {dentro ? "Dentro" : "Fora"}
            </span>
            {semVaga && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-error/10 text-error">
                Sem vaga
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-sm">
            {veiculo.modelo ?? "Modelo não informado"} · {badgeCategoria(veiculo.categoria)}
          </p>
          {veiculo.vagaNumero && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              <Icone name="local_parking" className="text-sm mr-0.5" />
              Vaga {veiculo.vagaNumero}
              {veiculo.vagaLocalizacao ? ` · ${veiculo.vagaLocalizacao}` : ""}
              {veiculo.apartamentoNumero ? ` · Apto ${veiculo.apartamentoNumero}` : ""}
            </p>
          )}
          {dentro && veiculo.dataEntrada && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              Entrou: {new Date(veiculo.dataEntrada).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          )}
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {!dentro ? (
            <button
              onClick={() => onEntrada(veiculo)}
              disabled={semVaga}
              title={semVaga ? "Vincule uma vaga antes de registrar entrada" : "Registrar entrada"}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                semVaga
                  ? "border-outline-variant/20 text-outline-variant cursor-not-allowed opacity-50"
                  : "border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
              }`}
            >
              <Icone name="login" className="text-base" />
              Entrada
            </button>
          ) : (
            <button
              onClick={() => onSaida(veiculo)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-secondary/30 text-secondary hover:bg-secondary/10 transition-all cursor-pointer"
            >
              <Icone name="logout" className="text-base" />
              Saída
            </button>
          )}
          <button
            onClick={() => onAlterarVaga(veiculo)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/30 transition-all cursor-pointer"
          >
            <Icone name="local_parking" className="text-base" />
            Vaga
          </button>
          <button
            onClick={() => onEditar(veiculo)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/30 transition-all cursor-pointer"
          >
            <Icone name="edit" className="text-base" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ────────────────────────────────────────────
export function GerenciarVeiculos() {
  const toast = useToast();
  const confirm = useConfirm();
  const { usuario } = useAuth();

  const isDoorman = usuario?.perfil === PERFIS.PORTEIRO;
  const isAdminLevel = podeAcessarAdmin(usuario?.perfil);
  // Restringe proprietários e vagas à unidade do usuário quando ele é residente
  const filtrarPorUnidade = !isAdminLevel && !isDoorman && Boolean(usuario?.unidadeId);

  // Categorias disponíveis: VEICULO_SERVICO só para porteiro
  const categoriasDisponiveis = CATEGORIAS.filter(
    (c) => isDoorman || c.value !== "VEICULO_SERVICO"
  );

  const [veiculos, setVeiculos] = useState([]);
  const [moradores, setMoradores] = useState([]);
  const [vagas, setVagas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [alterandoVaga, setAlterandoVaga] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroCategoria, setFiltroCategoria] = useState("TODOS");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [veicRes, morRes, vagRes] = await Promise.all([
        veiculoApi.listar(),
        moradorApi.listarTodos(),
        vagaApi.listarTodas(),
      ]);

      setVeiculos(veicRes.data || []);

      const mors = (morRes.data || []).map((m) => ({
        ...m,
        apartamentoId: m.apartamento?.id ?? null,
        apartamentoNumero: m.apartamento?.numero ?? null,
      }));
      setMoradores(mors);

      const vags = (vagRes.data || [])
        .filter((v) => v.ativa)
        .map((v) => ({
          ...v,
          apartamentoId: v.apartamentoId ?? null,
          apartamentoNumero: v.apartamentoNumero ?? null,
        }));
      setVagas(vags);
    } catch {
      toast.error("Erro ao carregar dados.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleCadastrar(dados) {
    setSalvando(true);
    try {
      const res = await veiculoApi.cadastrar(dados);
      setVeiculos((prev) => [res.data, ...prev]);
      setCriando(false);
      toast.success("Veículo cadastrado com sucesso.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao cadastrar veículo.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleAtualizar(dados) {
    setSalvando(true);
    try {
      const res = await veiculoApi.atualizar(editando.id, dados);
      setVeiculos((prev) => prev.map((v) => (v.id === editando.id ? res.data : v)));
      setEditando(null);
      toast.success("Veículo atualizado.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao atualizar veículo.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleEntrada(veiculo) {
    try {
      const res = await veiculoApi.registrarEntrada(veiculo.id);
      setVeiculos((prev) => prev.map((v) => (v.id === veiculo.id ? res.data : v)));
      toast.success(`Entrada de ${veiculo.placa} registrada.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao registrar entrada.");
    }
  }

  async function handleSaida(veiculo) {
    try {
      const res = await veiculoApi.registrarSaida(veiculo.id);
      setVeiculos((prev) => prev.map((v) => (v.id === veiculo.id ? res.data : v)));
      toast.success(`Saída de ${veiculo.placa} registrada.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao registrar saída.");
    }
  }

  async function handleAlterarVaga(vagaId) {
    setSalvando(true);
    try {
      const res = await veiculoApi.alterarVaga(alterandoVaga.id, vagaId || null);
      setVeiculos((prev) => prev.map((v) => (v.id === alterandoVaga.id ? res.data : v)));
      setAlterandoVaga(null);
      toast.success("Vaga alterada com sucesso.");
    } catch (err) {
      toast.error(err.response?.data?.message || "Erro ao alterar vaga.");
    } finally {
      setSalvando(false);
    }
  }

  // Moradores e vagas restritos à unidade quando usuário é residente
  const moradoresForm = filtrarPorUnidade
    ? moradores.filter((m) => m.apartamentoId === usuario.unidadeId)
    : moradores;

  const vagasForm = filtrarPorUnidade
    ? vagas.filter((v) => v.apartamentoId === usuario.unidadeId)
    : vagas;

  const filtrados = veiculos.filter((v) => {
    const q = busca.toLowerCase();
    const matchBusca =
      v.placa.toLowerCase().includes(q) ||
      (v.modelo ?? "").toLowerCase().includes(q) ||
      (v.vagaNumero ?? "").toLowerCase().includes(q);
    const matchStatus = filtroStatus === "TODOS" || v.status === filtroStatus;
    const matchCat = filtroCategoria === "TODOS" || v.categoria === filtroCategoria;
    return matchBusca && matchStatus && matchCat;
  });

  const dentro = veiculos.filter((v) => v.status === "DENTRO").length;
  const semVaga = veiculos.filter((v) => !v.vagaId && v.categoria !== "VEICULO_SERVICO").length;

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
                Veículos
              </span>
            </h1>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => { setCriando((c) => !c); setEditando(null); }}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all border cursor-pointer ${
                criando
                  ? "border-error/30 text-error hover:bg-error/10"
                  : "border-primary/30 text-primary hover:bg-primary/10"
              }`}
            >
              <Icone name={criando ? "close" : "add"} className="text-xl" />
              {criando ? "Cancelar" : "Novo Veículo"}
            </button>

            <div className="flex gap-3">
              {[
                { label: "Total", value: veiculos.length, color: "text-on-surface" },
                { label: "Dentro", value: dentro, color: "text-primary" },
                { label: "Sem Vaga", value: semVaga, color: "text-error" },
              ].map((s) => (
                <div key={s.label} className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
                  <p className={`text-2xl font-headline font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-on-surface-variant text-xs uppercase tracking-wider">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </header>

        {/* Formulário de cadastro */}
        {criando && (
          <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-primary/15">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                <Icone name="add" className="text-primary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">Novo Veículo</h2>
            </div>
            <FormVeiculo
              moradores={moradoresForm}
              vagas={vagasForm}
              categorias={categoriasDisponiveis}
              onSalvar={handleCadastrar}
              onCancelar={() => setCriando(false)}
              salvando={salvando}
            />
          </div>
        )}

        {/* Formulário de edição */}
        {editando && (
          <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-secondary/15">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 shrink-0 rounded-xl bg-secondary/10 flex items-center justify-center">
                <Icone name="edit" className="text-secondary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-on-surface">
                Editar Veículo — {editando.placa}
              </h2>
            </div>
            <FormVeiculo
              moradores={moradoresForm}
              vagas={vagasForm}
              categorias={categoriasDisponiveis}
              inicial={{
                placa: editando.placa,
                modelo: editando.modelo ?? "",
                categoria: editando.categoria,
                proprietarioId: editando.proprietarioId ?? "",
                vagaId: editando.vagaId ?? "",
              }}
              onSalvar={handleAtualizar}
              onCancelar={() => setEditando(null)}
              salvando={salvando}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 max-w-sm">
            <Campo
              id="busca"
              placeholder="Buscar por placa, modelo ou vaga..."
              icon="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>

          <div className="glass-panel rounded-2xl p-1 flex gap-1">
            {["TODOS", "DENTRO", "SAIU"].map((s) => (
              <button
                key={s}
                onClick={() => setFiltroStatus(s)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filtroStatus === s
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {s === "TODOS" ? "Todos" : s === "DENTRO" ? "Dentro" : "Fora"}
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl p-1 flex gap-1 flex-wrap">
            {["TODOS", ...categoriasDisponiveis.map((c) => c.value)].map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroCategoria(cat)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filtroCategoria === cat
                    ? "bg-primary/15 text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {cat === "TODOS" ? "Todos" : categoriasDisponiveis.find((c) => c.value === cat)?.label ?? cat}
              </button>
            ))}
          </div>
        </div>

        {/* Lista */}
        {carregando ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            Carregando veículos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            Nenhum veículo encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((v) => (
              <CartaoVeiculo
                key={v.id}
                veiculo={v}
                onEntrada={handleEntrada}
                onSaida={handleSaida}
                onAlterarVaga={setAlterandoVaga}
                onEditar={setEditando}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal alterar vaga */}
      {alterandoVaga && (
        <ModalAlterarVaga
          veiculo={alterandoVaga}
          vagas={vagas}
          moradores={moradores}
          onSalvar={handleAlterarVaga}
          onFechar={() => setAlterandoVaga(null)}
          salvando={salvando}
        />
      )}
    </div>
  );
}
