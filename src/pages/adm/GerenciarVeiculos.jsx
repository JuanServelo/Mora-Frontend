import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { veiculoApi, moradorApi, vagaApi, funcionarioApi } from "../../services/portariaApi";
import { Icone } from "../../components/icones/Icone";
import { Campo } from "../../components/campos/Campo";
import { Botao } from "../../components/botoes/Botao";
import { useToast } from "../../contexts/ToastContext";
import { useConfirm } from "../../contexts/ConfirmContext";
import { useAuth } from "../../contexts/AuthContext";
import { PERFIS, podeAcessarAdmin } from "../../utils/perfis";
import { idiomaAtual } from "../../i18n";

// ─── Tipos de veículo (RN-02) ─────────────────────────────────────
const TIPOS_VEICULO = [
  { value: "MORADOR",    rotuloKey: "gerenciar.tipos.morador.rotulo",     icon: "person",         descKey: "gerenciar.tipos.morador.descricao" },
  { value: "VISITANTE",  rotuloKey: "gerenciar.tipos.visitante.rotulo",   icon: "person_add",     descKey: "gerenciar.tipos.visitante.descricao" },
  { value: "FUNCIONARIO", rotuloKey: "gerenciar.tipos.funcionario.rotulo", icon: "local_shipping", descKey: "gerenciar.tipos.funcionario.descricao" },
];

// ─── Estado visual da vaga ────────────────────────────────────────
const ESTADO_VAGA = {
  LIVRE:     { rotuloKey: "gerenciar.estadoVaga.livre",     cls: "text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400" },
  VINCULADA: { rotuloKey: "gerenciar.estadoVaga.vinculada", cls: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400" },
  OCUPADA:   { rotuloKey: "gerenciar.estadoVaga.ocupada",   cls: "text-error bg-error/10" },
};

function estadoDaVaga(vaga, veiculos) {
  const ocupada = veiculos.some((v) => v.status === "DENTRO" && v.vagaId === vaga.id);
  if (ocupada) return "OCUPADA";
  const vinculada = veiculos.some((v) => v.vagaId === vaga.id);
  return vinculada ? "VINCULADA" : "LIVRE";
}

const STATUS_STYLE = {
  DENTRO: "bg-primary/10 text-primary",
  SAIU:   "bg-outline-variant/20 text-on-surface-variant",
};

function labelTipo(tipo, t) {
  const rotuloKey = TIPOS_VEICULO.find((x) => x.value === tipo)?.rotuloKey;
  return rotuloKey ? t(rotuloKey) : tipo ?? "—";
}
function iconeTipo(tipo) {
  return TIPOS_VEICULO.find((t) => t.value === tipo)?.icon ?? "directions_car";
}

function normalizarPlaca(v) {
  return v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 7);
}
const PLACA_REGEX = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
function placaValida(p) { return PLACA_REGEX.test(p); }

// ─── Seletor estilizado ───────────────────────────────────────────
const selectCls =
  "w-full bg-surface-container-highest/40 border-none rounded-xl py-4 px-4 text-on-surface focus:ring-2 focus:ring-primary/50 focus:outline-none backdrop-blur-sm transition-all disabled:opacity-40";
const labelCls =
  "text-xs font-semibold uppercase tracking-wider text-on-surface-variant ml-1";

