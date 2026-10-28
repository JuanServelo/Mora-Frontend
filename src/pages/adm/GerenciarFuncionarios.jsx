// src/pages/adm/GerenciarFuncionarios.jsx
import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { jornadaApi } from "../../services/portariaApi";
import { acessoApi } from "../../services/acessoApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { PERFIS_FUNCIONARIO, labelPerfil } from "../../utils/perfis";
import { idiomaAtual } from "../../i18n";

// ── helpers ──────────────────────────────────────────────────────────────────

function errMsg(err) {
  const d = err?.response?.data;
  return d?.mensagem ?? d?.message ?? d?.erro ?? null;
}

const DIAS_SEMANA = [
  { api: "SUNDAY", rotuloKey: "diasSemana.domingo" },
  { api: "MONDAY", rotuloKey: "diasSemana.segunda" },
  { api: "TUESDAY", rotuloKey: "diasSemana.terca" },
  { api: "WEDNESDAY", rotuloKey: "diasSemana.quarta" },
  { api: "THURSDAY", rotuloKey: "diasSemana.quinta" },
  { api: "FRIDAY", rotuloKey: "diasSemana.sexta" },
  { api: "SATURDAY", rotuloKey: "diasSemana.sabado" },
];

const SITUACOES = {
  ATIVO: { rotuloKey: "situacoes.ativo", cor: "bg-primary/10 text-primary" },
  SUSPENSO: { rotuloKey: "situacoes.suspenso", cor: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  AFASTADO: { rotuloKey: "situacoes.afastado", cor: "bg-secondary/10 text-secondary" },
  DEMITIDO: { rotuloKey: "situacoes.demitido", cor: "bg-error/10 text-error" },
};

/** Modelos de escala — preenchem o padrão e seguem editáveis (RN-03). */
const MODELOS_ESCALA = {
  "12x36": { tamanho: 2, dias: [{ folga: false, inicio: "07:00", fim: "19:00" }, { folga: true }] },
  "12x36 noturno": { tamanho: 2, dias: [{ folga: false, inicio: "19:00", fim: "07:00" }, { folga: true }] },
  "24x48": { tamanho: 3, dias: [{ folga: false, inicio: "07:00", fim: "07:00" }, { folga: true }, { folga: true }] },
  "6x1": { tamanho: 7, dias: Array.from({ length: 7 }, (_, i) => i < 6
    ? { folga: false, inicio: "08:00", fim: "17:00" } : { folga: true }) },
};

/** Rótulo traduzido dos modelos cujo nome tem texto (os demais são só números). */
const MODELO_ROTULO_KEY = { "12x36 noturno": "modal.modelos.noturno12x36" };

function hojeISO() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0")].join("-");
}

