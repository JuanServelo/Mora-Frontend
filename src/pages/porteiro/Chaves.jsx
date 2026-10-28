import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Icone } from "../../components/icones/Icone";
import { chaveApi, atendimentoApi } from "../../services/portariaApi";
import { acessoApi } from "../../services/acessoApi";
import { useToast } from "../../contexts/ToastContext";
import { idiomaAtual } from "../../i18n";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtData(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(idiomaAtual());
}
function fmtHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(idiomaAtual(), { hour: "2-digit", minute: "2-digit" });
}
function fmtDataHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(idiomaAtual(), {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}
function hoje() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// ── Modal: retirar chave ──────────────────────────────────────────────────────

function errMsg(err) {
  const d = err?.response?.data;
  return d?.message ?? d?.erro ?? null;
}

function ModalRetirar({ chave, onClose, onSalvo }) {
  const [tipo, setTipo] = useState("MORADOR");
  const [responsavelId, setResponsavelId] = useState("");
  const [opcoes, setOpcoes] = useState([]);
  const [loadingOpcoes, setLoadingOpcoes] = useState(false);
  const [erroOpcoes, setErroOpcoes] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState(null);
  const toast = useToast();
  const { t } = useTranslation("chaves");

  useEffect(() => {
    setResponsavelId("");
    setOpcoes([]);
    setErroOpcoes(null);
    setLoadingOpcoes(true);

    if (tipo === "TERCEIRO") {
      // Terceiros vêm do portaria-service (Visitante com tipoVisita=SERVICO)
      atendimentoApi.buscar("", "SERVICO")
        .then((res) => {
          const lista = (res.data || [])
            .map((v) => ({ id: v.id, nome: v.nome, empresa: v.empresa }))
            .sort((a, b) => a.nome.localeCompare(b.nome, idiomaAtual()));
          setOpcoes(lista);
        })
        .catch((err) => {
          setErroOpcoes(err?.response?.data?.mensagem || err?.response?.data?.message || t("retirar.erros.carregarLista"));
        })
        .finally(() => setLoadingOpcoes(false));
      return;
    }

    acessoApi.listarUsuariosCondominio()
      .then((res) => {
        const todos = res.data?.usuarios || [];
        const filtrados = todos.filter((u) => {
          if (u.status !== "active") return false;
          if (tipo === "MORADOR") return u.perfil === "MORADOR" || u.perfil === "DONO_ALUGUEL";
          return u.perfil === "PORTEIRO" || u.perfil === "ADMIN_SINDICO" || u.perfil === "FUNCIONARIO";
        });
        const lista = filtrados.slice().sort((a, b) => a.nome.localeCompare(b.nome, idiomaAtual()));
        setOpcoes(lista);
      })
      .catch((err) => {
        setErroOpcoes(err?.response?.data?.mensagem || err?.response?.data?.message || t("retirar.erros.carregarLista"));
      })
      .finally(() => setLoadingOpcoes(false));
  }, [tipo, t]);

  async function confirmar(e) {
    e.preventDefault();
    if (!responsavelId) { setErro(t("retirar.erros.selecioneResponsavel")); return; }
    const selecionado = opcoes.find((o) => String(o.id) === String(responsavelId));
    if (!selecionado) { setErro(t("retirar.erros.responsavelInvalido")); return; }
    const nomeResponsavel = selecionado.nome;
    setLoading(true);
    setErro(null);
    try {
      await chaveApi.retirar(chave.id, String(responsavelId), tipo, nomeResponsavel);
      toast.success(t("retirar.toastRegistrada", { nome: chave.nomeChave }));
      onSalvo();
    } catch (err) {
      setErro(errMsg(err) || t("retirar.erros.registrar"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={onClose}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-md border border-outline-variant/20 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">{t("retirar.titulo")}</h2>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          {t("retirar.chave")} <span className="font-semibold text-on-surface">{chave.nomeChave}</span>
          {chave.localNome && <span className="text-xs ml-1 text-on-surface-variant/60">· {chave.localNome}</span>}
        </p>
        <form onSubmit={confirmar} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
              {t("retirar.tipoResponsavel")}
            </label>
            <div className="flex gap-2">
              {[
                { value: "MORADOR" },
                { value: "FUNCIONARIO" },
                { value: "TERCEIRO" },
              ].map((op) => (
                <button key={op.value} type="button"
                  onClick={() => { setTipo(op.value); setErro(null); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-all ${
                    tipo === op.value
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/20"
                  }`}>
                  {t(`tipos.${op.value}`)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              {t(`tipos.${tipo}`)}
            </label>
            {loadingOpcoes ? (
              <p className="text-sm text-on-surface-variant/60 py-2 italic">
                {t(`retirar.carregando.${tipo}`)}
              </p>
            ) : erroOpcoes ? (
              <p className="text-red-500 text-xs py-2">{erroOpcoes}</p>
            ) : opcoes.length === 0 ? (
              <p className="text-sm text-on-surface-variant/60 py-2">
                {t(`retirar.vazio.${tipo}`)}
              </p>
            ) : (
              <select value={responsavelId} onChange={(e) => { setResponsavelId(e.target.value); setErro(null); }}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">{t("retirar.selecione")}</option>
                {opcoes.map((o) => {
                  const loc = [o.bloco, o.apartamento].filter(Boolean).join(" / ");
                  const sufixo = loc || o.empresa || null;
                  const label = sufixo ? `${o.nome} — ${sufixo}` : o.nome;
                  return <option key={o.id} value={o.id}>{label}</option>;
                })}
              </select>
            )}
            {erro && <p className="text-red-500 text-xs mt-1">{erro}</p>}
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-full text-sm font-semibold text-on-surface-variant border border-outline-variant/30 hover:bg-surface-variant/20 transition-all">
              {t("comum:acoes.cancelar")}
            </button>
            <button type="submit" disabled={loading || !responsavelId}
              className="px-5 py-2 rounded-full text-sm font-semibold bg-amber-500 text-white hover:opacity-90 transition-opacity disabled:opacity-60">
              {loading ? t("retirar.registrando") : t("retirar.confirmar")}
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
  const [devolvendoId, setDevolvendoId] = useState(null);
  const [modalRetirar, setModalRetirar] = useState(null);
  const toast = useToast();
  const { t } = useTranslation("chaves");

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
    if (!form.localId) { setErro(t("cadastro.erros.selecioneLocal")); return; }
    if (!form.nomeChave.trim()) { setErro(t("cadastro.erros.informeNome")); return; }
    setLoading(true);
    try {
      await chaveApi.cadastrar({
        localId: form.localId,
        tipoLocal: form.tipoLocal,
        nomeChave: form.nomeChave.trim(),
        descricao: form.descricao.trim() || null,
      });
      toast.success(t("cadastro.toast.cadastrada"));
      setForm({ localId: "", tipoLocal: "", nomeChave: "", descricao: "" });
      onAtualizar();
    } catch (err) {
      setErro(errMsg(err) || t("cadastro.erros.cadastrar"));
    } finally {
      setLoading(false);
    }
  }

  async function deletar(chave) {
    if (!window.confirm(t("cadastro.confirmarExclusao", { nome: chave.nomeChave }))) return;
    try {
      await chaveApi.deletar(chave.id);
      toast.success(t("cadastro.toast.excluida"));
      onAtualizar();
    } catch (err) {
      toast.error(errMsg(err) || t("cadastro.erros.excluir"));
    }
  }

  async function devolver(chave) {
    if (devolvendoId) return;
    setDevolvendoId(chave.id);
    try {
      await chaveApi.devolver(chave.id);
      toast.success(t("cadastro.toast.devolucao", { nome: chave.nomeChave }));
      onAtualizar();
    } catch (err) {
      toast.error(errMsg(err) || t("cadastro.erros.devolucao"));
    } finally {
      setDevolvendoId(null);
    }
  }

  const blocos = locais.filter((l) => l.tipo === "BLOCO");
  const areas = locais.filter((l) => l.tipo === "AREA_COMUM");

  return (
    <div className="space-y-8">
      {/* Formulário */}
      <div className="glass-panel rounded-2xl p-6 border border-outline-variant/15">
        <h2 className="font-headline font-bold text-on-surface text-base mb-4">{t("cadastro.titulo")}</h2>
        <form onSubmit={cadastrar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Local */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                {t("cadastro.local")} <span className="text-red-500">*</span>
              </label>
              <select value={form.localId} onChange={onLocalChange}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                <option value="">{t("cadastro.selecioneLocal")}</option>
                {blocos.length > 0 && (
                  <optgroup label={t("cadastro.blocos")}>
                    {blocos.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </optgroup>
                )}
                {areas.length > 0 && (
                  <optgroup label={t("cadastro.areasComuns")}>
                    {areas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Nome */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                {t("cadastro.nome")} <span className="text-red-500">*</span>
              </label>
              <input value={form.nomeChave} onChange={(e) => { setForm((f) => ({ ...f, nomeChave: e.target.value })); setErro(null); }}
                placeholder={t("cadastro.nomePlaceholder")}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                {t("cadastro.descricao")}
              </label>
              <input value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))}
                placeholder={t("cadastro.descricaoPlaceholder")}
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
              {loading ? t("cadastro.cadastrando") : t("cadastro.cadastrar")}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de chaves */}
      <div>
        <h2 className="font-headline font-bold text-on-surface text-base mb-3">
          {t("lista.titulo")}
          <span className="ml-2 text-xs font-normal text-on-surface-variant">({chaves.length})</span>
        </h2>
        {chaves.length === 0 ? (
          <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15">
            <Icone name="key" className="text-on-surface-variant/30 text-4xl mb-2" />
            <p className="text-sm text-on-surface-variant">{t("lista.vazio")}</p>
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
                        {c.tipoLocal === "BLOCO" ? t("lista.tipoLocal.bloco") : t("lista.tipoLocal.areaComum")} · {c.localNome || "—"}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    c.disponivel
                      ? "bg-green-500/15 text-green-600 dark:text-green-400"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  }`}>
                    <Icone name={c.disponivel ? "check_circle" : "key_off"} className="text-sm" />
                    {c.disponivel ? t("lista.status.disponivel") : t("lista.status.retirada")}
                  </span>
                </div>

                {!c.disponivel && c.possuidorNome && (
                  <div className="bg-amber-500/8 rounded-xl px-3 py-2 text-xs text-on-surface-variant space-y-0.5">
                    <p><span className="font-semibold">{t("lista.com")}</span> {c.possuidorNome} ({c.possuidorPerfil})</p>
                    <p><span className="font-semibold">{t("lista.desde")}</span> {fmtDataHora(c.retiradaEm)}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {c.disponivel ? (
                    <>
                      <button onClick={() => setModalRetirar(c)}
                        className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors">
                        <Icone name="key_off" className="text-sm" />{t("lista.retirar")}
                      </button>
                      <button onClick={() => deletar(c)}
                        className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors" title={t("lista.excluir")}>
                        <Icone name="delete" className="text-sm" />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => devolver(c)} disabled={devolvendoId === c.id}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 transition-colors disabled:opacity-60">
                      <Icone name="check_circle" className="text-sm" />
                      {devolvendoId === c.id ? t("lista.registrando") : t("lista.registrarDevolucao")}
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

// `valor` vai para a API; o rótulo vem da tradução.
const PERFIS_OPCOES = [
  { valor: "Morador", tipo: "MORADOR" },
  { valor: "Funcionário", tipo: "FUNCIONARIO" },
  { valor: "Terceiro", tipo: "TERCEIRO" },
];

function AbaHistorico({ chaves, onAtualizar }) {
  const [chaveId, setChaveId] = useState("");
  const [chaveAtual, setChaveAtual] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [loadingHist, setLoadingHist] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: hoje(),
    quemRetirou: "",
    perfil: "",
    status: "",
  });
  const [erroFiltro, setErroFiltro] = useState(null);
  const toast = useToast();
  const { t } = useTranslation("chaves");

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
      else toast.error(t("historico.erroCarregar"));
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
    const pad = { dataInicio: "", dataFim: hoje(), quemRetirou: "", perfil: "", status: "" };
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
      toast.success(t("historico.toastDevolucao"));
      onAtualizar();
      carregarHistorico(chaveId, filtros);
    } catch (err) {
      toast.error(errMsg(err) || t("historico.erroDevolucao"));
    }
  }

  return (
    <div className="space-y-6">
      {/* Seletor de chave (RN-06) */}
      <div className="glass-panel rounded-2xl p-5 border border-outline-variant/15">
        <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
          {t("historico.selecionarChave")}
        </label>
        <select value={chaveId} onChange={(e) => setChaveId(e.target.value)}
          className="w-full max-w-sm rounded-xl border border-outline-variant/30 bg-surface px-4 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
          <option value="">{t("historico.selecioneUmaChave")}</option>
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
          <p className="font-semibold text-on-surface">{t("historico.semChave.titulo")}</p>
          <p className="text-sm text-on-surface-variant">{t("historico.semChave.descricao")}</p>
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
                    ? t("historico.disponivel")
                    : t("historico.emPosse", { nome: chaveAtual.possuidorNome || "—", perfil: chaveAtual.possuidorPerfil || "—", data: fmtDataHora(chaveAtual.retiradaEm) })
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
              <h3 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t("historico.filtros")}</h3>
              <button type="button" onClick={limparFiltros}
                className="text-xs text-primary font-semibold hover:underline">
                {t("historico.limparFiltros")}
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">{t("historico.dataInicial")}</label>
                <input type="date" value={filtros.dataInicio} onChange={(e) => setF("dataInicio", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">{t("historico.dataFinal")}</label>
                <input type="date" value={filtros.dataFim} onChange={(e) => setF("dataFim", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">{t("historico.quemRetirou")}</label>
                <input type="text" value={filtros.quemRetirou} onChange={(e) => setF("quemRetirou", e.target.value)}
                  placeholder={t("historico.buscaParcial")}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:border-primary/60 transition-colors" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">{t("historico.perfil")}</label>
                <select value={filtros.perfil} onChange={(e) => setF("perfil", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                  <option value="">{t("historico.todos")}</option>
                  {PERFIS_OPCOES.map((p) => <option key={p.valor} value={p.valor}>{t(`tipos.${p.tipo}`)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1">{t("historico.status")}</label>
                <select value={filtros.status} onChange={(e) => setF("status", e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary/60 transition-colors">
                  <option value="">{t("historico.todos")}</option>
                  <option value="EM_ABERTO">{t("historico.statusMov.EM_ABERTO")}</option>
                  <option value="DEVOLVIDA">{t("historico.statusMov.DEVOLVIDA")}</option>
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
                {t("historico.aplicar")}
              </button>
            </div>
          </form>

          {/* Tabela de histórico (RN-08) */}
          {loadingHist ? (
            <div className="flex items-center justify-center py-10 text-on-surface-variant gap-2">
              <Icone name="sync" className="text-2xl animate-spin" />{t("historico.carregando")}
            </div>
          ) : historico.length === 0 ? (
            <div className="glass-panel rounded-2xl p-8 text-center border border-outline-variant/15">
              <Icone name="inbox" className="text-on-surface-variant/30 text-4xl mb-2" />
              <p className="text-sm text-on-surface-variant">{t("historico.vazio")}</p>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                      {["quemRetirou", "perfil", "dataRetirada", "horaRetirada", "dataDevolucao", "horaDevolucao", "status", "registradoPor", ""].map((h) => (
                        <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                          {h && t(`historico.colunas.${h}`)}
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
                              {emAberto ? t("historico.statusMov.EM_ABERTO") : t("historico.statusMov.DEVOLVIDA")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-on-surface-variant text-xs whitespace-nowrap">{mov.registradoPorNome || "—"}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {emAberto && (
                              <button onClick={() => devolver(mov)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500/15 text-green-600 dark:text-green-400 hover:bg-green-500/25 transition-colors">
                                <Icone name="check_circle" className="text-sm" />
                                {t("historico.devolver")}
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
  const { t } = useTranslation("chaves");

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await chaveApi.listar();
      setChaves(res.data || []);
    } catch {
      toast.error(t("pagina.erroCarregar"));
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
            {t("pagina.secao")}
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl font-extrabold tracking-tight text-on-surface">
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("pagina.titulo")}
            </span>
          </h1>
        </header>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: t("pagina.stats.total"), valor: chaves.length, icon: "key", cls: "text-primary bg-primary/10" },
            { label: t("pagina.stats.disponiveis"), valor: disponiveis, icon: "check_circle", cls: "text-green-600 dark:text-green-400 bg-green-500/10" },
            { label: t("pagina.stats.retiradas"), valor: retiradas, icon: "key_off", cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10" },
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
            { key: "cadastro", label: t("pagina.abas.cadastro"), icon: "add_circle" },
            { key: "historico", label: t("pagina.abas.historico"), icon: "history" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setAba(tab.key)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
                aba === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}>
              <Icone name={tab.icon} className="text-base" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center py-16 text-on-surface-variant gap-2">
            <Icone name="sync" className="text-3xl animate-spin" />
            {t("pagina.carregando")}
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