// ─── Formulário de cadastro / edição ─────────────────────────────
function FormVeiculo({ moradores, vagas, funcionarios, veiculos, inicial, onSalvar, onCancelar, salvando, podeEscolherTipo }) {
  const { t } = useTranslation("veiculos");
  const tipoInicial = inicial?.tipoProprietario ?? "MORADOR";

  const [form, setForm] = useState(
    inicial ?? {
      tipo: tipoInicial,
      placa: "",
      modelo: "",
      cor: "",
      obs: "",
      proprietarioId: "",
      vagaId: "",
    }
  );
  const [erros, setErros] = useState({});

  const tipo = form.tipo;
  const isMorador    = tipo === "MORADOR";
  const isVisitante  = tipo === "VISITANTE";
  const isServico    = tipo === "FUNCIONARIO";

  // Vagas com estado derivado
  const vagasComEstado = useMemo(
    () => vagas.map((v) => ({ ...v, estado: estadoDaVaga(v, veiculos) })),
    [vagas, veiculos]
  );

  function set(field, value) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Limpa campos que deixam de se aplicar ao trocar tipo
      if (field === "tipo") {
        next.proprietarioId = "";
        next.vagaId = "";
      }
      if (field === "proprietarioId") next.vagaId = "";
      return next;
    });
    setErros((e) => ({ ...e, [field]: undefined }));
  }

  function validar() {
    const e = {};
    if (!form.placa.trim()) {
      e.placa = t("gerenciar.form.erros.placaObrigatoria");
    } else if (!placaValida(form.placa)) {
      e.placa = t("gerenciar.form.erros.placaInvalida");
    }
    if (!form.proprietarioId) {
      if (isMorador)   e.proprietarioId = t("gerenciar.form.erros.moradorObrigatorio");
      if (isVisitante) e.proprietarioId = t("gerenciar.form.erros.anfitriaoObrigatorio");
      if (isServico)   e.proprietarioId = t("gerenciar.form.erros.funcionarioObrigatorio");
    }
    if (isMorador && !form.vagaId) {
      e.vagaId = t("gerenciar.form.erros.vagaObrigatoria");
    }
    setErros(e);
    if (Object.keys(e).length > 0) {
      // Foco no primeiro campo inválido
      const order = ["placa", "proprietarioId", "vagaId"];
      const primeiro = order.find((k) => e[k]);
      if (primeiro) setTimeout(() => document.getElementById(primeiro)?.focus(), 50);
    }
    return Object.keys(e).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!validar()) return;
    onSalvar({
      placa: form.placa,
      modelo: form.modelo || undefined,
      cor: form.cor || undefined,
      obs: form.obs || undefined,
      tipoProprietario: tipo,
      proprietarioId: form.proprietarioId || undefined,
      vagaId: isMorador ? (form.vagaId || undefined) : undefined,
    });
  }

  // Vagas filtradas por apartamento do morador selecionado
  const vagasFiltradas = useMemo(() => {
    if (!form.proprietarioId) return vagasComEstado;
    const mor = moradores.find((m) => m.id === form.proprietarioId);
    return mor ? vagasComEstado.filter((v) => v.apartamentoId === mor.apartamentoId) : vagasComEstado;
  }, [form.proprietarioId, vagasComEstado, moradores]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>

      {/* Tipo de veículo */}
      {podeEscolherTipo && (
        <div className="space-y-2">
          <label className={labelCls}>{t("gerenciar.form.tipoVeiculo")} <span className="text-error">*</span></label>
          <div className="flex gap-2 flex-wrap">
            {TIPOS_VEICULO.map((tp) => (
              <button
                key={tp.value}
                type="button"
                aria-pressed={tipo === tp.value}
                onClick={() => set("tipo", tp.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border cursor-pointer ${
                  tipo === tp.value
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-outline-variant/20 text-on-surface-variant hover:border-primary/20"
                }`}
              >
                <Icone name={tp.icon} className="text-base" />
                {t(tp.rotuloKey)}
              </button>
            ))}
          </div>
          <p className="text-xs text-on-surface-variant ml-1">
            {(() => {
              const descKey = TIPOS_VEICULO.find((tp) => tp.value === tipo)?.descKey;
              return descKey ? t(descKey) : null;
            })()}
          </p>
        </div>
      )}

      {/* Placa + Modelo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Campo
            id="placa"
            label={<>{t("gerenciar.form.placa")} <span className="text-error">*</span></>}
            placeholder="ABC1D23"
            icon="credit_card"
            value={form.placa}
            onChange={(e) => set("placa", normalizarPlaca(e.target.value))}
            maxLength={7}
            aria-required="true"
            className={erros.placa ? "ring-2 ring-error/60" : ""}
          />
          {erros.placa && <p role="alert" className="text-error text-xs mt-1 ml-1">{erros.placa}</p>}
        </div>
        <Campo
          id="modelo"
          label={t("gerenciar.form.modelo")}
          placeholder={t("gerenciar.form.modeloPlaceholder")}
          icon="directions_car"
          value={form.modelo}
          onChange={(e) => set("modelo", e.target.value)}
        />
      </div>

      {/* Cor + Obs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Campo
          id="cor"
          label={t("gerenciar.form.cor")}
          placeholder={t("gerenciar.form.corPlaceholder")}
          icon="palette"
          value={form.cor}
          onChange={(e) => set("cor", e.target.value)}
        />
        <Campo
          id="obs"
          label={t("gerenciar.form.observacoes")}
          placeholder={t("gerenciar.form.observacoesPlaceholder")}
          icon="notes"
          value={form.obs}
          onChange={(e) => set("obs", e.target.value)}
        />
      </div>

      {/* Campos por tipo */}
      {isMorador && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="proprietarioId" className={labelCls}>
              {t("gerenciar.form.morador")} <span className="text-error">*</span>
            </label>
            <select
              id="proprietarioId"
              value={form.proprietarioId}
              onChange={(e) => set("proprietarioId", e.target.value)}
              aria-required="true"
              className={`${selectCls} ${erros.proprietarioId ? "ring-2 ring-error/60" : ""}`}
            >
              <option value="">{t("gerenciar.form.selecione")}</option>
              {moradores.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}{m.apartamentoNumero ? ` · ${t("gerenciar.apto", { numero: m.apartamentoNumero })}` : ""}
                </option>
              ))}
            </select>
            {erros.proprietarioId && <p role="alert" className="text-error text-xs ml-1">{erros.proprietarioId}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="vagaId" className={labelCls}>
              {t("gerenciar.form.vaga")} <span className="text-error">*</span>
            </label>
            <select
              id="vagaId"
              value={form.vagaId}
              onChange={(e) => set("vagaId", e.target.value)}
              aria-required="true"
              className={`${selectCls} ${erros.vagaId ? "ring-2 ring-error/60" : ""}`}
            >
              <option value="">{t("gerenciar.form.selecione")}</option>
              {vagasFiltradas.map((v) => (
                <option key={v.id} value={v.id} disabled={v.estado === "OCUPADA"}>
                  {t("gerenciar.vagaNumero", { numero: v.numero })}
                  {v.localizacao ? ` · ${v.localizacao}` : ""}
                  {v.apartamentoNumero ? ` · ${t("gerenciar.apto", { numero: v.apartamentoNumero })}` : ""}
                  {" "}· {ESTADO_VAGA[v.estado] ? t(ESTADO_VAGA[v.estado].rotuloKey) : v.estado}
                </option>
              ))}
            </select>
            {erros.vagaId && <p role="alert" className="text-error text-xs ml-1">{erros.vagaId}</p>}
            {form.proprietarioId && vagasFiltradas.length === 0 && (
              <p className="text-xs text-on-surface-variant ml-1">
                {t("gerenciar.form.nenhumaVagaApto")}
              </p>
            )}
          </div>
        </div>
      )}

      {isVisitante && (
        <div className="space-y-2">
          <label htmlFor="proprietarioId" className={labelCls}>
            {t("gerenciar.form.moradorAnfitriao")} <span className="text-error">*</span>
          </label>
          <select
            id="proprietarioId"
            value={form.proprietarioId}
            onChange={(e) => set("proprietarioId", e.target.value)}
            aria-required="true"
            className={`${selectCls} ${erros.proprietarioId ? "ring-2 ring-error/60" : ""}`}
          >
            <option value="">{t("gerenciar.form.selecioneAnfitriao")}</option>
            {moradores.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nome}{m.apartamentoNumero ? ` · ${t("gerenciar.apto", { numero: m.apartamentoNumero })}` : ""}
              </option>
            ))}
          </select>
          {erros.proprietarioId && <p role="alert" className="text-error text-xs ml-1">{erros.proprietarioId}</p>}
          <p className="text-xs text-on-surface-variant ml-1">
            {t("gerenciar.form.vagaNaEntrada")}
          </p>
        </div>
      )}

      {isServico && (
        <div className="space-y-2">
          <label htmlFor="proprietarioId" className={labelCls}>
            {t("gerenciar.form.funcionario")} <span className="text-error">*</span>
          </label>
          <select
            id="proprietarioId"
            value={form.proprietarioId}
            onChange={(e) => set("proprietarioId", e.target.value)}
            aria-required="true"
            className={`${selectCls} ${erros.proprietarioId ? "ring-2 ring-error/60" : ""}`}
          >
            <option value="">{t("gerenciar.form.selecione")}</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}{f.cargo ? ` · ${f.cargo}` : ""}
              </option>
            ))}
          </select>
          {erros.proprietarioId && <p role="alert" className="text-error text-xs ml-1">{erros.proprietarioId}</p>}
          <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-surface-container-highest/30 text-on-surface-variant text-xs">
            <Icone name="info" className="text-primary text-base shrink-0 mt-0.5" />
            <span>{t("gerenciar.form.servicoInfo")}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Botao type="submit" disabled={salvando}>
          {salvando ? t("comum:acoes.salvando") : inicial ? t("gerenciar.form.salvarAlteracoes") : t("gerenciar.form.cadastrar")}
          <Icone name={inicial ? "check" : "add"} className="text-xl" />
        </Botao>
        <button
          type="button"
          onClick={onCancelar}
          className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
        >
          {t("comum:acoes.cancelar")}
        </button>
      </div>
    </form>
  );
}

// ─── Modal: vaga na entrada de Visitante ─────────────────────────
function ModalVagaEntrada({ veiculo, vagas, veiculos, onConfirmar, onFechar, salvando }) {
  const { t } = useTranslation("veiculos");
  const [vagaId, setVagaId] = useState("");

  const vagasComEstado = useMemo(
    () => vagas.map((v) => ({ ...v, estado: estadoDaVaga(v, veiculos) })),
    [vagas, veiculos]
  );
  const vagasLivres = vagasComEstado.filter((v) => v.estado !== "OCUPADA");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-headline text-lg font-bold text-on-surface min-w-0">
            {t("gerenciar.modalEntrada.titulo", { placa: veiculo.placa })}
          </h3>
          <button onClick={onFechar} className="shrink-0 text-on-surface-variant hover:text-on-surface cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>

        <p className="text-sm text-on-surface-variant">
          {t("gerenciar.modalEntrada.descricao")}
        </p>

        <div className="space-y-2">
          <label className={labelCls}>{t("gerenciar.form.vaga")} <span className="text-error">*</span></label>
          <select
            value={vagaId}
            onChange={(e) => setVagaId(e.target.value)}
            className={selectCls}
            aria-required="true"
          >
            <option value="">{t("gerenciar.modalEntrada.selecioneLivre")}</option>
            {vagasLivres.map((v) => (
              <option key={v.id} value={v.id}>
                {t("gerenciar.vagaNumero", { numero: v.numero })}
                {v.localizacao ? ` · ${v.localizacao}` : ""}
                {v.apartamentoNumero ? ` · ${t("gerenciar.apto", { numero: v.apartamentoNumero })}` : ""}
              </option>
            ))}
          </select>
          {vagasLivres.length === 0 && (
            <p className="text-xs text-error ml-1">{t("gerenciar.modalEntrada.semVagasLivres")}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Botao
            onClick={() => onConfirmar(vagaId)}
            disabled={!vagaId || salvando || vagasLivres.length === 0}
          >
            {salvando ? t("gerenciar.modalEntrada.registrando") : t("gerenciar.modalEntrada.registrarEntrada")}
            <Icone name="login" className="text-xl" />
          </Botao>
          <button
            onClick={onFechar}
            className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
          >
            {t("comum:acoes.cancelar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal de alterar vaga ────────────────────────────────────────
function ModalAlterarVaga({ veiculo, vagas, veiculos, moradores, onSalvar, onFechar, salvando }) {
  const { t } = useTranslation("veiculos");
  const [vagaId, setVagaId] = useState(veiculo.vagaId ?? "");

  const vagasComEstado = useMemo(
    () => vagas.map((v) => ({ ...v, estado: estadoDaVaga(v, veiculos) })),
    [vagas, veiculos]
  );

  const vagasFiltradas = useMemo(() => {
    if (veiculo.tipoProprietario === "MORADOR" && veiculo.proprietarioId) {
      const mor = moradores.find((m) => m.id === veiculo.proprietarioId);
      return mor ? vagasComEstado.filter((v) => v.apartamentoId === mor.apartamentoId) : vagasComEstado;
    }
    return vagasComEstado;
  }, [veiculo, vagasComEstado, moradores]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 w-full max-w-md space-y-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-headline text-lg font-bold text-on-surface min-w-0">
            {t("gerenciar.modalAlterarVaga.titulo", { placa: veiculo.placa })}
          </h3>
          <button onClick={onFechar} className="shrink-0 text-on-surface-variant hover:text-on-surface cursor-pointer">
            <Icone name="close" className="text-xl" />
          </button>
        </div>

        <div className="space-y-2">
          <label className={labelCls}>{t("gerenciar.modalAlterarVaga.novaVaga")}</label>
          <select value={vagaId} onChange={(e) => setVagaId(e.target.value)} className={selectCls}>
            {veiculo.tipoProprietario === "FUNCIONARIO" && <option value="">{t("gerenciar.modalAlterarVaga.semVaga")}</option>}
            {vagasFiltradas.map((v) => (
              <option key={v.id} value={v.id} disabled={v.estado === "OCUPADA" && v.id !== veiculo.vagaId}>
                {t("gerenciar.vagaNumero", { numero: v.numero })}
                {v.localizacao ? ` · ${v.localizacao}` : ""}
                {" "}· {ESTADO_VAGA[v.estado] ? t(ESTADO_VAGA[v.estado].rotuloKey) : v.estado}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <Botao onClick={() => onSalvar(vagaId)} disabled={salvando}>
            {salvando ? t("comum:acoes.salvando") : t("comum:acoes.confirmar")}
            <Icone name="check" className="text-xl" />
          </Botao>
          <button
            onClick={onFechar}
            className="flex-1 py-3 rounded-xl border border-outline-variant/30 text-on-surface-variant hover:text-on-surface transition-colors text-sm font-medium cursor-pointer"
          >
            {t("comum:acoes.cancelar")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Cartão de veículo ────────────────────────────────────────────
function CartaoVeiculo({ veiculo, vagas, veiculos, onEntrada, onSaida, onAlterarVaga, onEditar, podeEditar }) {
  const { t } = useTranslation("veiculos");
  const dentro = veiculo.status === "DENTRO";
  const isServico  = veiculo.tipoProprietario === "FUNCIONARIO";
  const isVisitante = veiculo.tipoProprietario === "VISITANTE";
  const semVaga = !veiculo.vagaId && !isServico && !isVisitante;

  return (
    <div className="glass-panel rounded-3xl overflow-hidden">
      <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icone name={iconeTipo(veiculo.tipoProprietario)} className="text-primary text-2xl" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-headline text-lg font-bold text-on-surface">{veiculo.placa}</p>
            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${STATUS_STYLE[veiculo.status]}`}>
              {dentro ? t("gerenciar.cartao.dentro") : t("gerenciar.cartao.fora")}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-surface-container-highest/50 text-on-surface-variant">
              {labelTipo(veiculo.tipoProprietario, t)}
            </span>
            {semVaga && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-error/10 text-error">
                {t("gerenciar.cartao.semVaga")}
              </span>
            )}
          </div>
          <p className="text-on-surface-variant text-sm">
            {[veiculo.modelo, veiculo.cor].filter(Boolean).join(" · ") || t("gerenciar.cartao.semInfo")}
          </p>
          {veiculo.vagaNumero && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              <Icone name="local_parking" className="text-sm mr-0.5" />
              {t("gerenciar.vagaNumero", { numero: veiculo.vagaNumero })}
              {veiculo.vagaLocalizacao ? ` · ${veiculo.vagaLocalizacao}` : ""}
              {veiculo.apartamentoNumero ? ` · ${t("gerenciar.apto", { numero: veiculo.apartamentoNumero })}` : ""}
              {(() => {
                const vg = vagas.find((v) => v.id === veiculo.vagaId);
                const est = vg ? estadoDaVaga(vg, veiculos) : null;
                return est ? (
                  <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold ${ESTADO_VAGA[est]?.cls}`}>
                    {ESTADO_VAGA[est] ? t(ESTADO_VAGA[est].rotuloKey) : null}
                  </span>
                ) : null;
              })()}
            </p>
          )}
          {isVisitante && !dentro && (
            <p className="text-xs text-on-surface-variant mt-0.5">{t("gerenciar.cartao.vagaAtribuidaEntrada")}</p>
          )}
          {dentro && veiculo.dataEntrada && (
            <p className="text-xs text-on-surface-variant mt-0.5">
              {t("gerenciar.cartao.entrou", { data: new Date(veiculo.dataEntrada).toLocaleString(idiomaAtual(), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) })}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2 shrink-0">
          {!dentro ? (
            <button
              onClick={() => onEntrada(veiculo)}
              disabled={semVaga}
              title={semVaga ? t("gerenciar.cartao.vincularVagaAntes") : undefined}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border transition-all ${
                semVaga
                  ? "border-outline-variant/20 text-outline-variant cursor-not-allowed opacity-50"
                  : "border-primary/30 text-primary hover:bg-primary/10 cursor-pointer"
              }`}
            >
              <Icone name="login" className="text-base" />
              {t("gerenciar.cartao.entrada")}
            </button>
          ) : (
            <button
              onClick={() => onSaida(veiculo)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-secondary/30 text-secondary hover:bg-secondary/10 transition-all cursor-pointer"
            >
              <Icone name="logout" className="text-base" />
              {t("gerenciar.cartao.saida")}
            </button>
          )}
          {!isVisitante && (
            <button
              onClick={() => onAlterarVaga(veiculo)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/30 transition-all cursor-pointer"
            >
              <Icone name="local_parking" className="text-base" />
              {t("gerenciar.cartao.vaga")}
            </button>
          )}
          {podeEditar && (
            <button
              onClick={() => onEditar(veiculo)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold border border-outline-variant/30 text-on-surface-variant hover:text-on-surface hover:border-primary/30 transition-all cursor-pointer"
            >
              <Icone name="edit" className="text-base" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Legenda de estado das vagas ──────────────────────────────────
function LegendaVagas() {
  const { t } = useTranslation("veiculos");
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {Object.entries(ESTADO_VAGA).map(([key, { rotuloKey, cls }]) => (
        <span key={key} className={`px-2.5 py-1 rounded-full font-semibold ${cls}`}>
          {t(rotuloKey)}
        </span>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────
export function GerenciarVeiculos() {
  const { t } = useTranslation("veiculos");
  const toast = useToast();
  const confirm = useConfirm();
  const { usuario } = useAuth();

  const isDoorman    = usuario?.perfil === PERFIS.PORTEIRO;
  const isAdminLevel = podeAcessarAdmin(usuario?.perfil);
  const filtrarPorUnidade = !isAdminLevel && !isDoorman && Boolean(usuario?.unidadeId);

  const [veiculos,     setVeiculos]     = useState([]);
  const [moradores,    setMoradores]    = useState([]);
  const [vagas,        setVagas]        = useState([]);
  const [funcionarios, setFuncionarios] = useState([]);
  const [carregando,   setCarregando]   = useState(true);
  const [criando,      setCriando]      = useState(false);
  const [editando,     setEditando]     = useState(null);
  const [alterandoVaga, setAlterandoVaga] = useState(null);
  const [entradaVisitante, setEntradaVisitante] = useState(null);
  const [salvando,     setSalvando]     = useState(false);
  const [busca,        setBusca]        = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroTipo,   setFiltroTipo]   = useState("TODOS");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [veicRes, morRes, vagRes, funcRes] = await Promise.all([
        veiculoApi.listar(),
        moradorApi.listarTodos(),
        vagaApi.listarTodas(),
        funcionarioApi.listarTodos(),
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

      setFuncionarios(funcRes.data || []);
    } catch {
      toast.error(t("gerenciar.toast.erroCarregar"));
    } finally {
      setCarregando(false);
    }
  }, [t]);

  useEffect(() => { carregar(); }, [carregar]);

  async function handleCadastrar(dados) {
    setSalvando(true);
    try {
      const res = await veiculoApi.cadastrar(dados);
      setVeiculos((prev) => [res.data, ...prev]);
      setCriando(false);
      toast.success(t("gerenciar.toast.cadastrado"));
    } catch (err) {
      const msg = err.response?.data?.erro ?? err.response?.data?.mensagem ?? err.response?.data?.message;
      toast.error(msg || t("gerenciar.toast.erroCadastrar"));
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
      toast.success(t("gerenciar.toast.atualizado"));
    } catch (err) {
      const msg = err.response?.data?.erro ?? err.response?.data?.mensagem ?? err.response?.data?.message;
      toast.error(msg || t("gerenciar.toast.erroAtualizar"));
    } finally {
      setSalvando(false);
    }
  }

  async function handleEntrada(veiculo) {
    // Visitante: escolhe vaga na entrada
    if (veiculo.tipoProprietario === "VISITANTE") {
      setEntradaVisitante(veiculo);
      return;
    }
    try {
      const res = await veiculoApi.registrarEntrada(veiculo.id);
      setVeiculos((prev) => prev.map((v) => (v.id === veiculo.id ? res.data : v)));
      toast.success(t("gerenciar.toast.entradaRegistrada", { placa: veiculo.placa }));
    } catch (err) {
      const msg = err.response?.data?.erro ?? err.response?.data?.mensagem ?? err.response?.data?.message;
      toast.error(msg || t("gerenciar.toast.erroEntrada"));
    }
  }

  async function handleEntradaVisitante(vagaId) {
    if (!entradaVisitante) return;
    setSalvando(true);
    try {
      const res = await veiculoApi.registrarEntrada(entradaVisitante.id, vagaId);
      setVeiculos((prev) => prev.map((v) => (v.id === entradaVisitante.id ? res.data : v)));
      setEntradaVisitante(null);
      toast.success(t("gerenciar.toast.entradaRegistrada", { placa: entradaVisitante.placa }));
    } catch (err) {
      const msg = err.response?.data?.erro ?? err.response?.data?.mensagem ?? err.response?.data?.message;
      toast.error(msg || t("gerenciar.toast.erroEntrada"));
    } finally {
      setSalvando(false);
    }
  }

  async function handleSaida(veiculo) {
    try {
      const res = await veiculoApi.registrarSaida(veiculo.id);
      setVeiculos((prev) => prev.map((v) => (v.id === veiculo.id ? res.data : v)));
      toast.success(t("gerenciar.toast.saidaRegistrada", { placa: veiculo.placa }));
    } catch (err) {
      const msg = err.response?.data?.erro ?? err.response?.data?.mensagem ?? err.response?.data?.message;
      toast.error(msg || t("gerenciar.toast.erroSaida"));
    }
  }

  async function handleAlterarVaga(vagaId) {
    setSalvando(true);
    try {
      const res = await veiculoApi.alterarVaga(alterandoVaga.id, vagaId || null);
      setVeiculos((prev) => prev.map((v) => (v.id === alterandoVaga.id ? res.data : v)));
      setAlterandoVaga(null);
      toast.success(t("gerenciar.toast.vagaAlterada"));
    } catch (err) {
      const msg = err.response?.data?.erro ?? err.response?.data?.mensagem ?? err.response?.data?.message;
      toast.error(msg || t("gerenciar.toast.erroAlterarVaga"));
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
      (v.cor ?? "").toLowerCase().includes(q) ||
      (v.vagaNumero ?? "").toLowerCase().includes(q);
    const matchStatus = filtroStatus === "TODOS" || v.status === filtroStatus;
    const matchTipo   = filtroTipo === "TODOS" || v.tipoProprietario === filtroTipo;
    return matchBusca && matchStatus && matchTipo;
  });

  const dentro  = veiculos.filter((v) => v.status === "DENTRO").length;
  const semVaga = veiculos.filter((v) => !v.vagaId && v.tipoProprietario === "MORADOR").length;

  return (
    <div className="min-h-screen w-full pt-4 pb-20 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-widest mb-1">
              {isDoorman ? t("gerenciar.pagina.sobretituloPortaria") : t("gerenciar.pagina.sobretituloAdmin")}
            </p>
            <h1 className="font-headline text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-on-surface">
              {t("gerenciar.pagina.titulo")}{" "}
              <span className="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">
                {t("gerenciar.pagina.tituloDestaque")}
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
              {criando ? t("comum:acoes.cancelar") : t("gerenciar.pagina.novoVeiculo")}
            </button>

            <div className="flex gap-3">
              {[
                { label: t("gerenciar.pagina.resumo.total"),   value: veiculos.length, color: "text-on-surface" },
                { label: t("gerenciar.pagina.resumo.dentro"),  value: dentro,          color: "text-primary" },
                { label: t("gerenciar.pagina.resumo.semVaga"), value: semVaga,         color: "text-error" },
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
              <h2 className="font-headline text-xl font-bold text-on-surface">{t("gerenciar.pagina.novoVeiculo")}</h2>
            </div>
            <FormVeiculo
              moradores={moradoresForm}
              vagas={vagasForm}
              funcionarios={funcionarios}
              veiculos={veiculos}
              onSalvar={handleCadastrar}
              onCancelar={() => setCriando(false)}
              salvando={salvando}
              podeEscolherTipo={isDoorman || isAdminLevel}
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
                {t("gerenciar.pagina.editarVeiculo", { placa: editando.placa })}
              </h2>
            </div>
            <FormVeiculo
              moradores={moradoresForm}
              vagas={vagasForm}
              funcionarios={funcionarios}
              veiculos={veiculos}
              inicial={{
                tipo: editando.tipoProprietario ?? "MORADOR",
                tipoProprietario: editando.tipoProprietario,
                placa: editando.placa,
                modelo: editando.modelo ?? "",
                cor: editando.cor ?? "",
                obs: editando.obs ?? "",
                proprietarioId: editando.proprietarioId ?? "",
                vagaId: editando.vagaId ?? "",
              }}
              onSalvar={handleAtualizar}
              onCancelar={() => setEditando(null)}
              salvando={salvando}
              podeEscolherTipo={false}
            />
          </div>
        )}

        {/* Filtros */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 max-w-sm">
            <Campo
              id="busca"
              placeholder={t("gerenciar.pagina.buscaPlaceholder")}
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
                  filtroStatus === s ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {s === "TODOS" ? t("comum:estado.todos") : s === "DENTRO" ? t("gerenciar.cartao.dentro") : t("gerenciar.pagina.filtroFora")}
              </button>
            ))}
          </div>

          <div className="glass-panel rounded-2xl p-1 flex gap-1 flex-wrap">
            {["TODOS", ...TIPOS_VEICULO.map((t) => t.value)].map((tp) => (
              <button
                key={tp}
                onClick={() => setFiltroTipo(tp)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filtroTipo === tp ? "bg-primary/15 text-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {tp === "TODOS" ? t("comum:estado.todos") : labelTipo(tp, t)}
              </button>
            ))}
          </div>
        </div>

        {/* Legenda */}
        <LegendaVagas />

        {/* Lista */}
        {carregando ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            {t("gerenciar.pagina.carregando")}
          </div>
        ) : filtrados.length === 0 ? (
          <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center text-on-surface-variant">
            {t("gerenciar.pagina.vazio")}
          </div>
        ) : (
          <div className="space-y-3">
            {filtrados.map((v) => (
              <CartaoVeiculo
                key={v.id}
                veiculo={v}
                vagas={vagas}
                veiculos={veiculos}
                onEntrada={handleEntrada}
                onSaida={handleSaida}
                onAlterarVaga={setAlterandoVaga}
                onEditar={setEditando}
                podeEditar={isDoorman || isAdminLevel}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal: vaga na entrada de visitante */}
      {entradaVisitante && (
        <ModalVagaEntrada
          veiculo={entradaVisitante}
          vagas={vagas}
          veiculos={veiculos}
          onConfirmar={handleEntradaVisitante}
          onFechar={() => setEntradaVisitante(null)}
          salvando={salvando}
        />
      )}

      {/* Modal: alterar vaga */}
      {alterandoVaga && (
        <ModalAlterarVaga
          veiculo={alterandoVaga}
          vagas={vagas}
          veiculos={veiculos}
          moradores={moradores}
          onSalvar={handleAlterarVaga}
          onFechar={() => setAlterandoVaga(null)}
          salvando={salvando}
        />
      )}
    </div>
  );
}