function fmtDia(iso) {
  if (!iso) return "—";
  const p = String(iso).split("T")[0].split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}` : iso;
}

function hhmm(v) {
  return v ? String(v).slice(0, 5) : "—";
}

const INPUT =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-2.5 px-3 text-sm text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none transition-all";

// ── Página ───────────────────────────────────────────────────────────────────

export function GerenciarFuncionarios() {
  const { t } = useTranslation("funcionarios");
  const toast = useToast();
  const [aba, setAba] = useState("quadro");
  const [funcionarios, setFuncionarios] = useState([]);
  const [jornadas, setJornadas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [editando, setEditando] = useState(null);

  // Cadeia de promise em vez de async/await: todo setState fica dentro de
  // callback, e não como chamada síncrona no corpo do efeito.
  const carregar = useCallback(() => {
    return Promise.all([
      acessoApi.listarUsuariosCondominio(),
      jornadaApi.listar().catch(() => ({ data: [] })),
    ])
      .then(([usrRes, jorRes]) => {
        const ativos = (usrRes.data?.usuarios || [])
          .filter((u) => PERFIS_FUNCIONARIO.includes(u.perfil))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
        setFuncionarios(ativos);
        setJornadas(Array.isArray(jorRes.data) ? jorRes.data : []);
        setErro(null);
      })
      .catch((err) => {
        setErro(errMsg(err) || t("erros.carregarQuadro"));
      });
  }, [t]);

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  // Junta identidade (auth-api) com vida funcional (portaria-service).
  const quadro = useMemo(() => funcionarios.map((f) => ({
    ...f,
    jornada: jornadas.find((j) => String(j.authUserId) === String(f.id)) || null,
  })), [funcionarios, jornadas]);

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
            {t("cabecalho.administrativo")}
          </p>
          <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
            {t("cabecalho.funcionarios")}{" "}
            <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
              {t("cabecalho.turnos")}
            </span>
          </h1>
          <p className="text-on-surface-variant text-sm mt-1">
            {t("cabecalho.descricao")}
          </p>
        </header>

        <div className="glass-panel rounded-2xl p-1.5 flex flex-wrap gap-1 w-full sm:w-fit">
          {[
            { id: "quadro", rotuloKey: "abas.quadro", icon: "badge" },
            { id: "acompanhamento", rotuloKey: "abas.acompanhamento", icon: "monitoring" },
            { id: "liberacoes", rotuloKey: "abas.liberacoes", icon: "lock_open" },
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => setAba(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                aba === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-veu/5"
              }`}>
              <Icone name={tab.icon} className="text-lg" />{t(tab.rotuloKey)}
            </button>
          ))}
        </div>

        {carregando ? (
          <div className="glass-panel rounded-2xl py-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : erro ? (
          <div className="glass-panel rounded-2xl p-8 text-center border border-error/20 space-y-3">
            <Icone name="error_outline" className="text-error text-4xl" />
            <p className="text-sm text-on-surface-variant">{erro}</p>
          </div>
        ) : aba === "quadro" ? (
          <AbaQuadro quadro={quadro} onEditar={setEditando} />
        ) : aba === "acompanhamento" ? (
          <AbaAcompanhamento quadro={quadro} />
        ) : (
          <AbaLiberacoes quadro={quadro} />
        )}

        {editando && (
          <ModalJornada
            funcionario={editando}
            onFechar={() => setEditando(null)}
            onSalvo={async () => {
              setEditando(null);
              await carregar();
              toast.success(t("toast.jornadaAtualizada"));
            }}
          />
        )}
      </div>
    </div>
  );
}

// ── Aba: quadro de funcionários ──────────────────────────────────────────────

