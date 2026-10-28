// src/pages/adm/GerenciarEstruturas.jsx
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../../i18n";
import { blocoApi, apartamentoApi, areaComunApi } from "../../services/estruturasApi";
import { vagaApi } from "../../services/portariaApi";
import { condominiosApi } from "../../services/condominiosApi";
import { planApi } from "../../services/planApi";
import api from "../../services/api";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { PERFIS, perfisCadastroDisponiveis } from "../../utils/perfis";
import { ModalFuncionamento } from "../../components/agenda/ModalFuncionamento";
import { SeletorCondominio } from "../../components/adm/SeletorCondominio";
import { formatarUnidade } from "../../utils/unidades";

const TIPOS_AREA = ["PISCINA", "SALAO_FESTAS", "ACADEMIA", "CHURRASQUEIRA", "QUADRA", "PLAYGROUND", "OUTRO"];

const statusStyle = (ativo) =>
  ativo ? "bg-primary/10 text-primary" : "bg-error/10 text-error";

const selectCls = "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";

// ════════════════════════════════════════════
export function GerenciarEstruturas() {
  const { t } = useTranslation("estruturas");
  const { usuario } = useAuth();
  const isGerente = usuario?.perfil === PERFIS.ADMIN_GERAL;

  const [condominios, setCondominios] = useState([]);
  const [condominioId, setCondominioId] = useState(null);
  const [modulosCondominio, setModulosCondominio] = useState([]);
  const [aba, setAba] = useState("blocos");

  useEffect(() => {
    if (isGerente) {
      condominiosApi.listarAtivos().then((res) => {
        const lista = res.data.condominios || [];
        setCondominios(lista);
        if (lista.length > 0) setCondominioId(lista[0].id);
      }).catch(() => {});
    } else {
      // Não-gerentes ficam escopados ao próprio condomínio
      setCondominioId(usuario?.condominioId ?? null);
    }
  }, [isGerente, usuario]);

  useEffect(() => {
    if (!condominioId) {
      setModulosCondominio([]);
      return;
    }
    planApi.assinaturaVigente(condominioId)
      .then(res => setModulosCondominio(res.data?.modulosAtivos || []))
      .catch(() => setModulosCondominio([]));
  }, [condominioId]);

  const condominioAtual = condominios.find((c) => c.id === condominioId);

  if (!condominioId) {
    return (
      <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6 flex items-center justify-center">
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center max-w-md">
          <Icone name="domain" className="text-primary text-4xl mb-4" />
          <h2 className="font-headline text-xl font-bold text-on-surface mb-2">{t("pagina.semCliente")}</h2>
          <p className="text-on-surface-variant text-sm">{t("pagina.semClienteAntes")}<strong>{t("pagina.semClienteLink")}</strong>{t("pagina.semClienteDepois")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              {t("pagina.painel")}
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              {t("pagina.estruturas")}{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                {t("pagina.fisicas")}
              </span>
            </h1>
          </div>
        </header>

        {/* Seletor de cliente */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Icone name="domain" className="text-primary text-lg" />
            </div>
            <p className="text-xs font-semibold uppercase tracking-widest text-on-surface-variant">
              {t("pagina.cliente")}
            </p>
          </div>

          <SeletorCondominio
            condominios={isGerente ? condominios : []}
            value={condominioId ?? ""}
            onChange={(id) => { setCondominioId(id); setAba("blocos"); }}
            selectClassName="flex-1 bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface font-semibold focus:ring-2 focus:ring-primary/50 focus:outline-none"
            readonlyClassName="text-on-surface font-semibold"
            nomeAlternativo={condominioAtual?.nome ?? condominioId}
          />

          <div className="flex gap-2 shrink-0 text-xs text-on-surface-variant font-mono">
            <span className="px-2 py-1 rounded-lg bg-surface-container-highest/30">{condominioId}</span>
          </div>
        </div>

        {/* Sub-navbar de abas */}
        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "blocos", rotuloKey: "abas.blocos", icon: "apartment" },
            { id: "areas-comuns", rotuloKey: "abas.areasComuns", icon: "pool" },
            ...(modulosCondominio.includes("vagas") ? [{ id: "vagas", rotuloKey: "abas.vagas", icon: "local_parking" }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-veu/5"
              }`}
            >
              <Icone name={tab.icon} className="text-lg" />
              {t(tab.rotuloKey)}
            </button>
          ))}
        </div>

        {/* Conteúdo por aba — passa condominioId para cada aba */}
        {aba === "blocos" && <AbaBlocos key={condominioId} condominioId={condominioId} />}
        {aba === "areas-comuns" && (
          <AbaAreasComuns
            key={condominioId}
            condominioId={condominioId}
            condominioNome={condominioAtual?.nome ?? condominioId}
          />
        )}
        {aba === "vagas" && <AbaVagas key={condominioId} condominioId={condominioId} />}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: BLOCOS
// ════════════════════════════════════════════
function AbaBlocos({ condominioId }) {
  const { t } = useTranslation("estruturas");
  const toast = useToast();
  const [blocos, setBlocos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [blocoSelecionado, setBlocoSelecionado] = useState(null);

  useEffect(() => {
    setCarregando(true);
    setBlocos([]);
    blocoApi
      .listarTodos(condominioId)
      .then((res) => setBlocos(res.data))
      .catch((err) => console.error("Erro ao carregar blocos:", err))
      .finally(() => setCarregando(false));
  }, [condominioId]);

  const filtrados = blocos.filter((b) =>
    b.nome.toLowerCase().includes(busca.toLowerCase()) ||
    b.descricao?.toLowerCase().includes(busca.toLowerCase()),
  );

  async function handleCriar(dados) {
    try {
      const res = await blocoApi.cadastrar({ ...dados, condominioId });
      setBlocos((prev) => [res.data, ...prev]);
      setCriando(false);
      toast.success(t("blocos.toast.criado"));
    } catch (err) {
      toast.error(err.response?.data?.erro || t("blocos.toast.erroCriar"));
    }
  }

  async function handleAtualizar(id, dados) {
    try {
      const res = await blocoApi.atualizar(id, dados);
      setBlocos((prev) => prev.map((b) => (b.id === id ? res.data : b)));
      toast.success(t("blocos.toast.atualizado"));
      return res.data;
    } catch (err) {
      toast.error(err.response?.data?.erro || t("blocos.toast.erroAtualizar"));
      return null;
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
      toast.success(bloco.ativo ? t("blocos.toast.desativado") : t("blocos.toast.reativado"));
    } catch (err) {
      toast.error(err.response?.data?.erro || t("blocos.toast.erroStatus"));
    }
  }

  if (blocoSelecionado) {
    return (
      <VistaApartamentos
        bloco={blocoSelecionado}
        condominioId={condominioId}
        onVoltar={() => setBlocoSelecionado(null)}
        onEditarBloco={async (dados) => {
          const atualizado = await handleAtualizar(blocoSelecionado.id, dados);
          if (atualizado) setBlocoSelecionado(atualizado);
        }}
        onToggleAtivoBloco={async () => {
          await handleToggleAtivo(blocoSelecionado);
          setBlocoSelecionado((b) => ({ ...b, ativo: !b.ativo }));
        }}
      />
    );
  }

  return (
    <>
      {/* Stats + botão */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-on-surface">{blocos.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.total")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-primary">{blocos.filter((b) => b.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.ativos")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-error">{blocos.filter((b) => !b.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.inativos")}</p>
          </div>
        </div>
        <button
          onClick={() => setCriando((c) => !c)}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? t("comum:acoes.cancelar") : t("blocos.novo")}
        </button>
      </div>

      {/* Form novo bloco */}
      {criando && (
        <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="apartment" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">{t("blocos.novo")}</h2>
          </div>
          <FormBloco onSalvar={handleCriar} onCancelar={() => setCriando(false)} />
        </div>
      )}

      {/* Busca */}
      <div className="max-w-md">
        <Campo
          id="busca-bloco"
          placeholder={t("blocos.buscaPlaceholder")}
          icon="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("geral.carregando")}</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("blocos.vazio")}</div>
          )}
          {filtrados.map((bloco) => (
            <div key={bloco.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => setBlocoSelecionado(bloco)}
                className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-veu/5 transition-all cursor-pointer"
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
                    { label: t("campos.andares"), value: bloco.andares ?? "—" },
                    { label: t("campos.aptsAndar"), value: bloco.apartamentosPorAndar ?? "—" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(bloco.ativo)}`}>
                  {bloco.ativo ? t("status.ativo") : t("status.inativo")}
                </span>
                <span className="hidden md:flex items-center gap-1 text-primary text-sm font-semibold shrink-0">
                  {t("blocos.verApartamentos")}
                  <Icone name="chevron_right" className="text-lg" />
                </span>
                <Icone name="chevron_right" className="text-outline shrink-0 md:hidden" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

const MAX_ANDARES = 163;
const MAX_APTOS_POR_ANDAR = 30;
const MIN_AREA_M2 = 10;
const MAX_AREA_M2 = 2000;
const MIN_QUARTOS = 1;
const MAX_QUARTOS = 10;
const MIN_CAPACIDADE = 1;
const MAX_CAPACIDADE = 500;
const MIN_AREA_COMUM_M2 = 5;
const MAX_AREA_COMUM_M2 = 10000;
/** Um ano. Espelha o CHECK da migração V3 do portaria-service. */
export const MAX_ANTECEDENCIA_HORAS = 8760;

/** Lê a antecedência em dias quando o número for redondo — "48" vira "2 dias". */
export function descreverAntecedencia(valor) {
  const horas = Number(valor || 0);
  if (!Number.isFinite(horas) || horas <= 0) {
    return i18n.t("estruturas:antecedencia.semExigencia");
  }
  const texto = horas % 24 === 0
    ? i18n.t("estruturas:antecedencia.dias", { count: horas / 24 })
    : i18n.t("estruturas:antecedencia.horas", { count: horas });
  return i18n.t("estruturas:antecedencia.exige", { texto });
}

function FormBloco({ inicial, onSalvar, onCancelar }) {
  const { t } = useTranslation("estruturas");
  const [form, setForm] = useState({
    nome: inicial?.nome || "",
    sigla: inicial?.sigla || "",
    descricao: inicial?.descricao || "",
    andares: inicial?.andares?.toString() || "",
    apartamentosPorAndar: inicial?.apartamentosPorAndar?.toString() || "",
  });
  const [erros, setErros] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErros((e) => ({ ...e, [field]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const novosErros = {};
    const andares = form.andares ? Number(form.andares) : null;
    const aptsAndar = form.apartamentosPorAndar ? Number(form.apartamentosPorAndar) : null;

    if (!form.nome.trim()) {
      novosErros.nome = t("validacao.nomeObrigatorio");
    }
    if (!form.andares) {
      novosErros.andares = t("validacao.andaresObrigatorio");
    } else if (andares < 1) {
      novosErros.andares = t("validacao.inteiroPositivo");
    } else if (andares > MAX_ANDARES) {
      novosErros.andares = t("validacao.maxAndares", { max: MAX_ANDARES });
    }
    if (!form.apartamentosPorAndar) {
      novosErros.apartamentosPorAndar = t("validacao.aptosPorAndarObrigatorio");
    } else if (aptsAndar < 1) {
      novosErros.apartamentosPorAndar = t("validacao.inteiroPositivo");
    } else if (aptsAndar > MAX_APTOS_POR_ANDAR) {
      novosErros.apartamentosPorAndar = t("validacao.maxAptosPorAndar", { max: MAX_APTOS_POR_ANDAR });
    }

    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      const firstKey = Object.keys(novosErros)[0];
      const ids = { nome: "bloco-nome", andares: "bloco-andares", apartamentosPorAndar: "bloco-aptsandar" };
      document.getElementById(ids[firstKey])?.focus();
      return;
    }
    onSalvar({ ...form, andares, apartamentosPorAndar: aptsAndar });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo id="bloco-nome" label={t("campos.nome")} placeholder={t("placeholders.blocoNome")} required value={form.nome} onChange={(e) => set("nome", e.target.value)} error={erros.nome} />
        <Campo id="bloco-sigla" label={t("campos.sigla")} placeholder={t("placeholders.blocoSigla")} optional value={form.sigla} onChange={(e) => set("sigla", e.target.value)} />
        <Campo id="bloco-descricao" label={t("campos.descricao")} placeholder={t("placeholders.blocoDescricao")} optional value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
        <Campo id="bloco-andares" label={t("campos.andares")} type="number" min="1" max={MAX_ANDARES} placeholder={t("placeholders.andares")} required value={form.andares} onChange={(e) => set("andares", e.target.value)} error={erros.andares} />
        <Campo id="bloco-aptsandar" label={t("campos.aptosPorAndar")} type="number" min="1" max={MAX_APTOS_POR_ANDAR} placeholder={t("placeholders.aptosPorAndar")} required value={form.apartamentosPorAndar} onChange={(e) => set("apartamentosPorAndar", e.target.value)} error={erros.apartamentosPorAndar} />
      </div>
      <div className="flex gap-3 pt-2">
        <Botao type="submit">{inicial ? t("acoes.salvarAlteracoes") : t("blocos.cadastrar")}</Botao>
        <button type="button" onClick={onCancelar} className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 font-semibold transition-all cursor-pointer">
          {t("comum:acoes.cancelar")}
        </button>
      </div>
    </form>
  );
}

function DetalhesBloco({ bloco, onEditar, onToggleAtivo }) {
  const { t } = useTranslation("estruturas");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("campos.nome"), value: bloco.nome },
          { label: t("campos.sigla"), value: bloco.sigla || "—" },
          { label: t("campos.descricao"), value: bloco.descricao },
          { label: t("campos.andares"), value: bloco.andares ?? "—" },
          { label: t("campos.aptsAndar"), value: bloco.apartamentosPorAndar ?? "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button onClick={onEditar} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
          <Icone name="edit" className="text-lg" /> {t("comum:acoes.editar")}
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            bloco.ativo ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={bloco.ativo ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {bloco.ativo ? t("acoes.desativar") : t("acoes.ativar")}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// DRILL-DOWN: APARTAMENTOS DE UM BLOCO (+ convite)
// ════════════════════════════════════════════
function VistaApartamentos({ bloco, condominioId, onVoltar, onEditarBloco, onToggleAtivoBloco }) {
  const { t } = useTranslation("estruturas");
  const toast = useToast();
  const [apartamentos, setApartamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [editandoBloco, setEditandoBloco] = useState(false);
  const [erroCriar, setErroCriar] = useState("");
  const [erroEditar, setErroEditar] = useState("");

  useEffect(() => {
    apartamentoApi
      .listarPorBloco(bloco.id)
      .then((res) =>
        setApartamentos(res.data.map((a) => ({ ...a, blocoNome: a.blocoNome ?? bloco.nome }))),
      )
      .catch((err) => console.error("Erro ao carregar apartamentos do bloco:", err))
      .finally(() => setCarregando(false));
  }, [bloco.id, bloco.nome]);

  async function handleCriar(dados) {
    setErroCriar("");
    try {
      const res = await apartamentoApi.cadastrar(dados, bloco.id);
      setApartamentos((prev) => [{ ...res.data, blocoNome: res.data.blocoNome ?? bloco.nome }, ...prev]);
      setCriando(false);
      toast.success(t("apartamentos.toast.cadastrado"));
    } catch (err) {
      const d = err.response?.data;
      setErroCriar(d?.erro || (d?.erros ? Object.values(d.erros).join("; ") : null) || t("apartamentos.toast.erroCriar"));
    }
  }

  async function handleAtualizar(id, dados) {
    setErroEditar("");
    try {
      const res = await apartamentoApi.atualizar(id, dados, bloco.id);
      setApartamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...res.data, blocoNome: res.data.blocoNome ?? bloco.nome } : a)),
      );
      setEditando(null);
      toast.success(t("apartamentos.toast.atualizado"));
    } catch (err) {
      const d = err.response?.data;
      setErroEditar(d?.erro || (d?.erros ? Object.values(d.erros).join("; ") : null) || t("apartamentos.toast.erroAtualizar"));
    }
  }

  async function handleToggleAtivo(apt) {
    try {
      if (apt.ativo) await apartamentoApi.desativar(apt.id);
      else await apartamentoApi.ativar(apt.id);
      setApartamentos((prev) => prev.map((a) => (a.id === apt.id ? { ...a, ativo: !a.ativo } : a)));
    } catch (err) {
      console.error("Erro ao alterar status do apartamento:", err);
    }
  }

  return (
    <div className="space-y-6">
      {/* Voltar */}
      <button
        onClick={onVoltar}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface text-sm font-semibold w-fit transition-colors cursor-pointer"
      >
        <Icone name="arrow_back" className="text-lg" /> {t("apartamentos.voltarBlocos")}
      </button>

      {/* Cabeçalho do bloco */}
      <div className="glass-panel rounded-3xl p-5 flex items-center gap-4 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icone name="apartment" className="text-primary text-2xl" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-headline text-2xl font-bold text-on-surface truncate">{bloco.nome}</h2>
          <p className="text-on-surface-variant text-sm truncate">{bloco.descricao}</p>
        </div>
        <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(bloco.ativo)}`}>
          {bloco.ativo ? t("status.ativo") : t("status.inativo")}
        </span>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setEditandoBloco((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
          >
            <Icone name="edit" className="text-base" /> {t("blocos.editar")}
          </button>
          <button
            onClick={onToggleAtivoBloco}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
              bloco.ativo ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
            }`}
          >
            <Icone name={bloco.ativo ? "do_not_disturb_on" : "check_circle"} className="text-base" />
            {bloco.ativo ? t("acoes.desativar") : t("acoes.ativar")}
          </button>
        </div>
      </div>

      {editandoBloco && (
        <div className="glass-panel rounded-3xl p-6 border border-primary/15">
          <FormBloco
            inicial={bloco}
            onSalvar={async (dados) => { await onEditarBloco(dados); setEditandoBloco(false); }}
            onCancelar={() => setEditandoBloco(false)}
          />
        </div>
      )}

      {/* Stats + novo apartamento */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-on-surface">{apartamentos.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.apartamentos")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-primary">{apartamentos.filter((a) => a.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.ativos")}</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); setErroCriar(""); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? t("comum:acoes.cancelar") : t("apartamentos.novo")}
        </button>
      </div>

      {criando && (
        <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="door_front" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">{t("apartamentos.novoEm", { bloco: bloco.nome })}</h2>
          </div>
          <FormApartamento
            blocos={[bloco]}
            apartamentos={apartamentos}
            onSalvar={(dados) => handleCriar(dados)}
            onCancelar={() => { setCriando(false); setErroCriar(""); }}
            erro={erroCriar}
          />
        </div>
      )}

      {/* Lista de apartamentos */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("geral.carregando")}</div>
      ) : (
        <div className="space-y-3">
          {apartamentos.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("apartamentos.vazioBloco")}</div>
          )}
          {apartamentos.map((apt) => (
            <div key={apt.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === apt.id ? null : apt.id)); setEditando(null); }}
                className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-veu/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="door_front" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{t("apartamentos.apt", { numero: apt.numero })}</p>
                  <p className="text-on-surface-variant text-sm truncate">
                    {apt.andar != null ? t("apartamentos.andarOrdinal", { andar: apt.andar }) : "—"}{apt.quartos ? ` · ${t("apartamentos.quartos", { count: apt.quartos })}` : ""}
                  </p>
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(apt.ativo)}`}>
                  {apt.ativo ? t("status.ativo") : t("status.inativo")}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === apt.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === apt.id && (
                <div className="border-t border-outline-variant/15 px-5 pb-6 pt-5 space-y-6">
                  {editando === apt.id ? (
                    <FormApartamento
                      inicial={apt}
                      blocos={[bloco]}
                      apartamentos={apartamentos}
                      onSalvar={(dados) => handleAtualizar(apt.id, dados)}
                      onCancelar={() => { setEditando(null); setErroEditar(""); }}
                      erro={erroEditar}
                    />
                  ) : (
                    <>
                      <DetalhesApartamento apt={apt} onEditar={() => setEditando(apt.id)} onToggleAtivo={() => handleToggleAtivo(apt)} />
                      <div className="border-t border-outline-variant/15 pt-5">
                        <ConviteEstrutura apartamento={apt} bloco={bloco} condominioId={condominioId} />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Convite de morador atrelado a um apartamento ───
const PERFIS_UNIDADE_CONVITE = [
  PERFIS.MORADOR,
  PERFIS.DONO_ALUGUEL,
];

function ConviteEstrutura({ apartamento, bloco, condominioId }) {
  const { t } = useTranslation("estruturas");
  const { usuario } = useAuth();
  const toast = useToast();
  const opcoes = perfisCadastroDisponiveis(usuario?.perfil).filter((p) =>
    PERFIS_UNIDADE_CONVITE.includes(p.value),
  );
  const [perfil, setPerfil] = useState(opcoes[0]?.value || "");
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [copiado, setCopiado] = useState(false);

  if (opcoes.length === 0) {
    return (
      <p className="text-sm text-on-surface-variant">
        {t("convite.semPermissao")}
      </p>
    );
  }

  const link = resultado ? `${window.location.origin}/ativar?codigo=${resultado.convite.codigo}` : "";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !perfil) return;
    setEnviando(true);
    setResultado(null);
    try {
      const res = await api.post("/api/user-management/invites", {
        email: email.trim(),
        perfil,
        condominioId,
        unidadeId: apartamento.id,
      });
      setResultado(res.data);
      if (res.data.emailEnviado === false) {
        toast.warning(res.data.avisoEmail || t("convite.toast.semEmail"), {
          detalhe: t("convite.toast.codigo", { codigo: res.data.convite.codigo }),
        });
      } else {
        toast.success(t("convite.toast.enviado"));
      }
    } catch (err) {
      toast.error(err.response?.data?.mensagem || t("convite.toast.erro"));
    } finally {
      setEnviando(false);
    }
  }

  function copiar() {
    navigator.clipboard?.writeText(link);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  if (resultado) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-primary">
          <Icone name="check_circle" className="text-xl" />
          <p className="font-semibold">{t("convite.gerado", { numero: apartamento.numero, bloco: bloco.nome })}</p>
        </div>
        {!resultado.emailEnviado && (
          <p className="text-xs text-secondary bg-secondary/10 rounded-xl px-3 py-2">
            {t("convite.emailNaoConfigurado")}
          </p>
        )}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t("convite.codigo")}</p>
          <p className="font-mono text-lg font-bold text-on-surface bg-surface-container-highest/40 rounded-xl px-4 py-3 w-fit tracking-widest">
            {resultado.convite.codigo}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">{t("convite.linkAtivacao")}</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={link}
              className="flex-1 bg-surface-container-highest/40 border-none rounded-xl py-3 px-4 text-on-surface text-sm focus:outline-none"
            />
            <button
              onClick={copiar}
              className="shrink-0 px-4 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold cursor-pointer flex items-center gap-1.5"
            >
              <Icone name={copiado ? "check" : "content_copy"} className="text-base" />
              {copiado ? t("convite.copiado") : t("convite.copiar")}
            </button>
          </div>
        </div>
        <button
          onClick={() => { setResultado(null); setEmail(""); }}
          className="text-sm font-semibold text-primary hover:underline cursor-pointer"
        >
          {t("convite.gerarOutro")}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Icone name="person_add" className="text-primary text-lg" />
        <p className="font-headline font-bold text-on-surface">{t("convite.titulo")}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("convite.tipoMorador")}</label>
          <select
            value={perfil}
            onChange={(e) => setPerfil(e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            {opcoes.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <Campo
          id={`convite-email-${apartamento.id}`}
          label={t("campos.emailConvidado")}
          type="email"
          placeholder={t("placeholders.emailConvidado")}
          icon="mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <Botao type="submit" disabled={enviando}>
        {enviando ? t("convite.gerando") : t("convite.gerar")}
        <Icone name="link" className="text-xl" />
      </Botao>
    </form>
  );
}

// ════════════════════════════════════════════
// ABA: APARTAMENTOS (avulsa — mantida como referência/reuso)
// ════════════════════════════════════════════
function AbaApartamentos({ condominioId }) {
  const { t } = useTranslation("estruturas");
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
    setCarregando(true);
    setApartamentos([]);
    setBlocos([]);
    setFiltroBlocoId("todos");
    Promise.all([apartamentoApi.listarTodos(condominioId), blocoApi.listar(condominioId)])
      .then(([resApts, resBlocos]) => {
        setApartamentos(resApts.data);
        setBlocos(resBlocos.data);
      })
      .catch((err) => console.error("Erro ao carregar apartamentos:", err))
      .finally(() => setCarregando(false));
  }, [condominioId]);

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
      setErroCriar(d?.erro || (d?.erros ? Object.values(d.erros).join("; ") : null) || t("apartamentos.toast.erroCriar"));
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
      setErroEditar(d?.erro || (d?.erros ? Object.values(d.erros).join("; ") : null) || t("apartamentos.toast.erroAtualizar"));
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
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-on-surface">{apartamentos.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.total")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-primary">{apartamentos.filter((a) => a.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.ativos")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-error">{apartamentos.filter((a) => !a.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.inativos")}</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); setErroCriar(""); setErroEditar(""); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? t("comum:acoes.cancelar") : t("apartamentos.novo")}
        </button>
      </div>

      {/* Form novo apartamento */}
      {criando && (
        <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="door_front" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">{t("apartamentos.novo")}</h2>
          </div>
          <FormApartamento blocos={blocos} onSalvar={handleCriar} onCancelar={() => { setCriando(false); setErroCriar(""); }} erro={erroCriar} />
        </div>
      )}

      {/* Filtro por bloco + busca */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <Campo
            id="busca-apt"
            placeholder={t("apartamentos.buscaPlaceholder")}
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
            <option value="todos">{t("apartamentos.todosBlocos")}</option>
            {blocos.map((b) => (
              <option key={b.id} value={b.id}>{b.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("geral.carregando")}</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("apartamentos.vazio")}</div>
          )}
          {filtrados.map((apt) => (
            <div key={apt.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === apt.id ? null : apt.id)); setEditando(null); }}
                className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-veu/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="door_front" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{t("apartamentos.apt", { numero: apt.numero })}</p>
                  <p className="text-on-surface-variant text-sm truncate">{apt.blocoNome ?? "—"}</p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: t("campos.andar"), value: apt.andar ?? "—" },
                    { label: t("campos.quartos"), value: apt.quartos ?? "—" },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(apt.ativo)}`}>
                  {apt.ativo ? t("status.ativo") : t("status.inativo")}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === apt.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === apt.id && (
                <div className="border-t border-outline-variant/15 px-4 sm:px-5 pb-6 pt-5">
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

function FormApartamento({ inicial, blocos, apartamentos = [], onSalvar, onCancelar, erro }) {
  const { t } = useTranslation("estruturas");
  const blocoAtual = blocos[0] ?? null;
  const blocoId = blocoAtual?.id ?? "";

  const [form, setForm] = useState({
    numero: inicial?.numero || "",
    andar: inicial?.andar?.toString() || "",
    quartos: inicial?.quartos?.toString() || "",
    areaMxComTotal: inicial?.areaMxComTotal?.toString() || "",
    observacoes: inicial?.observacoes || "",
  });
  const [erros, setErros] = useState({});

  const totalAndares = blocoAtual?.andares ?? null;
  const limitePorAndar = blocoAtual?.apartamentosPorAndar ?? null;

  const countPorAndar = useMemo(() => {
    const map = {};
    apartamentos.forEach((a) => {
      if (a.andar != null && a.blocoId === blocoId) {
        map[a.andar] = (map[a.andar] || 0) + 1;
      }
    });
    return map;
  }, [apartamentos, blocoId]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErros((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.numero.trim()) e.numero = t("validacao.numeroObrigatorio");
    if (!form.andar) e.andar = t("validacao.andarObrigatorio");

    const quartos = form.quartos !== "" ? Number(form.quartos) : null;
    if (quartos === null) {
      e.quartos = t("validacao.quartosObrigatorio");
    } else if (!Number.isInteger(quartos) || quartos < MIN_QUARTOS || quartos > MAX_QUARTOS) {
      e.quartos = t("validacao.quartosFaixa", { min: MIN_QUARTOS, max: MAX_QUARTOS });
    }

    const area = form.areaMxComTotal !== "" ? Number(form.areaMxComTotal) : null;
    if (area === null) {
      e.areaMxComTotal = t("validacao.areaTotalObrigatoria");
    } else if (area < MIN_AREA_M2 || area > MAX_AREA_M2) {
      e.areaMxComTotal = t("validacao.areaTotalFaixa", { min: MIN_AREA_M2, max: MAX_AREA_M2 });
    }

    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validate();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      const firstKey = Object.keys(novosErros)[0];
      const ids = { numero: "apt-numero", andar: "apt-andar", quartos: "apt-quartos", areaMxComTotal: "apt-area" };
      document.getElementById(ids[firstKey])?.focus();
      return;
    }
    onSalvar(
      {
        ...form,
        andar: form.andar ? Number(form.andar) : null,
        quartos: form.quartos !== "" ? Number(form.quartos) : null,
        areaMxComTotal: form.areaMxComTotal !== "" ? Number(form.areaMxComTotal) : null,
      },
      blocoId,
    );
  }

  const andarOptions = totalAndares
    ? Array.from({ length: totalAndares }, (_, i) => i + 1)
    : null;

  const andaresDisponiveis = useMemo(() => {
    if (!totalAndares || !limitePorAndar) return [];
    return Array.from({ length: totalAndares }, (_, i) => i + 1).filter(
      (n) => (countPorAndar[n] || 0) < limitePorAndar,
    );
  }, [totalAndares, limitePorAndar, countPorAndar]);

  const todosLotados = totalAndares != null && limitePorAndar != null && andaresDisponiveis.length === 0;

  useEffect(() => {
    if (inicial) return;
    if (andaresDisponiveis.length === 1) {
      setForm((f) => ({ ...f, andar: String(andaresDisponiveis[0]) }));
    }
  }, [andaresDisponiveis, inicial]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Bloco — somente leitura (RN-03) */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            {t("campos.bloco")} <span className="text-red-500">*</span>
          </p>
          <div className="w-full bg-surface-container-highest/20 rounded-xl py-4 px-4 text-on-surface flex items-center gap-2 border border-outline-variant/10">
            <Icone name="apartment" className="text-primary text-lg shrink-0" />
            <span className="font-semibold">{blocoAtual?.nome || "—"}</span>
          </div>
        </div>

        <Campo id="apt-numero" label={t("campos.numero")} placeholder={t("placeholders.aptNumero")} required value={form.numero} onChange={(e) => set("numero", e.target.value)} error={erros.numero} />

        {/* Andar */}
        <div className="space-y-2">
          <label htmlFor="apt-andar" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            {t("campos.andar")} <span className="text-red-500">*</span>
            {limitePorAndar && (
              <span className="font-normal normal-case tracking-normal text-on-surface-variant/60">
                {" "}{t("apartamentos.maxPorAndar", { max: limitePorAndar })}
              </span>
            )}
          </label>
          {andarOptions ? (
            <select
              id="apt-andar"
              value={form.andar}
              onChange={(e) => set("andar", e.target.value)}
              aria-required="true"
              className={`w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40 ${erros.andar ? "ring-2 ring-error/60" : ""}`}
            >
              <option value="">{t("apartamentos.selecioneAndar")}</option>
              {andarOptions.map((n) => {
                const count = countPorAndar[n] || 0;
                const editandoEsteAndar = inicial?.andar === n;
                const cheio = limitePorAndar && count >= limitePorAndar && !editandoEsteAndar;
                return (
                  <option key={n} value={n} disabled={cheio}>
                    {t("apartamentos.andarOrdinal", { andar: n })}{cheio ? ` — ${t("apartamentos.lotado")}` : count > 0 ? ` (${count}/${limitePorAndar ?? "?"})` : ""}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              id="apt-andar"
              type="number"
              min="1"
              placeholder={t("placeholders.andar")}
              aria-required="true"
              value={form.andar}
              onChange={(e) => set("andar", e.target.value)}
              className={`w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all ${erros.andar ? "ring-2 ring-error/60" : ""}`}
            />
          )}
          {erros.andar && <p className="text-xs text-error ml-1">{erros.andar}</p>}
        </div>

        <Campo id="apt-quartos" label={t("campos.quartos")} type="number" min={MIN_QUARTOS} max={MAX_QUARTOS} step="1" placeholder={t("placeholders.quartos")} required value={form.quartos} onChange={(e) => set("quartos", e.target.value)} error={erros.quartos} />
        <Campo id="apt-area" label={t("campos.areaTotal")} type="number" min={MIN_AREA_M2} max={MAX_AREA_M2} step="0.01" placeholder={t("placeholders.areaApt")} required value={form.areaMxComTotal} onChange={(e) => set("areaMxComTotal", e.target.value)} error={erros.areaMxComTotal} />
        <Campo id="apt-obs" label={t("campos.observacoes")} placeholder={t("placeholders.opcional")} optional value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />
      </div>
      {erro && <p className="text-error text-xs">{erro}</p>}
      {todosLotados && !inicial && (
        <p className="text-xs text-on-surface-variant bg-surface-container-highest/30 rounded-xl px-4 py-3">
          {t("apartamentos.todosLotados")}
        </p>
      )}
      <div className="flex gap-3 pt-2">
        <Botao type="submit" disabled={todosLotados && !inicial}>{inicial ? t("acoes.salvarAlteracoes") : t("apartamentos.cadastrar")}</Botao>
        <button type="button" onClick={onCancelar} className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 font-semibold transition-all cursor-pointer">
          {t("comum:acoes.cancelar")}
        </button>
      </div>
    </form>
  );
}

function DetalhesApartamento({ apt, onEditar, onToggleAtivo }) {
  const { t } = useTranslation("estruturas");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: t("campos.bloco"), value: apt.blocoNome ?? "—" },
          { label: t("campos.numero"), value: apt.numero },
          { label: t("campos.andar"), value: apt.andar ?? "—" },
          { label: t("campos.quartos"), value: apt.quartos ?? "—" },
          { label: t("campos.areaM2"), value: apt.areaMxComTotal ?? "—" },
          { label: t("campos.observacoes"), value: apt.observacoes || "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button onClick={onEditar} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
          <Icone name="edit" className="text-lg" /> {t("comum:acoes.editar")}
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            apt.ativo ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={apt.ativo ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {apt.ativo ? t("acoes.desativar") : t("acoes.ativar")}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: ÁREAS COMUNS
// ════════════════════════════════════════════
function AbaAreasComuns({ condominioId, condominioNome }) {
  const { t } = useTranslation("estruturas");
  const toast = useToast();
  const [areas, setAreas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [funcionamentoDe, setFuncionamentoDe] = useState(null);

  useEffect(() => {
    setCarregando(true);
    setAreas([]);
    areaComunApi
      .listarTodas(condominioId)
      .then((res) => setAreas(res.data))
      .catch((err) => console.error("Erro ao carregar áreas comuns:", err))
      .finally(() => setCarregando(false));
  }, [condominioId]);

  const filtrados = areas.filter((a) => {
    const q = busca.toLowerCase();
    const matchBusca = a.nome.toLowerCase().includes(q) || a.localizacao?.toLowerCase().includes(q);
    const matchTipo = filtroTipo === "todos" || a.tipo === filtroTipo;
    return matchBusca && matchTipo;
  });

  async function handleCriar(dados) {
    try {
      const res = await areaComunApi.cadastrar({ ...dados, condominioId });
      setAreas((prev) => [res.data, ...prev]);
      setCriando(false);
      toast.success(t("areas.toast.criada"));
    } catch (err) {
      toast.error(err.response?.data?.erro || t("areas.toast.erroCriar"));
    }
  }

  async function handleAtualizar(id, dados) {
    try {
      const res = await areaComunApi.atualizar(id, dados);
      setAreas((prev) => prev.map((a) => (a.id === id ? res.data : a)));
      setEditando(null);
      toast.success(t("areas.toast.atualizada"));
    } catch (err) {
      toast.error(err.response?.data?.erro || t("areas.toast.erroAtualizar"));
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
      toast.success(area.ativo ? t("areas.toast.desativada") : t("areas.toast.reativada"));
    } catch (err) {
      toast.error(err.response?.data?.erro || t("areas.toast.erroStatus"));
    }
  }

  const tiposPresentes = [...new Set(areas.map((a) => a.tipo))];

  return (
    <>
      {/* Stats + botão */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-on-surface">{areas.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.total")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-primary">{areas.filter((a) => a.ativo).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.ativas")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-secondary">{areas.filter((a) => a.podeReservar).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.reservaveis")}</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? t("comum:acoes.cancelar") : t("areas.nova")}
        </button>
      </div>

      {/* Form nova área comum */}
      {criando && (
        <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="pool" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">{t("areas.nova")}</h2>
          </div>
          <FormAreaComum onSalvar={handleCriar} onCancelar={() => setCriando(false)} condominioNome={condominioNome} />
        </div>
      )}

      {/* Filtro por tipo + busca */}
      <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
        <div className="flex-1">
          <Campo
            id="busca-area"
            placeholder={t("areas.buscaPlaceholder")}
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
            <option value="todos">{t("areas.todosTipos")}</option>
            {tiposPresentes.map((tipo) => (
              <option key={tipo} value={tipo}>{t(`tiposArea.${tipo}`, { defaultValue: tipo.replace(/_/g, " ") })}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("geral.carregando")}</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("areas.vazio")}</div>
          )}
          {filtrados.map((area) => (
            <div key={area.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === area.id ? null : area.id)); setEditando(null); }}
                className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-veu/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-secondary/10 flex items-center justify-center shrink-0">
                  <Icone name="pool" className="text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{area.nome}</p>
                  <p className="text-on-surface-variant text-sm truncate">{area.tipo ? t(`tiposArea.${area.tipo}`, { defaultValue: area.tipo.replace(/_/g, " ") }) : ""} {area.localizacao ? `· ${area.localizacao}` : ""}</p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: t("campos.capacidade"), value: area.capacidadeMaxima ?? "—" },
                    { label: t("campos.areaM2"), value: area.area ?? "—" },
                    { label: t("campos.reservavel"), value: area.podeReservar ? t("comum:acoes.sim") : t("comum:acoes.nao") },
          ...(area.podeReservar
            ? [{ label: t("campos.aprovacao"), value: area.exigeAprovacao ? t("areas.aprovacaoSindico") : t("areas.aprovacaoAutomatica") },
                         { label: t("campos.antecedencia"), value: area.antecedenciaMinimaHoras > 0 ? t("areas.horasCurto", { horas: area.antecedenciaMinimaHoras }) : t("areas.antecedenciaNenhuma") }]
            : []),
                    ...(area.podeReservar
                      ? [{ label: t("campos.aprovacao"), value: area.exigeAprovacao ? t("areas.aprovacaoSindico") : t("areas.aprovacaoAutomatica") },
                         { label: t("campos.antecedencia"), value: area.antecedenciaMinimaHoras > 0 ? t("areas.horasCurto", { horas: area.antecedenciaMinimaHoras }) : t("areas.antecedenciaNenhuma") }]
                      : []),
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(area.ativo)}`}>
                  {area.ativo ? t("status.ativa") : t("status.inativa")}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === area.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === area.id && (
                <div className="border-t border-outline-variant/15 px-4 sm:px-5 pb-6 pt-5">
                  {editando === area.id ? (
                    <FormAreaComum
                      inicial={area}
                      onSalvar={(dados) => handleAtualizar(area.id, dados)}
                      onCancelar={() => setEditando(null)}
                      condominioNome={condominioNome}
                    />
                  ) : (
                    <>
                      <DetalhesAreaComum area={area} onEditar={() => setEditando(area.id)} onToggleAtivo={() => handleToggleAtivo(area)} />
                      {area.podeReservar && (
                        <button
                          type="button"
                          onClick={() => setFuncionamentoDe(area)}
                          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer"
                        >
                          <Icone name="schedule" className="text-base" />
                          {t("areas.horarioFuncionamento")}
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {funcionamentoDe && (
        <ModalFuncionamento
          area={funcionamentoDe}
          onFechar={() => setFuncionamentoDe(null)}
        />
      )}
    </>
  );
}

function FormAreaComum({ inicial, onSalvar, onCancelar, condominioNome }) {
  const { t } = useTranslation("estruturas");
  const [form, setForm] = useState({
    nome: inicial?.nome || "",
    tipo: inicial?.tipo || TIPOS_AREA[0],
    descricao: inicial?.descricao || "",
    localizacao: inicial?.localizacao || "",
    capacidadeMaxima: inicial?.capacidadeMaxima?.toString() || "",
    area: inicial?.area?.toString() || "",
    podeReservar: inicial?.podeReservar ?? false,
    exigeAprovacao: inicial?.exigeAprovacao ?? false,
    antecedenciaMinimaHoras: (inicial?.antecedenciaMinimaHoras ?? 0).toString(),
    observacoes: inicial?.observacoes || "",
  });
  const [erros, setErros] = useState({});

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setErros((e) => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.nome.trim()) e.nome = t("validacao.nomeObrigatorio");

    const capacidade = form.capacidadeMaxima !== "" ? Number(form.capacidadeMaxima) : null;
    if (capacidade === null) {
      e.capacidadeMaxima = t("validacao.capacidadeObrigatoria");
    } else if (!Number.isInteger(capacidade) || capacidade < MIN_CAPACIDADE || capacidade > MAX_CAPACIDADE) {
      e.capacidadeMaxima = t("validacao.capacidadeFaixa", { min: MIN_CAPACIDADE, max: MAX_CAPACIDADE });
    }

    const antecedencia = Number(form.antecedenciaMinimaHoras || 0);
    if (!Number.isInteger(antecedencia) || antecedencia < 0 || antecedencia > MAX_ANTECEDENCIA_HORAS) {
      e.antecedenciaMinimaHoras = t("validacao.antecedenciaFaixa", { max: MAX_ANTECEDENCIA_HORAS });
    }

    const area = form.area !== "" ? Number(form.area) : null;
    if (area === null) {
      e.area = t("validacao.areaObrigatoria");
    } else if (area < MIN_AREA_COMUM_M2 || area > MAX_AREA_COMUM_M2) {
      e.area = t("validacao.areaFaixa", { min: MIN_AREA_COMUM_M2, max: MAX_AREA_COMUM_M2 });
    }

    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const novosErros = validate();
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      const firstKey = Object.keys(novosErros)[0];
      const ids = { nome: "area-nome", capacidadeMaxima: "area-cap", area: "area-m2" };
      document.getElementById(ids[firstKey])?.focus();
      return;
    }
    onSalvar({
      ...form,
      capacidadeMaxima: Number(form.capacidadeMaxima),
      area: Number(form.area),
      // Campo vazio é "sem exigência", não NaN: o backend recusaria o nulo.
      antecedenciaMinimaHoras: Number(form.antecedenciaMinimaHoras || 0),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Condomínio — somente leitura (RN-04) */}
        {condominioNome && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("campos.condominio")} <span className="text-red-500">*</span>
            </p>
            <div className="w-full bg-surface-container-highest/20 rounded-xl py-4 px-4 text-on-surface flex items-center gap-2 border border-outline-variant/10">
              <Icone name="domain" className="text-primary text-lg shrink-0" />
              <span className="font-semibold">{condominioNome}</span>
            </div>
          </div>
        )}

        <Campo id="area-nome" label={t("campos.nome")} placeholder={t("placeholders.areaNome")} required value={form.nome} onChange={(e) => set("nome", e.target.value)} error={erros.nome} />

        <div className="space-y-2">
          <label htmlFor="area-tipo" className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
            {t("campos.tipo")}
          </label>
          <select
            id="area-tipo"
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value)}
            className={selectCls}
          >
            {TIPOS_AREA.map((tipo) => (
              <option key={tipo} value={tipo}>{t(`tiposArea.${tipo}`)}</option>
            ))}
          </select>
        </div>

        <Campo id="area-cap" label={t("campos.capacidadeMaxima")} type="number" min={MIN_CAPACIDADE} max={MAX_CAPACIDADE} step="1" placeholder={t("placeholders.capacidade")} required value={form.capacidadeMaxima} onChange={(e) => set("capacidadeMaxima", e.target.value)} error={erros.capacidadeMaxima} />
        <Campo id="area-m2" label={t("campos.areaM2")} type="number" min={MIN_AREA_COMUM_M2} max={MAX_AREA_COMUM_M2} step="0.01" placeholder={t("placeholders.areaComum")} required value={form.area} onChange={(e) => set("area", e.target.value)} error={erros.area} />
        <Campo id="area-desc" label={t("campos.descricao")} placeholder={t("placeholders.areaDescricao")} optional value={form.descricao} onChange={(e) => set("descricao", e.target.value)} />
        <Campo id="area-local" label={t("campos.localizacao")} placeholder={t("placeholders.areaLocalizacao")} optional value={form.localizacao} onChange={(e) => set("localizacao", e.target.value)} />
        <Campo id="area-obs" label={t("campos.observacoes")} placeholder={t("placeholders.areaObservacoes")} optional value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} />

        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            aria-pressed={form.podeReservar}
            onClick={() => set("podeReservar", !form.podeReservar)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer ${form.podeReservar ? "bg-primary" : "bg-outline-variant/40"}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${form.podeReservar ? "left-7" : "left-1"}`} />
          </button>
          <span className="text-sm text-on-surface-variant font-medium">{t("areas.permiteReservas")}</span>
        </div>

        {/* Só faz sentido onde há reserva; escondido, o toggle ficaria ligado
            sem efeito e o síndico esperaria uma fila que nunca chega. */}
        {form.podeReservar && (
          <div className="sm:col-span-2 flex items-start gap-3 mt-1">
            <button
              type="button"
              aria-pressed={form.exigeAprovacao}
              onClick={() => set("exigeAprovacao", !form.exigeAprovacao)}
              className={`relative w-12 h-6 shrink-0 rounded-full transition-colors duration-200 cursor-pointer ${form.exigeAprovacao ? "bg-primary" : "bg-outline-variant/40"}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${form.exigeAprovacao ? "left-7" : "left-1"}`} />
            </button>
            <div className="min-w-0">
              <span className="text-sm text-on-surface-variant font-medium block">
                {t("areas.exigeAprovacao")}
              </span>
              <span className="text-xs text-on-surface-variant/80">
                {t("areas.exigeAprovacaoDescricao")}
              </span>
            </div>
          </div>
        )}

        {/* RF-10. Em horas, e não em dias, porque churrasqueira costuma pedir
            dois dias e quadra pede duas horas — a mesma unidade cobre os dois. */}
        {form.podeReservar && (
          <div className="sm:col-span-2">
            <Campo
              id="area-antecedencia"
              label={t("campos.antecedenciaMinima")}
              type="number"
              min={0}
              max={MAX_ANTECEDENCIA_HORAS}
              step="1"
              placeholder="0"
              optional
              value={form.antecedenciaMinimaHoras}
              onChange={(e) => set("antecedenciaMinimaHoras", e.target.value)}
              error={erros.antecedenciaMinimaHoras}
            />
            <p className="text-xs text-on-surface-variant/80 ml-1 mt-1">
              {descreverAntecedencia(form.antecedenciaMinimaHoras)}
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <Botao type="submit">{inicial ? t("acoes.salvarAlteracoes") : t("areas.cadastrar")}</Botao>
        <button type="button" onClick={onCancelar} className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 font-semibold transition-all cursor-pointer">
          {t("comum:acoes.cancelar")}
        </button>
      </div>
    </form>
  );
}

function DetalhesAreaComum({ area, onEditar, onToggleAtivo }) {
  const { t } = useTranslation("estruturas");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: t("campos.nome"), value: area.nome },
          { label: t("campos.tipo"), value: area.tipo ? t(`tiposArea.${area.tipo}`, { defaultValue: area.tipo.replace(/_/g, " ") }) : area.tipo },
          { label: t("campos.localizacao"), value: area.localizacao || "—" },
          { label: t("campos.capacidade"), value: area.capacidadeMaxima ?? "—" },
          { label: t("campos.areaM2"), value: area.area ?? "—" },
          { label: t("campos.reservavel"), value: area.podeReservar ? t("comum:acoes.sim") : t("comum:acoes.nao") },
          { label: t("campos.descricao"), value: area.descricao || "—" },
          { label: t("campos.observacoes"), value: area.observacoes || "—" },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button onClick={onEditar} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer">
          <Icone name="edit" className="text-lg" /> {t("comum:acoes.editar")}
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            area.ativo ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={area.ativo ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {area.ativo ? t("acoes.desativar") : t("acoes.ativar")}
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════
// ABA: VAGAS
// ════════════════════════════════════════════
function AbaVagas({ condominioId }) {
  const { t } = useTranslation("estruturas");
  const [vagas, setVagas] = useState([]);
  const [apartamentos, setApartamentos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const aptMap = useMemo(
    () => Object.fromEntries(apartamentos.map((a) => [a.id, a])),
    [apartamentos],
  );
  const [busca, setBusca] = useState("");
  const [filtroAptId, setFiltroAptId] = useState("todos");
  const [criando, setCriando] = useState(false);
  const [expandido, setExpandido] = useState(null);
  const [editando, setEditando] = useState(null);
  const [erroCriar, setErroCriar] = useState("");
  const [erroEditar, setErroEditar] = useState("");

  useEffect(() => {
    setCarregando(true);
    setVagas([]);
    setApartamentos([]);
    Promise.all([vagaApi.listarTodas(condominioId), apartamentoApi.listarTodos(condominioId)])
      .then(([resVagas, resApts]) => {
        setVagas(resVagas.data || []);
        setApartamentos(resApts.data || []);
      })
      .catch((err) => console.error("Erro ao carregar vagas:", err))
      .finally(() => setCarregando(false));
  }, [condominioId]);

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
      setErroCriar(d?.mensagem || d?.message || t("vagas.erroCriar"));
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
      setErroEditar(d?.mensagem || d?.message || t("vagas.erroAtualizar"));
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
        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-on-surface">{vagas.length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.total")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-primary">{vagas.filter((v) => v.ativa).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.ativas")}</p>
          </div>
          <div className="glass-panel rounded-2xl px-4 sm:px-5 py-3 text-center flex-1 sm:flex-none min-w-[92px]">
            <p className="text-2xl font-headline font-bold text-error">{vagas.filter((v) => !v.ativa).length}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{t("resumo.inativas")}</p>
          </div>
        </div>
        <button
          onClick={() => { setCriando((c) => !c); setExpandido(null); setEditando(null); setErroCriar(""); setErroEditar(""); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold text-sm transition-all duration-200 cursor-pointer border ${
            criando ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={criando ? "close" : "add"} className="text-xl" />
          {criando ? t("comum:acoes.cancelar") : t("vagas.nova")}
        </button>
      </div>

      {/* Form nova vaga */}
      {criando && (
        <div className="glass-panel rounded-3xl p-4 sm:p-6 lg:p-8 border border-primary/15">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Icone name="local_parking" className="text-primary" />
            </div>
            <h2 className="font-headline text-xl font-bold text-on-surface">{t("vagas.nova")}</h2>
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
            placeholder={t("vagas.buscaPlaceholder")}
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
            <option value="todos">{t("vagas.todos")}</option>
            <option value="sem-apt">{t("vagas.semApartamento")}</option>
            {apartamentos.map((a) => (
              <option key={a.id} value={a.id}>{formatarUnidade(a.blocoNome, a.numero)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("geral.carregando")}</div>
      ) : (
        <div className="space-y-3">
          {filtrados.length === 0 && (
            <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">{t("vagas.vazio")}</div>
          )}
          {filtrados.map((vaga) => (
            <div key={vaga.id} className="glass-panel rounded-3xl overflow-hidden">
              <button
                onClick={() => { setExpandido((p) => (p === vaga.id ? null : vaga.id)); setEditando(null); }}
                className="w-full flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-veu/5 transition-all cursor-pointer"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="local_parking" className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-semibold truncate">{t("vagas.vaga", { numero: vaga.numero })}</p>
                  <p className="text-on-surface-variant text-sm truncate">
                    {formatarUnidade(aptMap[vaga.apartamentoId]?.blocoNome, aptMap[vaga.apartamentoId]?.numero ?? vaga.apartamentoNumero)}
                    {vaga.localizacao ? ` · ${vaga.localizacao}` : ""}
                  </p>
                </div>
                <div className="hidden sm:flex gap-6 text-sm shrink-0">
                  {[
                    { label: t("campos.tipo"), value: vaga.tipo || "—" },
                    { label: t("campos.apartamento"), value: formatarUnidade(aptMap[vaga.apartamentoId]?.blocoNome, aptMap[vaga.apartamentoId]?.numero ?? vaga.apartamentoNumero) },
                  ].map((col) => (
                    <div key={col.label} className="text-center">
                      <p className="text-on-surface-variant text-xs uppercase tracking-wider">{col.label}</p>
                      <p className="text-on-surface font-semibold">{col.value}</p>
                    </div>
                  ))}
                </div>
                <span className={`shrink-0 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${statusStyle(vaga.ativa)}`}>
                  {vaga.ativa ? t("status.ativa") : t("status.inativa")}
                </span>
                <Icone
                  name="expand_more"
                  className={`text-outline shrink-0 transition-transform duration-300 ${expandido === vaga.id ? "rotate-180" : ""}`}
                />
              </button>

              {expandido === vaga.id && (
                <div className="border-t border-outline-variant/15 px-4 sm:px-5 pb-6 pt-5">
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
                      blocoNome={aptMap[vaga.apartamentoId]?.blocoNome}
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
  const { t } = useTranslation("estruturas");
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
          label={t("campos.numero")}
          placeholder={t("placeholders.vagaNumero")}
          required
          value={form.numero}
          onChange={(e) => set("numero", e.target.value)}
        />
        <Campo
          id="vaga-local"
          label={t("campos.localizacao")}
          placeholder={t("placeholders.vagaLocalizacao")}
          value={form.localizacao}
          onChange={(e) => set("localizacao", e.target.value)}
        />
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("campos.tipo")}</label>
          <select
            value={form.tipo}
            onChange={(e) => set("tipo", e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            <option value="">{t("vagas.selecioneTipo")}</option>
            <option value="Coberta">{t("vagas.tipos.coberta")}</option>
            <option value="Descoberta">{t("vagas.tipos.descoberta")}</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">{t("vagas.apartamentoOpcional")}</label>
          <select
            value={aptId}
            onChange={(e) => setAptId(e.target.value)}
            className="w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all"
          >
            <option value="">{t("vagas.semApartamento")}</option>
            {apartamentos.map((a) => (
              <option key={a.id} value={a.id}>{formatarUnidade(a.blocoNome, a.numero)}</option>
            ))}
          </select>
        </div>
      </div>
      {erro && <p className="text-error text-xs">{erro}</p>}
      <div className="flex gap-3 pt-2">
        <Botao type="submit">{inicial ? t("acoes.salvarAlteracoes") : t("vagas.cadastrar")}</Botao>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-4 rounded-full border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 font-semibold transition-all cursor-pointer"
        >
          {t("comum:acoes.cancelar")}
        </button>
      </div>
    </form>
  );
}

function DetalhesVaga({ vaga, blocoNome, onEditar, onToggleAtivo }) {
  const { t } = useTranslation("estruturas");
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: t("campos.numero"), value: vaga.numero },
          { label: t("campos.tipo"), value: vaga.tipo || "—" },
          { label: t("campos.localizacao"), value: vaga.localizacao || "—" },
          { label: t("campos.apartamento"), value: formatarUnidade(blocoNome, vaga.apartamentoNumero) },
        ].map((item) => (
          <div key={item.label} className="bg-surface-container-highest/20 rounded-xl p-3">
            <p className="text-on-surface-variant text-xs uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-on-surface font-semibold">{item.value}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <button
          onClick={onEditar}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/10 text-sm font-semibold transition-all cursor-pointer"
        >
          <Icone name="edit" className="text-lg" /> {t("comum:acoes.editar")}
        </button>
        <button
          onClick={onToggleAtivo}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            vaga.ativa ? "border-error/30 text-error hover:bg-error/10" : "border-primary/30 text-primary hover:bg-primary/10"
          }`}
        >
          <Icone name={vaga.ativa ? "do_not_disturb_on" : "check_circle"} className="text-lg" />
          {vaga.ativa ? t("acoes.desativar") : t("acoes.ativar")}
        </button>
      </div>
    </div>
  );
}