function AbaQuadro({ quadro, onEditar }) {
  const { t } = useTranslation("funcionarios");
  if (quadro.length === 0) {
    return (
      <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
        <Icone name="badge" className="text-5xl opacity-30" />
        <p className="text-sm max-w-md">
          {t("quadro.vazio")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {quadro.map((f) => (
        <CartaoFuncionario key={f.id} funcionario={f} onEditar={() => onEditar(f)} />
      ))}
    </div>
  );
}

function CartaoFuncionario({ funcionario: f, onEditar }) {
  const { t } = useTranslation("funcionarios");
  const [plantoes, setPlantoes] = useState(null);
  const [aberto, setAberto] = useState(false);
  const j = f.jornada;
  const sit = SITUACOES[j?.situacao] ?? null;

  useEffect(() => {
    if (!aberto || !j || plantoes) return;
    jornadaApi.proximosPlantoes(f.id, 14)
      .then((r) => setPlantoes(r.data || []))
      .catch(() => setPlantoes([]));
  }, [aberto, j, plantoes, f.id]);

  return (
    <div className="glass-panel rounded-2xl p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Icone name="badge" className="text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-on-surface truncate">{f.nome}</p>
            <p className="text-xs text-on-surface-variant">
              {labelPerfil(f.perfil)}
              {j ? ` · ${j.tipoJornada === "ESCALA"
                ? t("quadro.escalaDias", { count: j.cicloTamanho })
                : t("quadro.jornadaSemanal")}` : ` · ${t("quadro.semJornada")}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sit ? (
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${sit.cor}`}>{t(sit.rotuloKey)}</span>
          ) : (
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-outline-variant/20 text-on-surface-variant">
              {t("quadro.naoConfigurado")}
            </span>
          )}
          <button onClick={onEditar}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
            <Icone name="edit" className="text-sm" />{j ? t("comum:acoes.editar") : t("quadro.configurar")}
          </button>
        </div>
      </div>

      {j && (
        <>
          <button type="button" onClick={() => setAberto((a) => !a)}
            className="text-xs font-semibold text-primary hover:underline cursor-pointer flex items-center gap-1">
            <Icone name={aberto ? "expand_less" : "expand_more"} className="text-base" />
            {t("quadro.proximosPlantoes")}
          </button>

          {aberto && (
            plantoes === null ? (
              <p className="text-xs text-on-surface-variant">{t("comum:estado.carregando")}</p>
            ) : plantoes.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                {t("quadro.semPlantoes")}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {plantoes.map((p) => (
                  <span key={p.dia}
                    className="text-xs px-2.5 py-1 rounded-lg bg-surface-container-highest/30 text-on-surface-variant">
                    <span className="font-semibold text-on-surface">{fmtDia(p.dia)}</span>{" "}
                    {hhmm(p.inicio)}–{hhmm(p.fim)}
                    {p.viraODia && <span className="text-secondary"> +1</span>}
                  </span>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

// ── Modal: situação e jornada ────────────────────────────────────────────────

function ModalJornada({ funcionario, onFechar, onSalvo }) {
  const { t } = useTranslation("funcionarios");
  const j = funcionario.jornada;
  const [situacao, setSituacao] = useState(j?.situacao || "ATIVO");
  const [tipo, setTipo] = useState(j?.tipoJornada || "SEMANAL_FIXA");
  const [cicloInicio, setCicloInicio] = useState(j?.cicloInicio || hojeISO());
  const [cicloTamanho, setCicloTamanho] = useState(j?.cicloTamanho || 2);
  const [observacoes, setObservacoes] = useState(j?.observacoes || "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [previa, setPrevia] = useState(null);

  const [semana, setSemana] = useState(() =>
    DIAS_SEMANA.map((d) => {
      const existente = j?.dias?.find((x) => x.diaSemana === d.api);
      return existente
        ? { ...d, folga: existente.folga, inicio: hhmm(existente.inicio) || "08:00", fim: hhmm(existente.fim) || "17:00" }
        : { ...d, folga: d.api === "SATURDAY" || d.api === "SUNDAY", inicio: "08:00", fim: "17:00" };
    })
  );

  const [escala, setEscala] = useState(() => {
    const tam = j?.cicloTamanho || 2;
    return Array.from({ length: tam }, (_, i) => {
      const existente = j?.dias?.find((x) => x.posicao === i + 1);
      return existente
        ? { folga: existente.folga, inicio: hhmm(existente.inicio) || "07:00", fim: hhmm(existente.fim) || "19:00" }
        : { folga: i > 0, inicio: "07:00", fim: "19:00" };
    });
  });

  function redimensionarEscala(tam) {
    const n = Math.max(2, Math.min(31, Number(tam) || 2));
    setCicloTamanho(n);
    setEscala((prev) => Array.from({ length: n }, (_, i) =>
      prev[i] || { folga: true, inicio: "07:00", fim: "19:00" }));
    setErro("");
  }

  function aplicarModelo(nome) {
    const m = MODELOS_ESCALA[nome];
    if (!m) return;
    setCicloTamanho(m.tamanho);
    setEscala(m.dias.map((d) => ({
      folga: d.folga,
      inicio: d.inicio || "07:00",
      fim: d.fim || "19:00",
    })));
    setErro("");
  }

  function montarDias() {
    return tipo === "SEMANAL_FIXA"
      ? semana.map((d) => ({
          diaSemana: d.api, folga: d.folga,
          inicio: d.folga ? null : d.inicio, fim: d.folga ? null : d.fim,
        }))
      : escala.map((d, i) => ({
          posicao: i + 1, folga: d.folga,
          inicio: d.folga ? null : d.inicio, fim: d.folga ? null : d.fim,
        }));
  }

  function corpo() {
    return {
      authUserId: String(funcionario.id),
      nome: funcionario.nome,
      situacao,
      tipoJornada: tipo,
      cicloInicio: tipo === "ESCALA" ? cicloInicio : null,
      cicloTamanho: tipo === "ESCALA" ? Number(cicloTamanho) : null,
      observacoes: observacoes || null,
      dias: montarDias(),
    };
  }

  // Mudar a âncora desloca todos os plantões futuros: conferir antes (RN-03).
  async function verPrevia() {
    setErro("");
    try {
      const r = await jornadaApi.previa(corpo(), 14);
      setPrevia(r.data || []);
    } catch (err) {
      setErro(errMsg(err) || t("modal.erros.previa"));
    }
  }

  async function salvar(e) {
    e.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      await jornadaApi.salvar(corpo());
      onSalvo();
    } catch (err) {
      setErro(errMsg(err) || t("modal.erros.salvar"));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8 overflow-y-auto" onClick={onFechar}>
      <div className="glass-panel rounded-3xl p-6 w-full max-w-2xl border border-outline-variant/20 shadow-xl my-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-headline text-lg font-bold text-on-surface">{t("modal.titulo")}</h2>
          <button onClick={onFechar} className="text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>
        <p className="text-sm text-on-surface-variant mb-5">
          {funcionario.nome} · {labelPerfil(funcionario.perfil)}
        </p>

        <form onSubmit={salvar} className="space-y-5" noValidate>
          {/* Situação funcional */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("modal.situacao")} <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.entries(SITUACOES).map(([v, c]) => (
                <button key={v} type="button" onClick={() => { setSituacao(v); setErro(""); }}
                  className={`py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer ${
                    situacao === v
                      ? "bg-primary text-on-primary border-primary"
                      : "border-outline-variant/30 text-on-surface-variant hover:bg-veu/5"
                  }`}>
                  {t(c.rotuloKey)}
                </button>
              ))}
            </div>
            {situacao !== "ATIVO" && (
              <p className="text-xs text-on-surface-variant flex items-start gap-1.5 ml-1">
                <Icone name="info" className="text-sm shrink-0 mt-0.5" />
                {t("modal.avisoSituacao")}
              </p>
            )}
          </div>

          {/* Tipo de jornada */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("modal.tipoJornada")} <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              {[
                { v: "SEMANAL_FIXA", l: t("modal.tipos.semanalFixa"), d: t("modal.tipos.semanalFixaDescricao") },
                { v: "ESCALA", l: t("modal.tipos.escala"), d: t("modal.tipos.escalaDescricao") },
              ].map((o) => (
                <button key={o.v} type="button" onClick={() => { setTipo(o.v); setErro(""); setPrevia(null); }}
                  className={`flex-1 text-left px-4 py-3 rounded-xl border transition-all cursor-pointer ${
                    tipo === o.v ? "bg-primary/10 border-primary/40" : "border-outline-variant/30 hover:bg-veu/5"
                  }`}>
                  <p className={`text-sm font-semibold ${tipo === o.v ? "text-primary" : "text-on-surface"}`}>{o.l}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{o.d}</p>
                </button>
              ))}
            </div>
          </div>

          {tipo === "SEMANAL_FIXA" ? (
            <div className="space-y-1.5">
              {semana.map((d, i) => (
                <div key={d.api} className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20">
                  <span className="text-sm text-on-surface w-20 shrink-0">{t(d.rotuloKey)}</span>
                  <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer">
                    <input type="checkbox" checked={d.folga} className="accent-primary w-4 h-4"
                      onChange={(e) => setSemana((p) => p.map((x, k) => k === i ? { ...x, folga: e.target.checked } : x))} />
                    {t("modal.folga")}
                  </label>
                  <input type="time" value={d.inicio} disabled={d.folga}
                    onChange={(e) => setSemana((p) => p.map((x, k) => k === i ? { ...x, inicio: e.target.value } : x))}
                    className="bg-surface-container-highest/40 border-none rounded-lg py-1.5 px-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-40" />
                  <span className="text-on-surface-variant text-xs">{t("modal.ate")}</span>
                  <input type="time" value={d.fim} disabled={d.folga}
                    onChange={(e) => setSemana((p) => p.map((x, k) => k === i ? { ...x, fim: e.target.value } : x))}
                    className="bg-surface-container-highest/40 border-none rounded-lg py-1.5 px-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-40" />
                  {!d.folga && d.fim <= d.inicio && (
                    <span className="text-[11px] text-secondary font-semibold">{t("modal.viraODia")}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {Object.keys(MODELOS_ESCALA).map((m) => (
                  <button key={m} type="button" onClick={() => aplicarModelo(m)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
                    {MODELO_ROTULO_KEY[m] ? t(MODELO_ROTULO_KEY[m]) : m}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Campo id="cicloInicio" label={t("modal.inicioCiclo")} type="date" value={cicloInicio}
                  onChange={(e) => { setCicloInicio(e.target.value); setPrevia(null); }} required />
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                    {t("modal.tamanhoCiclo")} <span className="text-red-500">*</span>
                  </label>
                  <input type="number" min={2} max={31} value={cicloTamanho}
                    onChange={(e) => redimensionarEscala(e.target.value)} className={INPUT} />
                </div>
              </div>

              <div className="space-y-1.5">
                {escala.map((d, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 py-2 rounded-xl bg-surface-container-highest/20">
                    <span className="text-sm text-on-surface w-16 shrink-0">{t("modal.dia", { n: i + 1 })}</span>
                    <label className="flex items-center gap-1.5 text-xs text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={d.folga} className="accent-primary w-4 h-4"
                        onChange={(e) => setEscala((p) => p.map((x, k) => k === i ? { ...x, folga: e.target.checked } : x))} />
                      {t("modal.folga")}
                    </label>
                    <input type="time" value={d.inicio} disabled={d.folga}
                      onChange={(e) => setEscala((p) => p.map((x, k) => k === i ? { ...x, inicio: e.target.value } : x))}
                      className="bg-surface-container-highest/40 border-none rounded-lg py-1.5 px-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-40" />
                    <span className="text-on-surface-variant text-xs">{t("modal.ate")}</span>
                    <input type="time" value={d.fim} disabled={d.folga}
                      onChange={(e) => setEscala((p) => p.map((x, k) => k === i ? { ...x, fim: e.target.value } : x))}
                      className="bg-surface-container-highest/40 border-none rounded-lg py-1.5 px-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none disabled:opacity-40" />
                    {!d.folga && d.fim <= d.inicio && (
                      <span className="text-[11px] text-secondary font-semibold">{t("modal.viraODia")}</span>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <button type="button" onClick={verPrevia}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer">
                  <Icone name="preview" className="text-base" />{t("modal.verPrevia")}
                </button>
                {previa && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {previa.length === 0 ? (
                      <p className="text-xs text-on-surface-variant">{t("quadro.semPlantoes")}</p>
                    ) : previa.map((p) => (
                      <span key={p.dia} className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
                        <span className="font-semibold">{fmtDia(p.dia)}</span> {hhmm(p.inicio)}–{hhmm(p.fim)}
                        {p.viraODia && " +1"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("modal.observacoes")} <span className="font-normal text-on-surface-variant/60">({t("comum:estado.opcional")})</span>
            </label>
            <textarea value={observacoes} onChange={(e) => setObservacoes(e.target.value)} rows={2}
              className={`${INPUT} resize-none`} />
          </div>

          {erro && (
            <div className="bg-error/10 border border-error/25 rounded-xl p-3 flex gap-2 text-sm text-error">
              <Icone name="error_outline" className="shrink-0" />
              <p className="whitespace-pre-line">{erro}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={onFechar}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
              {t("comum:acoes.cancelar")}
            </button>
            <Botao type="submit" disabled={salvando}>
              {salvando ? t("comum:acoes.salvando") : t("modal.salvar")}
            </Botao>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Aba: acompanhamento (RN-07) ──────────────────────────────────────────────

function fmtDataHora(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(idiomaAtual(), {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
  });
}

function duracao(desde) {
  const s = Math.floor((Date.now() - new Date(desde)) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function AbaAcompanhamento({ quadro }) {
  const { t } = useTranslation("funcionarios");
  const [dentro, setDentro] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(null);
  const [filtroFunc, setFiltroFunc] = useState("");

  const idsFuncionarios = useMemo(
    () => new Set(quadro.map((f) => String(f.id))),
    [quadro]
  );

  const carregar = useCallback(() => {
    return Promise.all([
      acessoApi.listarDentro(),
      acessoApi.listarHistoricoAcesso({}),
    ])
      .then(([dRes, hRes]) => {
        setDentro(dRes.data?.dentro || []);
        setHistorico(hRes.data?.registros || []);
        setErro(null);
      })
      .catch((err) => {
        setErro(errMsg(err) || t("acompanhamento.erroCarregar"));
      });
  }, [t]);

  useEffect(() => {
    carregar().finally(() => setCarregando(false));
  }, [carregar]);

  // Só a equipe: a tela do síndico não é o controle de acesso geral.
  const presentes = dentro.filter((r) => idsFuncionarios.has(String(r.usuarioId)));
  const registros = historico
    .filter((r) => idsFuncionarios.has(String(r.usuarioId)))
    .filter((r) => !filtroFunc || String(r.usuarioId) === filtroFunc);

  // Quem tem plantão hoje e não registrou entrada (RN-07, indicadores).
  const semEntradaHoje = useMemo(() => {
    const hoje = hojeISO();
    const entrouHoje = new Set(
      historico
        .filter((r) => String(r.entradaEm).slice(0, 10) === hoje)
        .map((r) => String(r.usuarioId))
    );
    return quadro.filter((f) =>
      f.jornada?.situacao === "ATIVO" && !entrouHoje.has(String(f.id))
    );
  }, [historico, quadro]);

  const porLiberacao = registros.filter((r) => r.liberacaoExcepcional);

  if (carregando) {
    return (
      <div className="glass-panel rounded-2xl py-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (erro) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center border border-error/20 space-y-2">
        <Icone name="error_outline" className="text-error text-4xl" />
        <p className="text-sm text-on-surface-variant">{erro}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Indicadores */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: t("acompanhamento.indicadores.noCondominio"), valor: presentes.length, cor: "text-primary" },
          { label: t("acompanhamento.indicadores.semEntradaHoje"), valor: semEntradaHoje.length, cor: "text-secondary" },
          { label: t("acompanhamento.indicadores.porLiberacao"), valor: porLiberacao.length, cor: "text-tertiary" },
        ].map((s) => (
          <div key={s.label} className="glass-panel rounded-2xl px-4 py-3">
            <p className={`text-2xl font-headline font-bold ${s.cor}`}>{s.valor}</p>
            <p className="text-on-surface-variant text-xs uppercase tracking-wider">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Presença atual */}
      <section className="space-y-3">
        <h2 className="font-headline font-bold text-on-surface text-base">{t("acompanhamento.presencaAtual")}</h2>
        {presentes.length === 0 ? (
          <div className="glass-panel rounded-2xl py-10 text-center text-on-surface-variant text-sm">
            {t("acompanhamento.semPresentes")}
          </div>
        ) : (
          <div className="space-y-2">
            {presentes.map((p) => (
              <div key={p.entradaId} className="glass-panel rounded-2xl p-4 flex flex-wrap items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icone name="badge" className="text-primary text-lg" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface truncate">{p.nome}</p>
                  <p className="text-xs text-on-surface-variant">
                    {p.perfil} · {t("acompanhamento.entradaHa", { entrada: fmtDataHora(p.entradaEm), duracao: duracao(p.entradaEm) })}
                    {p.turnoPrevisto ? ` · ${t("acompanhamento.turno", { turno: p.turnoPrevisto })}` : ""}
                  </p>
                </div>
                {p.liberacaoExcepcional && (
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-tertiary/15 text-tertiary shrink-0">
                    {t("acompanhamento.liberacaoExcepcional")}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Sem entrada em dia de turno */}
      {semEntradaHoje.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-headline font-bold text-on-surface text-base">
            {t("acompanhamento.semRegistroHoje")}
          </h2>
          <div className="glass-panel rounded-2xl p-4 flex flex-wrap gap-2">
            {semEntradaHoje.map((f) => (
              <span key={f.id} className="text-xs px-2.5 py-1 rounded-lg bg-secondary/10 text-secondary">
                {f.nome}
              </span>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant">
            {t("acompanhamento.semRegistroAviso")}
          </p>
        </section>
      )}

      {/* Histórico */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-headline font-bold text-on-surface text-base">{t("acompanhamento.historico")}</h2>
          <select value={filtroFunc} onChange={(e) => setFiltroFunc(e.target.value)}
            className={`${INPUT} max-w-xs`}>
            <option value="">{t("acompanhamento.todosFuncionarios")}</option>
            {quadro.map((f) => (
              <option key={f.id} value={String(f.id)}>{f.nome}</option>
            ))}
          </select>
        </div>

        {registros.length === 0 ? (
          <div className="glass-panel rounded-2xl py-10 text-center text-on-surface-variant text-sm">
            {t("acompanhamento.semRegistros")}
          </div>
        ) : (
          <div className="glass-panel rounded-2xl border border-outline-variant/15 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/15 bg-surface-variant/10">
                    {["funcionario", "entrada", "saida", "status", "turnoPrevisto", "observacao", "registradoPor"].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                        {t(`acompanhamento.colunas.${h}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => {
                    const dentroAgora = !r.saidaEm;
                    return (
                      <tr key={r.id} className={`border-b border-outline-variant/10 hover:bg-surface-variant/10 transition-colors ${dentroAgora ? "bg-primary/3" : ""}`}>
                        <td className="px-4 py-3 font-medium text-on-surface whitespace-nowrap">{r.nome}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtDataHora(r.entradaEm)}</td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                          {r.saidaEm ? fmtDataHora(r.saidaEm) : "—"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            dentroAgora ? "bg-primary/10 text-primary" : "bg-outline-variant/20 text-on-surface-variant"
                          }`}>
                            {dentroAgora ? t("acompanhamento.dentro") : t("acompanhamento.saiu")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                          {r.turnoPrevisto || "—"}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">
                          {r.liberacaoExcepcional ? (
                            <span className="text-tertiary font-semibold">
                              {t("acompanhamento.foraDoTurno")}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-on-surface-variant whitespace-nowrap">
                          {r.registradoPorNome || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

// ── Aba: liberações excepcionais ─────────────────────────────────────────────

const LIB_INICIAL = { authUserId: "", data: hojeISO(), horaInicio: "", horaFim: "", motivo: "", observacoes: "" };

const STATUS_LIB = {
  AGUARDANDO: { rotuloKey: "liberacoes.status.aguardando", cor: "bg-secondary/10 text-secondary" },
  UTILIZADA: { rotuloKey: "liberacoes.status.utilizada", cor: "bg-primary/10 text-primary" },
  EXPIRADA: { rotuloKey: "liberacoes.status.expirada", cor: "bg-outline-variant/20 text-on-surface-variant" },
  CANCELADA: { rotuloKey: "liberacoes.status.cancelada", cor: "bg-error/10 text-error" },
};

function AbaLiberacoes({ quadro }) {
  const { t } = useTranslation("funcionarios");
  const toast = useToast();
  const [lista, setLista] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [criando, setCriando] = useState(false);
  const [form, setForm] = useState(LIB_INICIAL);
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [acao, setAcao] = useState(null);

  const carregar = useCallback(async () => {
    try {
      const r = await jornadaApi.listarLiberacoes();
      setLista(Array.isArray(r.data) ? r.data : []);
    } catch {
      setLista([]);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Só quem tem jornada e está Ativo pode receber liberação (RN-05).
  const elegiveis = quadro.filter((f) => f.jornada?.situacao === "ATIVO");

  function set(campo, valor) {
    setForm((f) => ({ ...f, [campo]: valor }));
    setErro("");
  }

  async function criar(e) {
    e.preventDefault();
    setErro("");
    if (!form.authUserId) { setErro(t("liberacoes.erros.selecioneFuncionario")); return; }
    if (!form.horaInicio || !form.horaFim) { setErro(t("liberacoes.erros.informeJanela")); return; }
    if (!form.motivo.trim()) { setErro(t("liberacoes.erros.informeMotivo")); return; }

    setSalvando(true);
    try {
      await jornadaApi.criarLiberacao({
        authUserId: form.authUserId,
        data: form.data,
        horaInicio: form.horaInicio,
        horaFim: form.horaFim,
        motivo: form.motivo.trim(),
        observacoes: form.observacoes || null,
      });
      setForm(LIB_INICIAL);
      setCriando(false);
      toast.success(t("liberacoes.toast.criada"));
      await carregar();
    } catch (err) {
      setErro(errMsg(err) || t("liberacoes.erros.criar"));
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar(l) {
    if (!window.confirm(t("liberacoes.confirmarCancelar", { nome: l.funcionarioNome }))) return;
    setAcao(l.id);
    try {
      await jornadaApi.cancelarLiberacao(l.id);
      toast.success(t("liberacoes.toast.cancelada"));
      await carregar();
    } catch (err) {
      toast.error(errMsg(err) || t("liberacoes.erros.cancelar"));
    } finally {
      setAcao(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
        <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
        <span>
          {t("liberacoes.info")}
        </span>
      </div>

      {!criando && (
        <div className="flex justify-end">
          <Botao onClick={() => setCriando(true)}>
            <span className="flex items-center gap-2"><Icone name="add" className="text-lg" />{t("liberacoes.nova")}</span>
          </Botao>
        </div>
      )}

      {criando && (
        <form onSubmit={criar} className="glass-panel rounded-2xl p-5 space-y-4" noValidate>
          <h3 className="font-headline font-bold text-on-surface text-base">{t("liberacoes.novaTitulo")}</h3>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
              {t("liberacoes.campos.funcionario")} <span className="text-red-500">*</span>
            </label>
            <select value={form.authUserId} onChange={(e) => set("authUserId", e.target.value)} className={INPUT}>
              <option value="">
                {elegiveis.length === 0 ? t("liberacoes.semElegiveis") : t("liberacoes.selecione")}
              </option>
              {elegiveis.map((f) => (
                <option key={f.id} value={String(f.id)}>{f.nome} — {labelPerfil(f.perfil)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Campo id="data" label={t("liberacoes.campos.data")} type="date" value={form.data} min={hojeISO()}
              onChange={(e) => set("data", e.target.value)} required />
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {t("liberacoes.campos.das")} <span className="text-red-500">*</span>
              </label>
              <input type="time" value={form.horaInicio} onChange={(e) => set("horaInicio", e.target.value)} className={INPUT} />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1">
                {t("liberacoes.campos.ate")} <span className="text-red-500">*</span>
              </label>
              <input type="time" value={form.horaFim} onChange={(e) => set("horaFim", e.target.value)} className={INPUT} />
            </div>
          </div>

          <Campo id="motivo" label={t("liberacoes.campos.motivo")} value={form.motivo}
            onChange={(e) => set("motivo", e.target.value)}
            placeholder={t("liberacoes.campos.motivoPlaceholder")} required />

          {erro && (
            <div className="bg-error/10 border border-error/25 rounded-xl p-3 flex gap-2 text-sm text-error">
              <Icone name="error_outline" className="shrink-0" /><p>{erro}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
            <button type="button" onClick={() => { setCriando(false); setErro(""); setForm(LIB_INICIAL); }}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-on-surface-variant hover:bg-veu/5 transition-all cursor-pointer">
              {t("comum:acoes.cancelar")}
            </button>
            <Botao type="submit" disabled={salvando}>{salvando ? t("liberacoes.criando") : t("liberacoes.criar")}</Botao>
          </div>
        </form>
      )}

      {carregando ? (
        <div className="glass-panel rounded-2xl py-16 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : lista.length === 0 ? (
        <div className="glass-panel rounded-2xl py-14 flex flex-col items-center gap-3 text-center text-on-surface-variant px-4">
          <Icone name="lock_open" className="text-5xl opacity-30" />
          <p className="text-sm max-w-md">{t("liberacoes.vazio")}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((l) => {
            const cfg = STATUS_LIB[l.status] ?? STATUS_LIB.AGUARDANDO;
            return (
              <div key={l.id} className="glass-panel rounded-2xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="font-semibold text-on-surface truncate">{l.funcionarioNome}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {fmtDia(l.data)} · {hhmm(l.horaInicio)}–{hhmm(l.horaFim)}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{l.motivo}</p>
                    <p className="text-xs text-on-surface-variant/70 mt-0.5">
                      {t("liberacoes.autorizadaPor", { nome: l.autorizadoPorNome || "—" })}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${cfg.cor}`}>{t(cfg.rotuloKey)}</span>
                </div>
                {l.status === "AGUARDANDO" && (
                  <button type="button" onClick={() => cancelar(l)} disabled={acao === l.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error hover:bg-error/20 transition-all cursor-pointer disabled:opacity-50">
                    {acao === l.id ? t("liberacoes.cancelando") : t("comum:acoes.cancelar")}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
